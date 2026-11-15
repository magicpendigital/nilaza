import {
  BackendLimitError,
  BackendUnavailableError,
  generatePersonaReply,
  generateOracleTurn,
  generateAiCouncilTurn,
  generateTarotReading,
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
