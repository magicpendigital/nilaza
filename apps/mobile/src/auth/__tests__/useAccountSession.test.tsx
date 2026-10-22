import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAccountSession, restoreLocalSession } from "../useAccountSession";
import { createEmailAuthState, AUTH_STORAGE_KEY, LEGACY_AUTH_STORAGE_KEY, signedOutAuthState } from "../localAuth";
import type { LocalAuthState } from "../../types";

let mockConfigured = false;
let mockListener: (state: LocalAuthState, event: string) => void;
const mockRestore = jest.fn();
const mockSignOut = jest.fn();
jest.mock("../../runtimeConfig", () => ({ get isSupabaseAuthConfigured() { return mockConfigured; } }));
jest.mock("../supabaseAuth", () => ({
  getSupabaseSessionAuthState: () => mockRestore(),
  signOutSupabase: () => mockSignOut(),
  subscribeSupabaseAuth: (listener: typeof mockListener) => { mockListener = listener; return jest.fn(); }
}));
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

function backendAuth(id: string, token: string): LocalAuthState {
  const base = createEmailAuthState(id, id + "@example.test");
  if (base.status !== "signed_in") throw Error();
  return { ...base, user: { ...base.user, id }, backendSession: { provider: "supabase", accessToken: token, refreshToken: "synthetic-refresh" } };
}

beforeEach(async () => {
  mockConfigured = false;
  jest.clearAllMocks();
  mockRestore.mockResolvedValue(null);
  mockSignOut.mockResolvedValue(undefined);
  await AsyncStorage.clear();
});

it("migrates v1 identity once but never infers ownership from an old profile", async () => {
  const legacy = { ...createEmailAuthState("A", "a@example.test"), version: 1 };
  await AsyncStorage.setItem(LEGACY_AUTH_STORAGE_KEY, JSON.stringify(legacy));
  const { result } = renderHook(useAccountSession);
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.authState).toMatchObject({ version: 2, status: "signed_in" });
  await waitFor(() => expect(AsyncStorage.removeItem).toHaveBeenCalledWith(LEGACY_AUTH_STORAGE_KEY));
  expect(restoreLocalSession(null)).toEqual(signedOutAuthState);
  expect(restoreLocalSession(backendAuth("A", "duplicate-token"))).toEqual(signedOutAuthState);
});

it("changes the scope key only for identity, preserving refresh/rotation state and closing A before B renders", async () => {
  mockConfigured = true;
  mockRestore.mockResolvedValue(backendAuth("A", "old"));
  const { result, rerender } = renderHook(useAccountSession);
  await waitFor(() => expect(result.current.ready).toBe(true));
  const a = result.current.scope;
  act(() => mockListener(backendAuth("A", "new"), "TOKEN_REFRESHED"));
  expect(result.current.scope).toBe(a);
  expect(a.accessToken).toBe("new");
  rerender({});
  expect(result.current.scope.key).toBe(a.key);
  act(() => mockListener(backendAuth("B", "token-B"), "SIGNED_IN"));
  expect(a.active).toBe(false);
  expect(a.controller.signal.aborted).toBe(true);
  expect(result.current.scope.userId).toBe("B");
  expect(result.current.scope.key).not.toBe(a.key);
});

it("does not resurrect a cached JWT when the SDK session is missing", async () => {
  mockConfigured = true;
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(backendAuth("A", "stale")));
  const { result } = renderHook(useAccountSession);
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.authState.status).toBe("signed_out");
  expect(result.current.scope.accessToken).toBeUndefined();
  await waitFor(() => expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY));
});

it("invalidates requests immediately during signout and retries signout rather than restoring A on failure", async () => {
  mockConfigured = true;
  mockRestore.mockResolvedValue(backendAuth("A", "token"));
  const { result } = renderHook(useAccountSession);
  await waitFor(() => expect(result.current.ready).toBe(true));
  const a = result.current.scope;
  mockSignOut.mockRejectedValueOnce(new Error("network"));
  await act(async () => { await result.current.signOut(); });
  expect(a.active).toBe(false);
  expect(result.current.ready).toBe(false);
  expect(result.current.error).toBe(true);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.authState.status).toBe("signed_out");
  expect(mockRestore).toHaveBeenCalledTimes(1);
  expect(mockSignOut).toHaveBeenCalledTimes(2);
});

it("a late bootstrap cannot overwrite a newer auth event", async () => {
  mockConfigured = true;
  let finish!: (auth: LocalAuthState) => void;
  mockRestore.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(useAccountSession);
  act(() => mockListener(backendAuth("B", "token-B"), "SIGNED_IN"));
  await act(async () => finish(backendAuth("A", "stale")));
  expect(result.current.scope.userId).toBe("B");
});

it.each(["SIGNED_IN", "TOKEN_REFRESHED", "SIGNED_OUT"])(
  "clears a bootstrap failure when a later %s event establishes the session",
  async event => {
    mockConfigured = true;
    mockRestore.mockRejectedValueOnce(new Error("synthetic bootstrap timeout"));
    const { result } = renderHook(useAccountSession);
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.ready).toBe(false);
    const next = event === "SIGNED_OUT" ? signedOutAuthState : backendAuth("A", "refreshed");
    act(() => mockListener(next, event));
    expect(result.current.ready).toBe(true);
    expect(result.current.error).toBe(false);
    expect(result.current.authState).toEqual(next);
  }
);

it("does not clear a storage failure merely because another valid auth event arrives", async () => {
  mockConfigured = true;
  mockRestore.mockResolvedValue(backendAuth("A", "old"));
  (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error("synthetic disk failure"));
  const { result } = renderHook(useAccountSession);
  await waitFor(() => expect(result.current.error).toBe(true));
  act(() => mockListener(backendAuth("A", "refreshed"), "TOKEN_REFRESHED"));
  expect(result.current.error).toBe(true);
  await act(async () => { await Promise.resolve(); });
  expect(result.current.error).toBe(true);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.error).toBe(false));
});

it("does not report successful local logout until the signed-out marker is durable", async () => {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(createEmailAuthState("A", "a@example.test")));
  const { result, unmount } = renderHook(useAccountSession);
  await waitFor(() => expect(result.current.ready).toBe(true));
  await waitFor(() => expect(AsyncStorage.removeItem).toHaveBeenCalledWith(LEGACY_AUTH_STORAGE_KEY));
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  await act(async () => { await result.current.signOut(); });
  expect(result.current.ready).toBe(false);
  expect(result.current.error).toBe(true);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(JSON.parse((await AsyncStorage.getItem(AUTH_STORAGE_KEY))!)).toEqual(signedOutAuthState);
  unmount();
  const reloaded = renderHook(useAccountSession);
  await waitFor(() => expect(reloaded.result.current.ready).toBe(true));
  expect(reloaded.result.current.authState.status).toBe("signed_out");
});
