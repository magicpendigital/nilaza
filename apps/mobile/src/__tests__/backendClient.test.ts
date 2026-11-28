import {
  BackendLimitError,
  BackendUnavailableError,
  generatePersonaReply,
  generateOracleTurn,
  generateAiCouncilTurn,
  generateTarotReading,
  requestTarotClarifier,
  requestTarotNote,
  requestNumerologyMessage,
  requestNumerologyReport,
  requestTarotReaderSuggestion,
  sendProductEvent,
  requestGuestTarotDraw,
  requestTarotDraw,
  TarotLimitError,
  generateDailyInsight,
  generateDailyZodiacPulse,
  registerNotificationDevice,
  sendNotificationTest,
  syncUserProfile,
  syncJournalEntry,
  syncJournalMutation,
  syncNotificationInbox,
  syncNotificationPreferences,
  DailyInsightInput,
  DailyZodiacPulseInput,
  PersonaReplyInput,
  OracleTurnInput,
  AiCouncilInput,
  TarotInterpretationInput,
  ProfileSyncInput,
  JournalSyncInput,
  NotificationRegisterInput,
  NotificationPreferencesInput,
  NotificationInboxInput,
  NotificationTestInput
} from "../backendClient";

describe("backendClient", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const backendOptions = { baseUrl: "https://api.example.com", timeoutMs: 1000 };

  it("rejects unauthenticated, fake and mismatched Journal acknowledgments", async () => {
    const mutation = { operation: "delete" as const, localId: "qa-one", revision: 1 };
    await expect(syncJournalMutation(mutation, backendOptions)).rejects.toThrow("active account");
    expect(mockFetch).not.toHaveBeenCalled();
    const options = { ...backendOptions, authToken: "fake-test-token" };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "synced", remoteId: "journal-qa-one" }) });
    await expect(syncJournalMutation(mutation, options)).rejects.toThrow("acknowledge");
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "synced", operation: "delete", localId: "different-id" }) });
    await expect(syncJournalMutation(mutation, options)).rejects.toThrow("acknowledge");
  });

  it("sends only the requested Journal deletion and requires its matching ACK", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "synced", operation: "delete", localId: "qa-one" }) });
    await syncJournalMutation({ operation: "delete", localId: "qa-one", revision: 3 }, { ...backendOptions, authToken: "fake-test-token" });
    const request = mockFetch.mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual({ operation: "delete", localId: "qa-one" });
    expect(request.headers.Authorization).toBe("Bearer fake-test-token");
  });

  describe("generateOracleTurn", () => {
    const input: OracleTurnInput = {
      language: "en",
      userMessage: "I feel confused about love.",
      currentScreen: "home",
      profile: { nickname: "Test", goals: ["love"], tone: "gentle" },
      recentSafeContext: [],
      consentFlags: { journalMemory: false, birthProfile: false },
      sanitizedHistory: []
    };
    const fallback = jest.fn().mockReturnValue({
      reply: "fallback",
      intent: "reflect",
      confidence: 0.5,
      actionCards: [],
      moderationStatus: "fallback"
    });

    it("posts to the Oracle endpoint and returns parsed json on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: "success",
          intent: "council_handoff",
          confidence: 0.82,
          actionCards: [],
          moderationStatus: "passed"
        })
      });

      const result = await generateOracleTurn(input, fallback, backendOptions);
      expect(result).toEqual({
        reply: "success",
        intent: "council_handoff",
        confidence: 0.82,
        actionCards: [],
        moderationStatus: "passed"
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/ai/oracle-turn",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("maps Oracle to the Supabase Edge Function name", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: "success",
          intent: "reflect",
          confidence: 0.7,
          actionCards: [],
          moderationStatus: "passed"
        })
      });

      await generateOracleTurn(input, fallback, { baseUrl: "https://project.supabase.co/functions/v1", timeoutMs: 1000 });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://project.supabase.co/functions/v1/ai-oracle-turn",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("says offline, busy and limit instead of a canned Oracle reply (oracle-ai-tools-2026-11-11)", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(generateOracleTurn(input, fallback, backendOptions)).rejects.toEqual(new BackendUnavailableError("offline"));
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "oracle_unavailable" }) });
      await expect(generateOracleTurn(input, fallback, backendOptions)).rejects.toMatchObject({ reason: "busy", status: 503 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: "daily_limit_reached" }) });
      await expect(generateOracleTurn(input, fallback, backendOptions)).rejects.toEqual(new BackendLimitError("daily_limit_reached", 429));
    });

    it("keeps the on-device crisis reply and the local router without a backend", async () => {
      const safety = jest.fn().mockReturnValue({ reply: "Call 115", intent: "safety_redirect", confidence: 0.95, actionCards: [], moderationStatus: "blocked", safety: "crisis" });
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(generateOracleTurn(input, safety, backendOptions)).resolves.toMatchObject({ safety: "crisis" });
      await expect(generateOracleTurn(input, fallback, { baseUrl: undefined })).resolves.toMatchObject({ moderationStatus: "fallback" });
    });
  });

  describe("generatePersonaReply", () => {
    const input: PersonaReplyInput = {
      language: "en",
      persona: { id: "1", slug: "test", type: "friend", name: "Test", displayRole: "Role", sourceInspiration: "Src", transparencyNote: "Note" },
      text: "hello",
      userContext: { goals: [], tone: "neutral" }
    };
    const fallback = jest.fn().mockReturnValue({ text: "fallback", moderationStatus: "fallback" });

    it("returns parsed json on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: "success", moderationStatus: "passed" })
      });

      const result = await generatePersonaReply(input, fallback, backendOptions);
      expect(result).toEqual({ text: "success", moderationStatus: "passed" });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/ai/persona-chat",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("surfaces a paused feature, and an expired sign-in as auth instead of a canned reply", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "feature_paused" }) });
      await expect(generatePersonaReply(input, fallback, backendOptions)).rejects.toMatchObject({ code: "feature_paused", status: 503 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: "authentication_required" }) });
      await expect(generatePersonaReply(input, fallback, backendOptions)).rejects.toEqual(new BackendUnavailableError("auth", 401));
    });

    it("surfaces the server daily limit (2026-11-11); a 503 usage check is busy", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: "daily_limit_reached" }) });
      await expect(generatePersonaReply(input, fallback, backendOptions)).rejects.toMatchObject({ code: "daily_limit_reached", status: 429 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "usage_check_unavailable" }) });
      await expect(generatePersonaReply(input, fallback, backendOptions)).rejects.toMatchObject({ reason: "busy", status: 503 });
    });

    it("still answers a crisis signal on the device when the AI is unreachable", async () => {
      const safety = jest.fn().mockReturnValue({ text: "Call 115", moderationStatus: "blocked", safety: "crisis" });
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(generatePersonaReply(input, safety, backendOptions)).resolves.toMatchObject({ safety: "crisis" });
    });

    it("says busy when the answer cannot be read", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new SyntaxError("bad json"); } });
      await expect(generatePersonaReply(input, fallback, backendOptions)).rejects.toMatchObject({ reason: "busy" });
    });

    it("forwards session continuity fields without changing the backend path", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: "continued",
          moderationStatus: "passed",
          remoteSessionId: "11111111-1111-4111-8111-111111111111",
          methodPackId: "emotional_reflection",
          methodPackVersion: "2026-09-20-method-packs-v1"
        })
      });

      const result = await generatePersonaReply({
        ...input,
        sessionId: "11111111-1111-4111-8111-111111111111",
        clientRequestId: "client-request-1",
        sanitizedHistory: [
          { role: "user", text: "I feel stuck" },
          { role: "guide", text: "What feels most important right now?" }
        ]
      }, fallback, backendOptions);

      const [, request] = mockFetch.mock.calls.at(-1) as [string, RequestInit];
      expect(JSON.parse(String(request.body))).toMatchObject({
        sessionId: "11111111-1111-4111-8111-111111111111",
        clientRequestId: "client-request-1",
        sanitizedHistory: [
          { role: "user", text: "I feel stuck" },
          { role: "guide", text: "What feels most important right now?" }
        ]
      });
      expect(result).toMatchObject({
        text: "continued",
        remoteSessionId: "11111111-1111-4111-8111-111111111111",
        methodPackId: "emotional_reflection"
      });
    });

    it("says busy on a non-ok response instead of a canned reply", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(generatePersonaReply(input, fallback, backendOptions)).rejects.toMatchObject({ reason: "busy", status: 500 });
    });

    it("says offline on a network error instead of a canned reply (device test 2026-11-11)", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(generatePersonaReply(input, fallback, backendOptions)).rejects.toEqual(new BackendUnavailableError("offline"));
    });

    it("returns null if no baseUrl", async () => {
      const result = await generatePersonaReply(input, fallback, { baseUrl: undefined });
      expect(result).toEqual({ text: "fallback", moderationStatus: "fallback" });
    });

    it("maps API paths to Supabase Edge Function names when baseUrl ends with functions/v1", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: "success", moderationStatus: "passed" })
      });

      await generatePersonaReply(input, fallback, { baseUrl: "https://project.supabase.co/functions/v1", timeoutMs: 1000 });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://project.supabase.co/functions/v1/ai-persona-chat",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("adds Authorization header when an auth token is supplied", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: "success", moderationStatus: "passed" })
      });

      await generatePersonaReply(input, fallback, { ...backendOptions, authToken: "session-token" });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/ai/persona-chat",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer session-token" })
        })
      );
    });

    it("adds the Supabase apikey header when an api key is supplied", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: "success", moderationStatus: "passed" })
      });

      await generatePersonaReply(input, fallback, { ...backendOptions, apiKey: "anon-key" });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/ai/persona-chat",
        expect.objectContaining({
          headers: expect.objectContaining({ apikey: "anon-key" })
        })
      );
    });
  });

  describe("generateAiCouncilTurn", () => {
    const input: AiCouncilInput = {
      language: "en",
      councilId: "ai_council",
      councilVersion: "2026-06-26-council-builder-v1",
      councilContractVersion: "2026-09-20-council-rounds-v2",
      councilTemplate: {
        id: "career_fog",
        meetingMode: "advisory_board",
        synthesisMode: "decision_next_step",
        maxGuidesPerTurn: 3,
        guideRoles: [
          { personaId: "figure-aristotle", personaSlug: "aristotle", role: "chair" },
          { personaId: "figure-confucius", personaSlug: "confucius", role: "advisor" }
        ],
        outputContract: ["roundId", "guideReplies[]", "microExperiment"]
      },
      userMessage: "Should I change my career path?",
      selectedPersonas: [
        { id: "figure-aristotle", slug: "aristotle", type: "historical_figure", name: { en: "Aristotle" }, displayRole: { en: "Guide of reason" }, sourceInspiration: { en: "Aristotle" }, transparencyNote: { en: "Inspired guide" } },
        { id: "figure-confucius", slug: "confucius", type: "historical_figure", name: { en: "Confucius" }, displayRole: { en: "Guide of harmony" }, sourceInspiration: { en: "Confucius" }, transparencyNote: { en: "Inspired guide" } }
      ],
      userContext: { goals: ["career"], tone: "gentle" },
      sanitizedHistory: []
    };
    const fallback = jest.fn().mockReturnValue({
      turns: [{ personaId: "figure-aristotle", text: "fallback", lens: "reason" }],
      promptVersionId: "ai_council_system",
      moderationStatus: "fallback"
    });

    it("posts to the AI Council endpoint and returns parsed json on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          turns: [{ personaId: "figure-aristotle", text: "success", lens: "reason" }],
          promptVersionId: "ai_council_system",
          councilConfigSource: "supabase_active_config",
          councilTemplateId: "career_fog",
          meetingMode: "advisory_board",
          moderationStatus: "passed"
        })
      });

      const result = await generateAiCouncilTurn(input, fallback, backendOptions);
      expect(result).toEqual({
        turns: [{ personaId: "figure-aristotle", text: "success", lens: "reason" }],
        promptVersionId: "ai_council_system",
        councilConfigSource: "supabase_active_config",
        councilTemplateId: "career_fog",
        meetingMode: "advisory_board",
        moderationStatus: "passed"
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/ai/ai-council",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"personaSlug\":\"aristotle\"")
        })
      );
    });

    it("surfaces the daily limit and sign-in answers instead of a canned reply", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: "daily_council_limit" }) });
      await expect(generateAiCouncilTurn(input, fallback, backendOptions)).rejects.toEqual(new BackendLimitError("daily_council_limit", 429));
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: "sign_in_required" }) });
      await expect(generateAiCouncilTurn(input, fallback, backendOptions)).rejects.toMatchObject({ code: "sign_in_required", status: 401 });
      // Other server errors say busy instead of a canned council.
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
      await expect(generateAiCouncilTurn(input, fallback, backendOptions)).rejects.toMatchObject({ reason: "busy", status: 500 });
    });

    it("surfaces a feature paused from Admin, while other 503s say busy", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "feature_paused" }) });
      await expect(generateAiCouncilTurn(input, fallback, backendOptions)).rejects.toEqual(new BackendLimitError("feature_paused", 503));
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "ai_unavailable" }) });
      await expect(generateAiCouncilTurn(input, fallback, backendOptions)).rejects.toMatchObject({ reason: "busy", status: 503 });
    });

    it("says offline on a network error; the local safety reply still answers", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(generateAiCouncilTurn(input, fallback, backendOptions)).rejects.toEqual(new BackendUnavailableError("offline"));
      const safety = jest.fn().mockReturnValue({ turns: [], moderationStatus: "blocked", safety: "crisis", safetyText: "Call 115" });
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(generateAiCouncilTurn(input, safety, backendOptions)).resolves.toMatchObject({ safety: "crisis" });
    });

    it("keeps the local council when no backend is configured", async () => {
      await expect(generateAiCouncilTurn(input, fallback, { baseUrl: undefined })).resolves.toMatchObject({ moderationStatus: "fallback" });
    });
  });

  describe("generateTarotReading", () => {
    const input: TarotInterpretationInput = {
      language: "en",
      deck: { id: "1", slug: "deck", name: "Deck", readingStyle: "style", accessTier: "free" },
      topic: "love",
      spread: "past-present-future",
      question: "Will I find love?",
      selectedCards: []
    };
    const fallback = jest.fn().mockReturnValue({ summary: "fallback", reflection: "fallback", moderationStatus: "fallback" });

    it("returns parsed json on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: "success", reflection: "success", sections: [{key:"theme",title:{en:"Theme"},body:{en:"Detail"}}], moderationStatus: "passed" })
      });

      const result = await generateTarotReading(input, fallback, backendOptions);
      expect(result).toMatchObject({ summary: "success", reflection: "success", moderationStatus: "passed" });
    });

    it("returns fallback on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));
      const result = await generateTarotReading(input, fallback, backendOptions);
      expect(result).toMatchObject({ summary: "fallback", reflection: "fallback", moderationStatus: "fallback", provenance: {sourceKind:"fallback",persistenceStatus:"skipped"} });
    });

    it("surfaces the server daily limit and a paused feature; sign-in errors still fall back (2026-11-11)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: "daily_limit_reached" }) });
      await expect(generateTarotReading(input, fallback, backendOptions)).rejects.toMatchObject({ code: "daily_limit_reached", status: 429 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "feature_paused" }) });
      await expect(generateTarotReading(input, fallback, backendOptions)).rejects.toMatchObject({ code: "feature_paused" });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: "authentication_required" }) });
      await expect(generateTarotReading(input, fallback, backendOptions)).resolves.toMatchObject({ summary: "fallback" });
    });

    it("keeps complete sections on a valid result and rejects malformed success bodies", async () => {
      const sections = [{ key: "past", title: { en: "Past" }, body: { en: "Context-specific detail" } }];
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ summary: "Message", reflection: "Question?", sections, moderationStatus: "passed" }) });
      expect((await generateTarotReading(input, fallback, backendOptions)).sections).toEqual(sections);
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ summary: { unexpected: true }, reflection: "Question?", moderationStatus: "passed" }) });
      expect((await generateTarotReading(input, fallback, backendOptions)).moderationStatus).toBe("fallback");
    });

    it("aborts a hanging Tarot request at the generation budget and returns fallback", async () => {
      jest.useFakeTimers();
      try {
        mockFetch.mockImplementationOnce((_url: string, request: RequestInit) =>
          new Promise((_resolve, reject) => {
            request.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
          })
        );

        const resultPromise = generateTarotReading(input, fallback, backendOptions);
        await jest.advanceTimersByTimeAsync(75_000);

        await expect(resultPromise).resolves.toMatchObject({
          summary: "fallback",
          reflection: "fallback",
          moderationStatus: "fallback"
        });
        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.example.com/ai/tarot-reading",
          expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) })
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe("P1-A server-drawn Tarot (nil-p1-tarot-lock-2026-11-15)", () => {
    const signedIn = { ...backendOptions, authToken: "fake-test-token" };
    const drawId = "11111111-2222-4333-8444-555555555555";
    const serverCards = [{ id: "major-00-the-fool", positionKey: "today", reversed: true }];
    const drawInput = { language: "vi" as const, deck: { id: "deck-1", slug: "nilaza-classic" }, topic: "love", spread: "daily-one", question: "Hôm nay?" };
    const input: TarotInterpretationInput = {
      language: "vi",
      deck: { id: "deck-1", slug: "nilaza-classic", name: "Deck", readingStyle: "style", accessTier: "free" },
      topic: "love", spread: "daily-one", question: "Hôm nay?",
      selectedCards: [{ id: "major-00-the-fool", reversed: true } as TarotInterpretationInput["selectedCards"][number]],
      drawId
    };
    const fallback = jest.fn().mockReturnValue({ summary: "fallback", reflection: "fallback", moderationStatus: "fallback" });
    const sections = [{ key: "today", title: { vi: "Hôm nay", en: "Today" }, body: { vi: "Chi tiết", en: "Detail" }, cardIds: ["major-00-the-fool"] }];
    const original = { interactionId: "interaction_old", attemptId: "attempt_old", clientRequestId: "request_old" };
    const storedProvenance = { schemaVersion: "nilaza.answer-provenance.v1", feature: "tarot_reading", ...original, locale: "vi", sourceKind: "ai",
      generatedAt: "2026-11-15T03:00:00.000Z", validationStatus: "validated", persistenceStatus: "stored", remoteId: drawId };

    it("asks the server to draw and never sends cards; limits and locks carry the reason and opening time", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ drawId, status: "queued", replayed: false, spread: "daily-one", topic: "love",
        lockDate: "2026-11-16", nextDrawAt: "2026-11-16T17:00:00.000Z", cards: serverCards }) });
      await expect(requestTarotDraw(drawInput, signedIn)).resolves.toMatchObject({ drawId, cards: serverCards, nextDrawAt: "2026-11-16T17:00:00.000Z" });
      const body = JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body));
      expect(body).toEqual({ action: "draw", language: "vi", deck: { id: "deck-1", slug: "nilaza-classic" }, topic: "love", spread: "daily-one", question: "Hôm nay?" });
      expect(body.selectedCards).toBeUndefined();

      mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: "daily_limit_reached", reason: "draw_cap", nextDrawAt: "2026-11-16T17:00:00.000Z" }) });
      const limit = await requestTarotDraw(drawInput, signedIn).catch(error => error);
      expect(limit).toBeInstanceOf(TarotLimitError);
      expect(limit).toMatchObject({ code: "daily_limit_reached", reason: "draw_cap", nextDrawAt: "2026-11-16T17:00:00.000Z" });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: "tarot_reading_locked", reason: "deleted", nextDrawAt: "2026-11-16T17:00:00.000Z" }) });
      await expect(requestTarotDraw(drawInput, signedIn)).rejects.toMatchObject({ code: "tarot_reading_locked", reason: "deleted" });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "feature_paused" }) });
      await expect(requestTarotDraw(drawInput, signedIn)).rejects.toMatchObject({ code: "feature_paused" });
      // Tarot v2 pack 0: a Premium deck for an account without Premium (only once Premium is on sale) is a limit the app can word.
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: "premium_required", reason: "premium_deck" }) });
      await expect(requestTarotDraw(drawInput, signedIn)).rejects.toMatchObject({ code: "premium_required", status: 403 });
    });

    it("pack 1: a guest asks the public function with only the install id, spread and topic, and never sends an account or a question", async () => {
      const guestCards = [{ id: "major-00-the-fool", positionKey: "daily", reversed: true }];
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: "guest_draw", spread: "daily-one", topic: "open", lockDate: "2026-11-16",
        nextDrawAt: "2026-11-16T17:00:00.000Z", cards: guestCards }) });
      const guestOptions = { baseUrl: "https://abc.supabase.co/functions/v1", apiKey: "anon-key-for-tests", authToken: "must-not-be-sent", timeoutMs: 1000 };
      const deviceId = "8d2b6f1e-5c3a-4e7b-9a10-2f4c6d8e0a13";
      await expect(requestGuestTarotDraw({ deviceId, spread: "daily-one", topic: "open" }, guestOptions)).resolves.toEqual({
        spread: "daily-one", topic: "open", lockDate: "2026-11-16", nextDrawAt: "2026-11-16T17:00:00.000Z", cards: guestCards });
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://abc.supabase.co/functions/v1/tarot-guest-draw");
      expect(JSON.parse(String(init.body))).toEqual({ deviceId, spread: "daily-one", topic: "open" });
      const headers = init.headers as Record<string, string>;
      expect(headers.apikey).toBe("anon-key-for-tests");
      expect(headers.Authorization).toBeUndefined();
    });

    it("pack 1: a guest draw that the server cannot give (secret not set, busy, malformed, offline) is a BackendUnavailableError, never local cards", async () => {
      const guestInput = { deviceId: "8d2b6f1e-5c3a-4e7b-9a10-2f4c6d8e0a13", spread: "daily-one", topic: "open" };
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "guest_draw_unavailable" }) });
      await expect(requestGuestTarotDraw(guestInput, backendOptions)).rejects.toBeInstanceOf(BackendUnavailableError);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: "guest_draw", spread: "daily-one", topic: "open", lockDate: "2026-11-16",
        cards: [{ id: "a", positionKey: "daily", reversed: false }, { id: "a", positionKey: "x", reversed: false }] }) });
      await expect(requestGuestTarotDraw(guestInput, backendOptions)).rejects.toBeInstanceOf(BackendUnavailableError);
      mockFetch.mockRejectedValueOnce(new Error("network"));
      await expect(requestGuestTarotDraw(guestInput, backendOptions)).rejects.toMatchObject({ reason: "offline" });
      await expect(requestGuestTarotDraw(guestInput, { timeoutMs: 1000 })).rejects.toMatchObject({ reason: "offline" });
    });

    it("pack 1: after sign-in the draw sends the install id and reads whether the guest's cards were kept", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ drawId, status: "queued", replayed: false, guestAdopted: true, spread: "daily-one", topic: "love",
        lockDate: "2026-11-16", nextDrawAt: "2026-11-16T17:00:00.000Z", cards: serverCards }) });
      const deviceId = "8d2b6f1e-5c3a-4e7b-9a10-2f4c6d8e0a13";
      await expect(requestTarotDraw({ ...drawInput, guestDeviceId: deviceId }, signedIn)).resolves.toMatchObject({ drawId, guestAdopted: true });
      expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toMatchObject({ action: "draw", guestDeviceId: deviceId });
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ drawId, status: "queued", replayed: false, spread: "daily-one", topic: "love", cards: serverCards }) });
      await expect(requestTarotDraw(drawInput, signedIn)).resolves.toMatchObject({ guestAdopted: false });
      expect(JSON.parse(String((mockFetch.mock.calls[1][1] as RequestInit).body))).not.toHaveProperty("guestDeviceId");
    });

    it("refuses a malformed draw and says offline instead of drawing cards on the device", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ drawId, status: "queued", spread: "daily-one", topic: "love",
        cards: [serverCards[0], serverCards[0]] }) });
      await expect(requestTarotDraw(drawInput, signedIn)).rejects.toMatchObject({ reason: "busy" });
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(requestTarotDraw(drawInput, signedIn)).rejects.toEqual(new BackendUnavailableError("offline"));
    });

    it("guests never reach the server draw", async () => {
      const session = { active: true, userId: undefined, accessToken: undefined, controller: new AbortController() };
      await expect(requestTarotDraw(drawInput, { ...backendOptions, session } as never)).rejects.toMatchObject({ reason: "auth" });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("interprets only the drawId and keeps a replayed answer with its original provenance", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ summary: "Đã lưu", reflection: "Câu hỏi?", sections, moderationStatus: "passed",
        provenance: storedProvenance, persistenceStatus: "stored", remoteId: drawId, drawId, replayed: true, status: "completed", language: "vi",
        nextDrawAt: "2026-11-16T17:00:00.000Z", cards: serverCards }) });
      const result = await generateTarotReading(input, fallback, signedIn);
      expect(result).toMatchObject({ summary: "Đã lưu", moderationStatus: "passed", drawId, replayed: true, nextDrawAt: "2026-11-16T17:00:00.000Z",
        provenance: { sourceKind: "ai", attemptId: "attempt_old" } });
      const body = JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body));
      expect(body).toEqual({ action: "interpret", drawId, language: "vi", selectedCards: [{ id: "major-00-the-fool", reversed: true }] });
      expect(fallback).not.toHaveBeenCalled();
    });

    it("waits once when another device is interpreting the same draw, then shows the stored answer", async () => {
      jest.useFakeTimers();
      try {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: "reading_in_progress", drawId, retryAfterSeconds: 1 }) });
        mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ summary: "Đã lưu", reflection: "Câu hỏi?", sections, moderationStatus: "passed",
          provenance: storedProvenance, drawId, replayed: true, language: "vi", cards: serverCards }) });
        const pending = generateTarotReading(input, fallback, signedIn);
        await jest.advanceTimersByTimeAsync(1000);
        await expect(pending).resolves.toMatchObject({ replayed: true, drawId });
        expect(mockFetch).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });

    it("an AI failure keeps the same drawId on the labelled fallback; limits still surface", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "reading_not_saved", drawId, retryable: true }) });
      await expect(generateTarotReading(input, fallback, signedIn)).resolves.toMatchObject({ summary: "fallback", drawId, replayed: false,
        provenance: { sourceKind: "fallback" } });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: "daily_limit_reached", reason: "attempts", nextDrawAt: "2026-11-16T17:00:00.000Z" }) });
      await expect(generateTarotReading(input, fallback, signedIn)).rejects.toMatchObject({ code: "daily_limit_reached", reason: "attempts" });
    });

    it("the clarifier is one server card with its library meaning", async () => {
      const clarifier = { cardId: "major-01-the-magician", reversed: false, orientation: "upright", positionKey: "clarifier", source: "server_csprng",
        name: { vi: "Nhà Ảo Thuật", en: "The Magician" }, meaning: { vi: "Ý nghĩa", en: "Meaning" }, reflectionQuestion: { vi: "Hỏi?", en: "Ask?" },
        contentVersion: "v1", drawnAt: "2026-11-16T03:00:00.000Z" };
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ drawId, clarifier, replayed: false }) });
      await expect(requestTarotClarifier(drawId, signedIn)).resolves.toMatchObject({ cardId: "major-01-the-magician", reversed: false, name: { vi: "Nhà Ảo Thuật" } });
      expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual({ action: "clarify", drawId });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: "reading_not_ready", drawId }) });
      await expect(requestTarotClarifier(drawId, signedIn)).rejects.toMatchObject({ reason: "busy", status: 409 });
    });
  });

  describe("batch C: personal note, reader suggestion and product events", () => {
    const signedIn = { ...backendOptions, authToken: "fake-test-token" };
    const drawId = "11111111-2222-4333-8444-555555555555";
    const ok = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body });

    it("asks for the note with only the draw id and maps the answer", async () => {
      mockFetch.mockResolvedValueOnce(ok({ note: { text: "Đoạn một. Đoạn hai.", need: "Bạn cần được nghe.", askThem: "Bạn thấy sao?" }, noteStatus: "stored",
        moderationStatus: "passed", model: "m", experiment: { campaignId: "c1", variant: "b" }, nextNoteAt: "2026-11-25T17:00:00.000Z" }));
      await expect(requestTarotNote(drawId, signedIn)).resolves.toMatchObject({ kind: "note", note: { need: "Bạn cần được nghe." }, experiment: { campaignId: "c1", variant: "b" } });
      expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual({ action: "note", drawId });
    });

    it("maps the daily limit, crisis, unavailable and missing sign-in without inventing text", async () => {
      mockFetch.mockResolvedValueOnce(ok({ error: "daily_limit_reached", reason: "note_daily", nextNoteAt: "2026-11-25T17:00:00.000Z" }, 429));
      await expect(requestTarotNote(drawId, signedIn)).resolves.toEqual({ kind: "used_today", nextNoteAt: "2026-11-25T17:00:00.000Z" });
      mockFetch.mockResolvedValueOnce(ok({ note: null, moderationStatus: "blocked", safety: { crisis: true } }));
      await expect(requestTarotNote(drawId, signedIn)).resolves.toEqual({ kind: "crisis" });
      mockFetch.mockResolvedValueOnce(ok({ error: "note_unavailable" }, 503));
      await expect(requestTarotNote(drawId, signedIn)).resolves.toEqual({ kind: "unavailable", reason: "busy" });
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(requestTarotNote(drawId, signedIn)).resolves.toEqual({ kind: "unavailable", reason: "offline" });
      await expect(requestTarotNote(drawId, backendOptions)).resolves.toEqual({ kind: "unavailable", reason: "auth" });
    });

    it("retries a note in progress at most three times", async () => {
      jest.useFakeTimers();
      try {
        mockFetch.mockResolvedValue(ok({ error: "note_in_progress", retryAfterSeconds: 1 }, 409));
        const pending = requestTarotNote(drawId, signedIn);
        await jest.advanceTimersByTimeAsync(5000);
        await expect(pending).resolves.toEqual({ kind: "unavailable", reason: "busy" });
        expect(mockFetch).toHaveBeenCalledTimes(3);
      } finally {
        jest.useRealTimers();
        mockFetch.mockReset();
      }
    });

    it("uses the AI reader only when the slug is a candidate", async () => {
      const candidates = ["the-love-oracle", "the-clear-strategist"];
      mockFetch.mockResolvedValueOnce(ok({ slug: "the-love-oracle", confidence: 0.8, intent: "love", source: "llm", model: "m", experiment: null }));
      await expect(requestTarotReaderSuggestion(drawId, candidates, signedIn)).resolves.toMatchObject({ slug: "the-love-oracle", source: "llm" });
      expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual({ action: "suggest_reader", drawId, candidates });
      mockFetch.mockResolvedValueOnce(ok({ slug: "someone-else", confidence: 0.9, intent: null, source: "llm" }));
      await expect(requestTarotReaderSuggestion(drawId, candidates, signedIn)).resolves.toBeNull();
      mockFetch.mockResolvedValueOnce(ok({ slug: null, confidence: 0, intent: null, source: "none" }));
      await expect(requestTarotReaderSuggestion(drawId, candidates, signedIn)).resolves.toBeNull();
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(requestTarotReaderSuggestion(drawId, candidates, signedIn)).resolves.toBeNull();
      // The handler refuses more than 7 or repeated candidates (400), so the client dedupes and caps the list.
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce(ok({ slug: null, confidence: null, intent: null, source: "none", model: null, experiment: null }));
      const many = ["a", "b", "a", "c", "d", "e", "f", "g", "h"];
      await requestTarotReaderSuggestion(drawId, many, signedIn);
      expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body)).candidates).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    });

    it("sends product events with enumerated values only and never throws", async () => {
      mockFetch.mockResolvedValueOnce(ok({}, 202));
      sendProductEvent("reader_suggestion_shown", { slug: "the-love-oracle", topic: "love", source: "rule", question: "Người ấy có thật lòng?" }, signedIn);
      await Promise.resolve();
      const body = JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body));
      expect(String(mockFetch.mock.calls[0][0])).toMatch(/share-events|share\/events/);
      // The share-events product-event shape: {name, metadata}; a key outside the allowlist (question) is dropped.
      expect(body).toEqual({ events: [{ name: "reader_suggestion_shown", metadata: { slug: "the-love-oracle", topic: "love", source: "rule" } }] });
      mockFetch.mockResolvedValueOnce(ok({}, 202));
      sendProductEvent("tarot_note_feedback", { value: "yes", campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "B", question: "will-he-call" }, signedIn);
      await Promise.resolve();
      // The same payload is asserted as accepted by supabase/functions/share-events/handler_test.ts.
      expect(JSON.parse(String((mockFetch.mock.calls[1][1] as RequestInit).body))).toEqual({
        events: [{ name: "tarot_note_feedback", metadata: { campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "B", value: "yes" } }]
      });
      mockFetch.mockResolvedValueOnce(ok({}, 202));
      sendProductEvent("tarot_report_opened", { campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "A", question: "x" }, signedIn);
      await Promise.resolve();
      expect(JSON.parse(String((mockFetch.mock.calls[2][1] as RequestInit).body))).toEqual({
        events: [{ name: "tarot_report_opened", metadata: { campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "A" } }]
      });
      mockFetch.mockResolvedValueOnce(ok({}, 202));
      sendProductEvent("tarot_followup_started", { slug: "the-mystic", campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "C" }, signedIn);
      await Promise.resolve();
      expect(JSON.parse(String((mockFetch.mock.calls[3][1] as RequestInit).body)).events[0].metadata)
        .toEqual({ campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "C", slug: "the-mystic" });
      mockFetch.mockClear();
      sendProductEvent("tarot_note_feedback", { campaignId: "not-a-uuid", variant: "B" }, signedIn);
      expect(mockFetch).not.toHaveBeenCalled();
      mockFetch.mockRejectedValueOnce(new Error("down"));
      expect(() => sendProductEvent("tarot_followup_started", { slug: "the-mystic" }, signedIn)).not.toThrow();
      mockFetch.mockClear();
      sendProductEvent("tarot_followup_started", { slug: "the-mystic" }, backendOptions);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("generateDailyInsight", () => {
    const input: DailyInsightInput = {
      language: "en",
      dateKey: "2023-01-01",
      rerollCount: 0,
      profile: { nickname: "Test", goals: [], tone: "neutral" },
      recentEntries: []
    };
    const fallback = jest.fn().mockReturnValue({ id: "fallback", dateKey: "2023-01-01", theme: "fallback" });

    it("returns parsed json on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "success", dateKey: "2023-01-01", theme: "success" })
      });

      const result = await generateDailyInsight(input, fallback, backendOptions);
      expect(result).toEqual({ id: "success", dateKey: "2023-01-01", theme: "success" });
    });

    it("returns fallback on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));
      const result = await generateDailyInsight(input, fallback, backendOptions);
      expect(result).toEqual({ id: "fallback", dateKey: "2023-01-01", theme: "fallback" });
    });
  });

  describe("requestNumerologyMessage", () => {
    const signedIn = { baseUrl: "https://project.supabase.co/functions/v1", timeoutMs: 1000, authToken: "fake-test-token" };
    const ok = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body });
    const payload = {
      version: 1 as const, feature: "numerology_private_message" as const, language: "vi" as const,
      numbers: { lifePath: "7", birthday: "3", personalYear: "1", personalMonth: "2", pinnacle: { stage: 1 as const, number: "5" }, challenge: "2" },
      blockIds: ["numbers.7", "numbers.3", "personalYear.1"]
    };

    it("posts only the payload to ai-numerology-message and maps the message", async () => {
      mockFetch.mockResolvedValueOnce(ok({ message: "  Lời nhắn.  ", blockIds: ["numbers.7", "numbers.3", "personalYear.1"], nextMessageAt: "2026-11-25T17:00:00.000Z" }));
      await expect(requestNumerologyMessage(payload, signedIn)).resolves.toEqual({
        kind: "message", message: "Lời nhắn.", blockIds: ["numbers.7", "numbers.3", "personalYear.1"], nextMessageAt: "2026-11-25T17:00:00.000Z"
      });
      expect(String(mockFetch.mock.calls[0][0])).toBe("https://project.supabase.co/functions/v1/ai-numerology-message");
      expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual(payload);
    });

    it("maps pauses, Premium, limits, blocks and failures without inventing text", async () => {
      const cases: Array<[unknown, number, unknown]> = [
        [{ error: "feature_paused" }, 503, { kind: "soon" }],
        [{ error: "content_not_approved" }, 503, { kind: "soon" }],
        [{ error: "premium_required" }, 403, { kind: "premium_required" }],
        [{ error: "daily_limit_reached", reason: "delivered", nextMessageAt: "2026-11-25T17:00:00.000Z" }, 429, { kind: "daily_limit", nextMessageAt: "2026-11-25T17:00:00.000Z" }],
        [{ error: "message_unavailable", moderationStatus: "blocked", retryable: false }, 503, { kind: "blocked" }],
        [{ error: "message_unavailable", retryable: true }, 503, { kind: "unavailable", reason: "busy" }],
        [{ error: "invalid_jwt" }, 401, { kind: "unavailable", reason: "auth" }],
        [{ message: "   ", blockIds: [] }, 200, { kind: "unavailable", reason: "busy" }]
      ];
      for (const [body, status, expected] of cases) {
        mockFetch.mockResolvedValueOnce(ok(body, status));
        await expect(requestNumerologyMessage(payload, signedIn)).resolves.toEqual(expected);
      }
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(requestNumerologyMessage(payload, signedIn)).resolves.toEqual({ kind: "unavailable", reason: "offline" });
      mockFetch.mockClear();
      await expect(requestNumerologyMessage(payload, backendOptions)).resolves.toEqual({ kind: "unavailable", reason: "auth" });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("requestNumerologyReport (2026-11-28)", () => {
    const signedIn = { baseUrl: "https://project.supabase.co/functions/v1", timeoutMs: 1000, authToken: "fake-test-token" };
    const ok = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body });
    const payload = {
      version: 1 as const, feature: "numerology_report" as const, language: "vi" as const,
      numbers: { lifePath: "7", birthday: "3", personalYear: "1", personalMonth: "2", pinnacle: { stage: 1 as const, number: "5" }, challenge: "2" },
      chart: { digits: [1, 3, 7], fullArrows: [], emptyArrows: ["4-5-6" as const] },
      blockIds: ["numbers.7", "numbers.3"]
    };
    const report = {
      sections: [{ id: "you", title: "Con người bạn", body: "  Đoạn một.  ", blockIds: ["numbers.7"] }, { id: "questions", title: "Ba câu hỏi", body: "Mở đầu.", blockIds: ["numbers.7.question"] }],
      questions: [" Một? ", "Hai?", "Ba?"], language: "vi", source: "backend", promptVersion: "2026-11-28-numerology-report-v1",
      createdAt: "2026-11-28T03:00:00.000Z", nextReportAt: "2026-11-28T17:00:00.000Z"
    };

    it("posts only the payload to ai-numerology-report and maps the sections and questions", async () => {
      mockFetch.mockResolvedValueOnce(ok(report));
      await expect(requestNumerologyReport(payload, signedIn)).resolves.toEqual({
        kind: "report", nextReportAt: "2026-11-28T17:00:00.000Z",
        report: {
          sections: [{ id: "you", title: "Con người bạn", body: "Đoạn một.", blockIds: ["numbers.7"] }, { id: "questions", title: "Ba câu hỏi", body: "Mở đầu.", blockIds: ["numbers.7.question"] }],
          questions: ["Một?", "Hai?", "Ba?"], language: "vi", promptVersion: "2026-11-28-numerology-report-v1", createdAt: "2026-11-28T03:00:00.000Z"
        }
      });
      expect(String(mockFetch.mock.calls[0][0])).toBe("https://project.supabase.co/functions/v1/ai-numerology-report");
      expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual(payload);
    });

    it("maps pauses, Premium, limits, blocks, malformed answers and failures without inventing text", async () => {
      const cases: Array<[unknown, number, unknown]> = [
        [{ error: "feature_paused" }, 503, { kind: "soon" }],
        [{ error: "content_not_approved" }, 503, { kind: "soon" }],
        [{ error: "premium_required" }, 403, { kind: "premium_required" }],
        [{ error: "daily_limit_reached", nextReportAt: "2026-11-28T17:00:00.000Z" }, 429, { kind: "daily_limit", nextReportAt: "2026-11-28T17:00:00.000Z" }],
        [{ error: "report_unavailable", moderationStatus: "blocked", retryable: false }, 503, { kind: "blocked" }],
        [{ error: "report_unavailable", retryable: true }, 503, { kind: "unavailable", reason: "busy" }],
        [{ error: "invalid_jwt" }, 401, { kind: "unavailable", reason: "auth" }],
        [{ ...report, sections: [] }, 200, { kind: "unavailable", reason: "busy" }],
        [{ ...report, sections: [{ id: "horoscope", title: "x", body: "y", blockIds: [] }] }, 200, { kind: "unavailable", reason: "busy" }],
        [{ ...report, questions: [] }, 200, { kind: "unavailable", reason: "busy" }]
      ];
      for (const [body, status, expected] of cases) {
        mockFetch.mockResolvedValueOnce(ok(body, status));
        await expect(requestNumerologyReport(payload, signedIn)).resolves.toEqual(expected);
      }
      mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
      await expect(requestNumerologyReport(payload, signedIn)).resolves.toEqual({ kind: "unavailable", reason: "offline" });
      mockFetch.mockClear();
      await expect(requestNumerologyReport(payload, backendOptions)).resolves.toEqual({ kind: "unavailable", reason: "auth" });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("generateDailyZodiacPulse", () => {
    const input: DailyZodiacPulseInput = {
      language: "en",
      dateKey: "2023-01-01",
      profile: { nickname: "Test", goals: ["self"], tone: "gentle" },
      birthProfile: { birthDate: "2000-01-01", birthTimeKnown: false },
      recentEntries: []
    };
    const fallback = jest.fn().mockReturnValue({
      id: "fallback",
      dateKey: "2023-01-01",
      sign: "Capricorn",
      profileCompleteness: "birth_time_missing",
      mood: "softening",
      title: "Capricorn today",
      reflection: "fallback",
      microAction: "fallback",
      caveats: ["fallback"],
      source: "local",
      hasBirthDate: true,
      calculationVersion: "local"
    });

    it("maps daily zodiac pulse to the Supabase Edge Function name", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "zodiac-2023-01-01-capricorn",
          dateKey: "2023-01-01",
          sign: "Capricorn",
          profileCompleteness: "birth_time_missing",
          mood: "softening",
          title: "Capricorn today",
          reflection: "success",
          microAction: "hold as a question",
          caveats: ["not a certain prediction"],
          source: "backend",
          hasBirthDate: true,
          calculationVersion: "daily_zodiac_pulse_mvp_v1"
        })
      });

      const result = await generateDailyZodiacPulse(input, fallback, { baseUrl: "https://project.supabase.co/functions/v1", timeoutMs: 1000 });
      expect(result.source).toBe("backend");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://project.supabase.co/functions/v1/ai-daily-zodiac-pulse",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("returns fallback on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));
      const result = await generateDailyZodiacPulse(input, fallback, backendOptions);
      expect(result).toEqual(expect.objectContaining({ id: "fallback", source: "local" }));
    });
  });

  describe("syncUserProfile", () => {
    const input: ProfileSyncInput = {
      profile: { id: "1", nickname: "Test", goals: [], tone: "neutral", language: "en", isBirthTimeKnown: false },
      birthProfile: { birthTimeKnown: false }
    };
    const fallback = jest.fn().mockReturnValue({ status: "local_fallback" });

    it("returns parsed json on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "synced", remoteId: "123" })
      });

      const result = await syncUserProfile(input, fallback, backendOptions);
      expect(result).toEqual({ status: "synced", remoteId: "123" });
    });

    it("returns fallback on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));
      const result = await syncUserProfile(input, fallback, backendOptions);
      expect(result).toEqual({ status: "local_fallback" });
    });
  });

  describe("syncJournalEntry", () => {
    const input: JournalSyncInput = {
      localId: "local-1",
      title: "Test",
      body: "Test body",
      mood: "good",
      createdAt: "2023-01-01T00:00:00Z"
    };
    const fallback = jest.fn().mockReturnValue({ status: "local_fallback" });

    it("returns parsed json on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "synced", remoteId: "456" })
      });

      const result = await syncJournalEntry(input, fallback, backendOptions);
      expect(result).toEqual({ status: "synced", remoteId: "456" });
    });

    it("returns fallback on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));
      const result = await syncJournalEntry(input, fallback, backendOptions);
      expect(result).toEqual({ status: "local_fallback" });
    });
  });

  describe("notifications", () => {
    const registerInput: NotificationRegisterInput = {
      deviceId: "device-1",
      platform: "ios",
      permissionStatus: "granted",
      expoPushToken: "ExponentPushToken[test]",
      locale: "en",
      updatedAt: "2026-07-10T00:00:00Z",
      enabledTypes: ["daily_insight_ready"]
    };
    const preferencesInput: NotificationPreferencesInput = {
      locale: "en",
      preferences: [
        {
          id: "push:daily_insight_ready",
          channel: "push",
          type: "daily_insight_ready",
          enabled: true,
          updatedAt: "2026-07-10T00:00:00Z"
        }
      ]
    };
    const inboxInput: NotificationInboxInput = {
      notifications: [
        {
          id: "local-notification-1",
          type: "admin_test",
          title: { en: "Test" },
          body: { en: "Safe test" },
          channel: "in_app",
          status: "unread",
          createdAt: "2026-07-10T00:00:00Z"
        }
      ]
    };
    const testInput: NotificationTestInput = { locale: "en", targetRoute: "profile" };

    it("maps notification registration to the Supabase Edge Function name", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "synced", remoteId: "token-1" }) });
      const result = await registerNotificationDevice(registerInput, () => ({ status: "local_fallback" }), { baseUrl: "https://project.supabase.co/functions/v1", timeoutMs: 1000 });
      expect(result).toEqual({ status: "synced", remoteId: "token-1" });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://project.supabase.co/functions/v1/notification-register-device",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("syncs notification preferences and falls back on network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));
      const fallback = jest.fn().mockReturnValue({ status: "local_fallback", preferences: preferencesInput.preferences });
      const result = await syncNotificationPreferences(preferencesInput, fallback, backendOptions);
      expect(result).toEqual({ status: "local_fallback", preferences: preferencesInput.preferences });
    });

    it("maps notification inbox sync to the Supabase Edge Function name", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "synced", notifications: inboxInput.notifications }) });
      await syncNotificationInbox(inboxInput, () => ({ status: "local_fallback", notifications: [] }), { baseUrl: "https://project.supabase.co/functions/v1", timeoutMs: 1000 });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://project.supabase.co/functions/v1/notification-inbox",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("maps admin test notifications to the Supabase Edge Function name", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "synced", remoteId: "notification-1" }) });
      await sendNotificationTest(testInput, () => ({ status: "local_fallback" }), { baseUrl: "https://project.supabase.co/functions/v1", timeoutMs: 1000 });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://project.supabase.co/functions/v1/notification-send-test",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
