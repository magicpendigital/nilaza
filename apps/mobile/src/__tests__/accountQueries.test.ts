import { createClient } from "@supabase/supabase-js";
import {
  getJournalEntries, getChatSessions, getChatMessages, getAllPersonaChatMessages,
  getAllOracleTurns, getTarotReadings, getAstrologyReports, getUsageEvents, getSafetyEvents,
  getDailyInsight, getProfileSnapshot, getAdminRole, generatePersonaReply, type BackendOptions, type PersonaReplyInput
} from "../backendClient";
import { AccountScope } from "../auth/accountScope";
import { createEmailAuthState } from "../auth/localAuth";
import type { LocalAuthState } from "../types";

const mockQueries: Array<{ table: string; filters: unknown[][]; selections: unknown[][]; token: () => Promise<string> }> = [];
const mockResults: Array<{ data: unknown; error: unknown } | Promise<{ data: unknown; error: unknown }>> = [];
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn((_url, _key, options) => ({
    from(table: string) {
      const entry = { table, filters: [] as unknown[][], selections: [] as unknown[][], token: options.accessToken };
      mockQueries.push(entry);
      const builder: any = {
        select: (...args: unknown[]) => { entry.selections.push(args); return builder; }, order: () => builder, limit: () => builder, maybeSingle: () => builder,
        abortSignal: () => builder,
        then: (resolve: (result: unknown) => void, reject: (error: unknown) => void) =>
          Promise.resolve(mockResults.shift() ?? { data: [], error: null }).then(resolve, reject)
      };
      for (const op of ["eq", "neq", "is", "in"]) builder[op] = (...args: unknown[]) => {
        entry.filters.push([op, ...args]); return builder;
      };
      return builder;
    }
  }))
}));

function auth(id: string, token: string): LocalAuthState {
  const base = createEmailAuthState(id, id + "@example.test");
  if (base.status !== "signed_in") throw Error();
  return { ...base, user: { ...base.user, id }, backendSession: { provider: "supabase", accessToken: token, refreshToken: "synthetic-refresh" } };
}
const options = (id = "A", token = "token-A"): BackendOptions => ({
  baseUrl: "https://qa.invalid/functions/v1", supabaseUrl: "https://qa.invalid",
  apiKey: "public-test-key", authToken: token, userId: id
});

beforeEach(() => { mockQueries.length = 0; mockResults.length = 0; jest.clearAllMocks(); });

it("A→B changes data token and explicitly scopes owner Journal, without a second auth store", async () => {
  await getJournalEntries(options());
  const tombstone = { id: "qa-remote", local_id: "qa-note", deleted_at: "2026-10-01T00:00:00Z" };
  mockResults.push({ data: [tombstone], error: null });
  expect(await getJournalEntries(options("B", "token-B"))).toEqual([tombstone]);
  expect(await mockQueries[0].token()).toBe("token-A");
  expect(await mockQueries[1].token()).toBe("token-B");
  expect(mockQueries[1].filters).toContainEqual(["eq", "user_id", "B"]);
  // The owner receives tombstone metadata so another device can remove its
  // cached entry. App/repository exclude its content from visible Journal.
  expect(mockQueries[1].filters).not.toContainEqual(["is", "deleted_at", null]);
  expect(createClient).toHaveBeenCalledTimes(2);
  expect((createClient as jest.Mock).mock.calls[1][2].auth).toEqual({
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false
  });
});

it("refreshes the token in old closures, and refuses a closed login scope", async () => {
  const scope = new AccountScope(auth("A", "old"));
  const input = { ...options(), session: scope };
  await getJournalEntries(input);
  scope.update(auth("A", "new"));
  await getJournalEntries(input);
  expect(await mockQueries[1].token()).toBe("new");
  scope.close();
  await expect(getJournalEntries(input)).rejects.toThrow();
  expect(mockQueries).toHaveLength(2);
});

it("missing identity never initializes a client, even when a URL/public key is set", async () => {
  await expect(getJournalEntries({ baseUrl: "https://qa.invalid", apiKey: "public" })).rejects.toThrow();
  await expect(getJournalEntries({ ...options(), userId: undefined })).rejects.toThrow();
  expect(createClient).not.toHaveBeenCalled();
});

it("all personal queries retain the owner predicate, including parent and child chat reads", async () => {
  for (const getter of [getChatSessions, getTarotReadings, getAstrologyReports, getUsageEvents, getSafetyEvents, getProfileSnapshot]) await getter(options("owner"));
  await getDailyInsight("2026-09-02", options("owner"));
  mockResults.push({ data: { id: "own-session" }, error: null });
  await getChatMessages("own-session", options("owner"));
  for (const getter of [getAllPersonaChatMessages, getAllOracleTurns]) {
    mockResults.push({ data: [{ id: "own-session" }], error: null });
    await getter(options("owner"));
  }
  for (const query of mockQueries) expect(query.filters).toContainEqual(["eq", "user_id", "owner"]);
  for (const query of mockQueries.filter(q => q.table === "chat_sessions")) {
    expect(query.filters).toContainEqual(["neq", "status", "deleted"]);
  }
  for (const query of mockQueries.filter(q => q.table === "chat_messages")) {
    expect(query.selections).toContainEqual(["*"]);
    expect(query.selections.flat()).not.toContain("*, personas(slug)");
  }
});

it("does not read messages for a missing/foreign/deleted parent session", async () => {
  mockResults.push({ data: null, error: null });
  expect(await getChatMessages("foreign", options("owner"))).toEqual([]);
  expect(mockQueries.map(q => q.table)).toEqual(["chat_sessions"]);
});

it("DB errors are failures, not empty history; a late response after logout is rejected", async () => {
  mockResults.push({ data: null, error: { message: "denied" } });
  await expect(getJournalEntries(options())).rejects.toThrow("Personal data unavailable");
  const scope = new AccountScope(auth("A", "old"));
  let resolve!: (data: { data: unknown; error: unknown }) => void;
  mockResults.push(new Promise(done => { resolve = done; }));
  const request = getJournalEntries({ ...options(), session: scope });
  await Promise.resolve();
  scope.close();
  resolve({ data: [{ id: "A-private" }], error: null });
  await expect(request).rejects.toThrow("Account session ended");
});

it("supports multiple active roles and never asks for revoked/other-account roles", async () => {
  mockResults.push({ data: [{ role: "editor" }, { role: "owner" }], error: null });
  expect(await getAdminRole("A", options())).toBe("owner");
  expect(mockQueries[0].filters).toContainEqual(["eq", "status", "active"]);
  await expect(getAdminRole("B", options())).rejects.toThrow("Account mismatch");
});

it("late delayed generation and signed-out/local preview never send to the backend", async () => {
  const scope = new AccountScope(auth("A", "old"));
  scope.close();
  global.fetch = jest.fn();
  const fallback = () => ({ text: "Local", moderationStatus: "fallback" as const });
  await generatePersonaReply({} as PersonaReplyInput, fallback, { ...options(), session: scope });
  await generatePersonaReply({} as PersonaReplyInput, fallback, { ...options(), session: new AccountScope(createEmailAuthState("A", "a@example.test")) });
  expect(global.fetch).not.toHaveBeenCalled();
});
