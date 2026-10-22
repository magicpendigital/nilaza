import { resendSupabaseSignupConfirmation, signInWithSupabaseEmail, signOutSupabase, signUpWithSupabaseEmail, resetSupabasePasswordForEmail } from "../supabaseAuth";
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const mockLoginResults: Array<Promise<unknown>> = [];
const mockAdopt = jest.fn(async ({ access_token, refresh_token }) => ({
  data: { session: session(access_token, refresh_token) }, error: null
}));
const mockLogout = jest.fn(async () => ({ error: null }));
const mockResend = jest.fn(async () => ({ error: null }));
const mockSignup = jest.fn(async (_input: unknown): Promise<any> => ({ data: { user: { identities: [{}] }, session: null }, error: null }));
const mockReset = jest.fn(async (_email: string, _options: unknown) => ({ error: null }));
jest.mock("../../runtimeConfig", () => ({
  isSupabaseAuthConfigured: true, supabaseUrl: "https://qa.invalid", supabaseAnonKey: "public-test"
}));
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn((_url, _key, options) => ({
    auth: options.auth.persistSession ? {
      setSession: (...args: unknown[]) => mockAdopt(...args as [any]),
      signOut: () => mockLogout()
    } : {
      signInWithPassword: () => mockLoginResults.shift(),
      resend: (...args: unknown[]) => mockResend(...args as [any]),
      signUp: (input: unknown) => mockSignup(input),
      resetPasswordForEmail: (email: string, options: unknown) => mockReset(email, options)
    }
  }))
}));

function session(token: string, refresh = "refresh") {
  return { access_token: token, refresh_token: refresh, user: { id: token, email: token + "@example.test" } };
}
const loginResult = (token: string) => ({ data: { session: session(token) }, error: null });

let mockTime = Date.now();
beforeEach(() => { jest.useFakeTimers(); mockTime += 120000; jest.setSystemTime(mockTime); mockLoginResults.length = 0; jest.clearAllMocks(); });
afterEach(() => { jest.useRealTimers(); });

it("a timed-out A login can never adopt into the real store after B logs in and out", async () => {
  let releaseA!: (value: unknown) => void;
  mockLoginResults.push(new Promise(resolve => { releaseA = resolve; }));
  const a = signInWithSupabaseEmail("a@example.test", "synthetic-password");
  const rejected = expect(a).rejects.toThrow("timed out");
  await jest.advanceTimersByTimeAsync(12001);
  await rejected;
  mockLoginResults.push(Promise.resolve(loginResult("B")));
  expect((await signInWithSupabaseEmail("b@example.test", "synthetic-password"))?.authState).toMatchObject({ user: { id: "B" } });
  await signOutSupabase();
  releaseA(loginResult("A"));
  await Promise.resolve();
  await Promise.resolve();
  expect(mockAdopt).toHaveBeenCalledTimes(1);
  expect(mockAdopt).toHaveBeenCalledWith({ access_token: "B", refresh_token: "refresh" });
  expect(mockLogout).toHaveBeenCalledTimes(1);
});

it("a superseded successful login is also refused before adopting its session", async () => {
  let releaseA!: (value: unknown) => void;
  mockLoginResults.push(new Promise(resolve => { releaseA = resolve; }));
  const a = signInWithSupabaseEmail("a@example.test", "synthetic-password");
  const rejected = expect(a).rejects.toThrow("expired");
  mockLoginResults.push(Promise.resolve(loginResult("B")));
  await signInWithSupabaseEmail("b@example.test", "synthetic-password");
  releaseA(loginResult("A"));
  await rejected;
  expect(mockAdopt).toHaveBeenCalledTimes(1);
});

it("resends a signup confirmation email through the isolated auth client", async () => {
  await expect(resendSupabaseSignupConfirmation("luna@example.test")).resolves.toBe(true);
  expect(mockResend).toHaveBeenCalledWith({ type: "signup", email: "luna@example.test", options: { emailRedirectTo: "nilaza://auth/confirm" } });
});

it("signup uses the same confirmation callback without adopting a pending session", async () => {
  await expect(signUpWithSupabaseEmail(" Luna ", "luna@example.test", "synthetic-password")).resolves.toEqual({ pendingEmailConfirmation: true });
  expect(mockSignup).toHaveBeenCalledWith({ email: "luna@example.test", password: "synthetic-password", options: { emailRedirectTo: "nilaza://auth/confirm", data: { name: "Luna" } } });
  expect(mockAdopt).not.toHaveBeenCalled();
});

it("duplicate signup preserves the generic pending outcome", async () => {
  mockSignup.mockResolvedValueOnce({ data: { user: { identities: [] }, session: null }, error: null });
  await expect(signUpWithSupabaseEmail("Luna", "luna@example.test", "synthetic-password")).resolves.toEqual({ pendingEmailConfirmation: true });
  expect(mockAdopt).not.toHaveBeenCalled();
});

it("limits rapid resend attempts even across recipients and provider failures", async () => {
  mockResend.mockRejectedValueOnce(new Error("provider unavailable"));
  await expect(resendSupabaseSignupConfirmation("luna@example.test")).rejects.toThrow("provider unavailable");
  await expect(resendSupabaseSignupConfirmation("other@example.test")).rejects.toThrow("one minute");
  expect(mockResend).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(60000);
  await expect(resendSupabaseSignupConfirmation("luna@example.test")).resolves.toBe(true);
});

it("keeps reset on the dedicated recovery callback and limits repeated requests", async () => {
  await expect(resetSupabasePasswordForEmail("luna@example.test")).resolves.toBe(true);
  expect(mockReset).toHaveBeenCalledWith("luna@example.test", { redirectTo: "nilaza://auth/recovery" });
  await expect(resetSupabasePasswordForEmail("other@example.test")).rejects.toThrow("one minute");
  expect(mockReset).toHaveBeenCalledTimes(1);
});
