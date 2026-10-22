import AsyncStorage from "@react-native-async-storage/async-storage";
import { AccountScope } from "../accountScope";
import { createAccountStorage } from "../accountStorage";
import { createEmailAuthState, signedOutAuthState } from "../localAuth";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const scopeFor = (name: string) => new AccountScope(createEmailAuthState(name, name + "@example.test"));

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it("completion writes reject disk failure without silently queueing a completed profile", async () => {
  const storage = createAccountStorage(scopeFor("onboarding"));
  storage.markHydrated();
  await storage.saveJson("nilaza.profile", { onboarded: false });
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  await expect(storage.saveJsonOrThrow("nilaza.profile", { onboarded: true })).rejects.toThrow("disk full");
  await storage.retryFailed();
  expect(await storage.loadJson("nilaza.profile", null)).toEqual({ onboarded: false });
  await storage.saveJsonOrThrow("nilaza.profile", { onboarded: true });
  expect(await storage.loadJson("nilaza.profile", null)).toEqual({ onboarded: true });
});

it("keeps Journal, birth, consent, artifacts and Council under the exact account namespace", async () => {
  const a = createAccountStorage(scopeFor("A"));
  const b = createAccountStorage(scopeFor("B"));
  a.markHydrated(); b.markHydrated();
  for (const key of ["nilaza.journal", "nilaza.birthProfile", "nilaza.oracleMemoryConsent", "nilaza.generatedArtifacts", "nilaza.aiCouncilSessions.v2"]) {
    await a.saveJson(key, ["A-private"]);
    expect(await b.loadJson(key, [])).toEqual([]);
    const reloadedA = createAccountStorage(scopeFor("A"));
    expect(await reloadedA.loadJson(key, [])).toEqual(["A-private"]);
  }
});

it("does not read ambiguous legacy globals or write before hydration/signed in", async () => {
  await AsyncStorage.setItem("nilaza.journal", JSON.stringify(["legacy-private"]));
  const storage = createAccountStorage(scopeFor("B"));
  await storage.saveJson("nilaza.journal", []);
  expect(await storage.loadJson("nilaza.journal", [])).toEqual([]);
  expect(await AsyncStorage.getItem("nilaza.journal")).toBe(JSON.stringify(["legacy-private"]));
  const out = createAccountStorage(new AccountScope(signedOutAuthState));
  out.markHydrated();
  await out.saveJson("nilaza.journal", ["private"]);
  expect(out.keyFor("nilaza.journal")).toBeNull();
});

it("reports read failure instead of allowing an empty cache overwrite", async () => {
  const storage = createAccountStorage(scopeFor("A"));
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("offline disk"));
  await expect(storage.loadJson("nilaza.journal", [])).rejects.toThrow();
  await storage.saveJson("nilaza.journal", []);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it("clearing a dotted local account id cannot erase a second id sharing its prefix", async () => {
  const a = createAccountStorage(new AccountScope(createEmailAuthState("A", "a@example.com")));
  const b = createAccountStorage(new AccountScope(createEmailAuthState("B", "a@example.com.test")));
  a.markHydrated(); b.markHydrated();
  await a.saveJson("nilaza.journal", ["A"]);
  await b.saveJson("nilaza.journal", ["B"]);
  await a.clear();
  expect(await b.loadJson("nilaza.journal", [])).toEqual(["B"]);
});

it("queues accepted writes before delete and rejects late writes from a closed scope", async () => {
  const scope = scopeFor("A"), a = createAccountStorage(scope), b = createAccountStorage(scopeFor("B"));
  a.markHydrated(); b.markHydrated();
  await b.saveJson("nilaza.journal", ["B"]);
  const writing = a.saveJson("nilaza.journal", ["A"]);
  scope.close();
  await a.clear();
  await writing;
  await a.saveJson("nilaza.journal", ["late A"]);
  expect(await createAccountStorage(scopeFor("A")).loadJson("nilaza.journal", [])).toEqual([]);
  expect(await b.loadJson("nilaza.journal", [])).toEqual(["B"]);
});

it("keeps failed saves retryable without a new edit", async () => {
  const error = jest.fn(), storage = createAccountStorage(scopeFor("A"), error);
  storage.markHydrated();
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  await storage.saveJson("nilaza.journal", ["draft"]);
  expect(error).toHaveBeenCalled();
  expect(await storage.retryFailed()).toBe(true);
  expect(await storage.loadJson("nilaza.journal", [])).toEqual(["draft"]);
});

it("a retry cannot recreate deleted cache or overwrite a newer queued edit", async () => {
  const scope = scopeFor("A"), storage = createAccountStorage(scope);
  storage.markHydrated();
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error()).mockRejectedValueOnce(new Error());
  await storage.saveJson("nilaza.profile", "old profile");
  await storage.saveJson("nilaza.journal", "old journal");
  let release!: () => void;
  (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
  const retry = storage.retryFailed();
  await Promise.resolve();
  await Promise.resolve();
  scope.close();
  const clear = storage.clear();
  release();
  await Promise.all([retry, clear]);
  expect(await createAccountStorage(scopeFor("A")).loadJson("nilaza.journal", null)).toBeNull();
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});
