import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import configData from "../../../../../../packages/agent-config/ai-council.json";
import councilContractData from "../../../../../../packages/agent-config/council-contract.json";
import figureData from "../../../../../../packages/content/data/personas-figures.json";
import archetypeData from "../../../../../../packages/content/data/personas-archetypes.json";
import { createAccountStorage } from "../../../auth/accountStorage";
import { AccountScope } from "../../../auth/accountScope";
import { createEmailAuthState } from "../../../auth/localAuth";
import { generateAiCouncilTurn, getChatSessions } from "../../../backendClient";
import type { AiCouncilConfig, Persona, Profile } from "../../../types";
import { useAiCouncilRoom } from "../useAiCouncilRoom";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("../../../backendClient", () => ({
  BackendLimitError: class BackendLimitError extends Error {},
  generateAiCouncilTurn: jest.fn((_input, fallback) => Promise.resolve(fallback())),
  getChatSessions: jest.fn(() => Promise.resolve([])),
  getChatMessages: jest.fn(() => Promise.resolve([]))
}));

const config = { ...configData, contract: councilContractData } as AiCouncilConfig;
const personas = [...figureData, ...archetypeData] as Persona[];
const personasById = Object.fromEntries(personas.map(persona => [persona.id, persona]));
const profile: Profile = {
  onboarded: true, nickname: "QA", language: "vi", goals: ["self"], tone: "gentle",
  currentStreak: 0, lastActivityDate: ""
};
function options(id = "A", accountReady = true, backendAvailable = false) {
  const scope = new AccountScope(createEmailAuthState(id, `${id}@example.test`));
  const storage = createAccountStorage(scope);
  storage.markHydrated();
  return {
    backendAvailable, accountReady, storage, backendOptions: { session: scope },
    config, personas, personasById, profile, language: "vi" as const,
    getPersonaThumbnail: () => ({ uri: "qa-image" }),
    onFeedback: jest.fn(), onSave: jest.fn(), onTrack: jest.fn()
  };
}
const key = "nilaza.aiCouncilSessions.v2";
beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it("persists full local turns across reload without exposing them to B", async () => {
  const a = options();
  const hook = renderHook(() => useAiCouncilRoom(a));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(a.storage.keyFor(key), "[]"));
  act(() => hook.result.current.roomProps.onQuestionChange("Một bước nhỏ cho hôm nay?"));
  await act(async () => { await hook.result.current.roomProps.onSend(); });
  await waitFor(() => expect(hook.result.current.roomProps.thread.length).toBeGreaterThan(1));
  const turns = hook.result.current.roomProps.thread;
  await waitFor(async () => {
    const saved = await a.storage.loadJson<Array<{ turns: unknown[] }>>(key, []);
    expect(saved[0].turns).toHaveLength(turns.length);
  });
  hook.unmount();
  a.backendOptions.session.close();
  const reloadedOptions = options();
  const reloaded = renderHook(() => useAiCouncilRoom(reloadedOptions));
  await waitFor(() => expect(reloaded.result.current.roomProps.thread).toEqual(turns));
  reloaded.unmount();
  const bOptions = options("B");
  const b = renderHook(() => useAiCouncilRoom(bOptions));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(bOptions.storage.keyFor(key), "[]"));
  expect(b.result.current.roomProps.thread).toEqual([]);
  b.unmount();
});

it("keeps structured synthesis visible when an older backend omits the optional field", async () => {
  const input = options("A", true, true);
  (generateAiCouncilTurn as jest.Mock).mockResolvedValueOnce({
    turns: [{ personaId: personas[0].id, text: "A grounded reply", kind: "opening", sequence: 1 }],
    promptVersionId: config.contract.promptVersionId,
    councilTemplateId: config.defaultTemplateId
  });
  const hook = renderHook(() => useAiCouncilRoom(input));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  act(() => hook.result.current.roomProps.onQuestionChange("Một bước nhỏ cho hôm nay?"));
  await act(async () => { await hook.result.current.roomProps.onSend(); });
  await waitFor(() => expect(hook.result.current.roomProps.synthesis).toMatchObject({
    consensus: expect.any(String),
    tensions: expect.any(Array),
    assumptions: expect.any(Array),
    nextStep: expect.any(String),
    reflectionQuestion: expect.any(String)
  }));
  hook.unmount();
});

it("a crisis message gets the safety reply and 115 card instead of council turns", async () => {
  const input = options();
  const hook = renderHook(() => useAiCouncilRoom(input));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  act(() => hook.result.current.roomProps.onQuestionChange("Mình muốn chết"));
  await act(async () => { await hook.result.current.roomProps.onSend(); });
  await waitFor(() => expect(hook.result.current.roomProps.safetyNotice).toMatchObject({ crisis: true, text: expect.stringContaining("115") }));
  expect(hook.result.current.roomProps.thread.filter(turn => turn.role === "guide")).toHaveLength(0);
  hook.unmount();
});

it("unknown server ids keep each seat's guide and canned turns are marked as fallback", async () => {
  const input = options("A", true, true);
  (generateAiCouncilTurn as jest.Mock).mockResolvedValueOnce({
    turns: [0, 1, 2].map((index) => ({ personaId: `db-uuid-${index}`, text: `Lượt ${index}`, kind: index ? "response" : "opening", sequence: index + 1 })),
    moderationStatus: "fallback"
  });
  const hook = renderHook(() => useAiCouncilRoom(input));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  act(() => hook.result.current.roomProps.onQuestionChange("Một bước nhỏ cho hôm nay?"));
  await act(async () => { await hook.result.current.roomProps.onSend(); });
  await waitFor(() => expect(hook.result.current.roomProps.thread.filter(turn => turn.role === "guide")).toHaveLength(3));
  const guides = hook.result.current.roomProps.thread.filter(turn => turn.role === "guide");
  expect(guides.map(turn => turn.persona?.id)).toEqual(hook.result.current.roomProps.personas.slice(0, 3).map(persona => persona.id));
  expect(guides.every(turn => turn.fallback)).toBe(true);
  hook.unmount();
});

it("an empty question sends nothing and uses no turn", async () => {
  const input = options();
  const hook = renderHook(() => useAiCouncilRoom(input));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  await act(async () => { await hook.result.current.roomProps.onSend(); });
  expect(generateAiCouncilTurn).not.toHaveBeenCalled();
  expect(input.onFeedback).toHaveBeenCalledWith(expect.stringContaining("Hãy viết"));
  expect(hook.result.current.roomProps.thread).toHaveLength(0);
  hook.unmount();
});

it("does not read or write Council history before the account is hydrated", async () => {
  const input = options("A", false);
  const hook = renderHook(() => useAiCouncilRoom(input));
  await act(async () => { await hook.result.current.roomProps.onSend(); });
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(generateAiCouncilTurn).not.toHaveBeenCalled();
  hook.unmount();
});

it("a remote history error keeps the saved transcript", async () => {
  const input = options("A", true, true);
  await input.storage.saveJson(key, [{
    id: "qa-session", createdAt: "2026-09-02", updatedAt: "2026-09-02",
    title: "Saved QA", templateId: config.defaultTemplateId, guideCount: 0, turnCount: 1,
    turns: [{ id: "qa-turn", role: "user", text: "Saved QA" }], followUps: [], guestPersonaIds: []
  }]);
  (getChatSessions as jest.Mock).mockRejectedValueOnce(new Error("offline"));
  const hook = renderHook(() => useAiCouncilRoom(input));
  await waitFor(() => expect(input.onFeedback).toHaveBeenCalled());
  expect(hook.result.current.roomProps.thread[0].text).toBe("Saved QA");
  expect(hook.result.current.roomProps.sessionSummaries[0].id).toBe("qa-session");
  hook.unmount();
});

it("ignores a generation response after the account scope has closed", async () => {
  const input = options();
  const hook = renderHook(() => useAiCouncilRoom(input));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  let release!: (value: unknown) => void;
  (generateAiCouncilTurn as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  let pending: unknown;
  act(() => hook.result.current.roomProps.onQuestionChange("Một bước nhỏ cho hôm nay?"));
  await act(async () => { pending = hook.result.current.roomProps.onSend(); });
  input.backendOptions.session.close();
  await act(async () => {
    release({ turns: [{ personaId: personas[0].id, text: "Late private reply" }] });
    await pending;
  });
  expect(hook.result.current.roomProps.thread.some(turn => turn.text === "Late private reply")).toBe(false);
  expect(input.onTrack).not.toHaveBeenCalledWith("ai_council_turn_created", expect.anything());
  hook.unmount();
});

it("CO-03: a failed turn shows the reason in the room and gives the question back", async () => {
  const input = options();
  (generateAiCouncilTurn as jest.Mock).mockRejectedValueOnce(new Error("network"));
  const hook = renderHook(() => useAiCouncilRoom(input));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  act(() => hook.result.current.roomProps.onQuestionChange("Mình nên bắt đầu từ đâu?"));
  await act(async () => { await hook.result.current.roomProps.onSend(); });
  await waitFor(() => expect(hook.result.current.roomProps.roomNotice).toMatch(/vẫn còn trong ô nhập/));
  expect(hook.result.current.roomProps.question).toBe("Mình nên bắt đầu từ đâu?");
  expect(hook.result.current.roomProps.thread.some(turn => turn.text === "Mình nên bắt đầu từ đâu?")).toBe(false);
  act(() => hook.result.current.roomProps.onQuestionChange("Thử lại"));
  await act(async () => { await hook.result.current.roomProps.onSend(); });
  await waitFor(() => expect(hook.result.current.roomProps.roomNotice).toBeNull());
  hook.unmount();
});

it("CO-03: each history turn sent to the server is at most 800 characters", async () => {
  const input = options();
  const hook = renderHook(() => useAiCouncilRoom(input));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  act(() => hook.result.current.roomProps.onQuestionChange("x".repeat(2000)));
  await act(async () => { await hook.result.current.roomProps.onSend(); });
  await waitFor(() => expect(hook.result.current.roomProps.thread.filter(turn => turn.role === "guide").length).toBeGreaterThan(0));
  act(() => hook.result.current.roomProps.onQuestionChange("Tiếp theo?"));
  await act(async () => { await hook.result.current.roomProps.onSend(); });
  const calls = (generateAiCouncilTurn as jest.Mock).mock.calls;
  const history = calls[calls.length - 1][0].sanitizedHistory as Array<{ text: string }>;
  expect(history.length).toBeGreaterThan(0);
  expect(history.every(turn => turn.text.length <= 800)).toBe(true);
  hook.unmount();
});
