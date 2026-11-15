import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outPath = path.join(root, "supabase", "seed.generated.sql");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function sqlTextArray(values) {
  if (!Array.isArray(values) || values.length === 0) return "'{}'::text[]";
  return `array[${values.map(sqlString).join(", ")}]::text[]`;
}

function normalizePromptFeature(feature) {
  if (feature === "tarot") return "tarot_reading";
  if (feature === "astrology") return "astrology_report";
  return feature;
}

function normalizePersonaType(type) {
  if (type === "archetype_guide") return "archetype";
  return type;
}

function localized(value, locale, fallback = "") {
  return value?.[locale] ?? value?.en ?? value?.vi ?? fallback;
}

function personaSkillPrompt(persona, locale) {
  const isVi = locale === "vi";
  const name = localized(persona.name, locale, persona.slug);
  const role = localized(persona.displayRole ?? persona.sourceInspiration, locale, "");
  const description = localized(persona.shortDescription, locale, "");
  const source = localized(persona.sourceInspiration, locale, "");
  const transparency = localized(persona.transparencyNote, locale, "");
  const prompts = persona.suggestedPrompts?.[locale] ?? persona.suggestedPrompts?.en ?? [];
  const tone = (persona.tone ?? []).join(", ");
  const themes = (persona.themes ?? []).join(", ");

  if (isVi) {
    return [
      `Persona skill: ${name}`,
      "Chỉ dùng skill này bên trong system prompt chung của feature persona_chat.",
      `Vai trò: ${role || "AI guide phản chiếu"}.`,
      `Mô tả: ${description}`,
      source ? `Nguồn cảm hứng: ${source}` : "",
      `Giọng điệu: ${tone || "ấm áp, ngắn gọn, phản chiếu"}.`,
      `Chủ đề mạnh: ${themes || "tự hiểu mình, lựa chọn, cảm xúc"}.`,
      `Ranh giới minh bạch: ${transparency}`,
      "Hành vi trả lời: giữ câu trả lời súc tích; soi chiếu vấn đề qua lăng kính riêng của persona; nêu một bước nhỏ an toàn hoặc một câu hỏi phản chiếu.",
      "Tránh: tự nhận là người thật/tác giả/sách gốc/đại diện chính thức; trích dẫn văn bản có bản quyền khi chưa được cấp phép; đưa lời khuyên y tế, pháp lý, tài chính hoặc chẩn đoán sức khỏe tinh thần.",
      prompts.length ? `Gợi ý follow-up phù hợp: ${prompts.join(" | ")}` : ""
    ].filter(Boolean).join("\n");
  }

  return [
    `Persona skill: ${name}`,
    "Use this skill only inside the shared persona_chat feature system prompt.",
    `Role: ${role || "Reflective AI guide"}.`,
    `Description: ${description}`,
    source ? `Source inspiration: ${source}` : "",
    `Voice: ${tone || "warm, concise, reflective"}.`,
    `Strong themes: ${themes || "self-understanding, choices, emotion"}.`,
    `Transparency boundary: ${transparency}`,
    "Response behavior: keep replies concise; interpret the situation through this persona's distinct lens; end with one safe small step or one reflective question.",
    "Avoid: claiming to be the real person/author/original book/official representative; quoting copyrighted text without permission; giving medical, legal, financial, or mental-health diagnosis/advice.",
    prompts.length ? `Useful follow-up prompts: ${prompts.join(" | ")}` : ""
  ].filter(Boolean).join("\n");
}

const figures = readJson("packages/content/data/personas-figures.json");
const books = readJson("packages/content/data/personas-books.json");
const archetypes = readJson("packages/content/data/personas-archetypes.json");
const allPersonas = [...figures, ...books, ...archetypes];
const decks = readJson("packages/content/data/tarot-decks.json");
const cards = readJson("packages/content/data/tarot-cards.json");
const prompts = readJson("packages/agent-config/prompt-library.json");
const aiCouncilConfig = readJson("packages/agent-config/ai-council.json");
const councilContract = readJson("packages/agent-config/council-contract.json");
const modelRoutes = readJson("packages/agent-config/model-routing.json");
const personaSkillVersion = "2026-06-28-persona-skill-v1";

function responseSchemaForRoute(route) {
  if (route.responseSchemaRef === `${councilContract.id}.responseSchema`) return councilContract.responseSchema;
  return route.responseSchema;
}

const lines = [
  "-- Nilaza generated Supabase seed.",
  "-- Generated from packages/content/data and packages/agent-config.",
  "-- Recreate with: npm run supabase:seed:generate",
  "begin;",
  ""
];

lines.push("-- Personas");
for (const persona of allPersonas) {
  lines.push(
    `insert into public.personas (slug, type, status, access_tier, default_locale, name, short_description, transparency_note, themes, tone, updated_at) values (` +
      [
        sqlString(persona.slug),
        sqlString(normalizePersonaType(persona.type)),
        sqlString(persona.status ?? "active"),
        sqlString(persona.accessTier ?? "free"),
        sqlString("vi"),
        sqlJson(persona.name),
        sqlJson(persona.shortDescription),
        sqlJson(persona.transparencyNote),
        sqlTextArray(persona.themes ?? []),
        sqlTextArray(persona.tone ?? []),
        "now()"
      ].join(", ") +
      `) on conflict (slug) do update set type = excluded.type, status = excluded.status, access_tier = excluded.access_tier, name = excluded.name, short_description = excluded.short_description, transparency_note = excluded.transparency_note, themes = excluded.themes, tone = excluded.tone, updated_at = now();`
  );
}

lines.push("", "-- Tarot decks");
for (const deck of decks) {
  lines.push(
    `insert into public.tarot_decks (slug, status, access_tier, default_locale, name, short_description, vibe, theme, accent_color, visual_direction, reading_style, updated_at) values (` +
      [
        sqlString(deck.slug),
        sqlString(deck.status ?? "active"),
        sqlString(deck.accessTier ?? "free"),
        sqlString("vi"),
        sqlJson(deck.name),
        sqlJson(deck.shortDescription),
        sqlJson(deck.vibe),
        sqlTextArray(deck.theme ?? []),
        sqlString(deck.accentColor ?? null),
        sqlJson(deck.visualDirection ?? {}),
        sqlJson(deck.readingStyle ?? {}),
        "now()"
      ].join(", ") +
      `) on conflict (slug) do update set status = excluded.status, access_tier = excluded.access_tier, name = excluded.name, short_description = excluded.short_description, vibe = excluded.vibe, theme = excluded.theme, accent_color = excluded.accent_color, visual_direction = excluded.visual_direction, reading_style = excluded.reading_style, updated_at = now();`
  );
}

lines.push("", "-- Tarot cards");
for (const card of cards) {
  lines.push(
    `insert into public.tarot_cards (canonical_id, arcana, number, suit, rank, element, name, keywords, intro, personality_portrait, upright_meaning, reversed_meaning, reflection_question, updated_at) values (` +
      [
        sqlString(card.id),
        sqlString(card.arcana),
        String(card.number ?? 0),
        sqlString(card.suit ?? null),
        sqlString(card.rank ?? null),
        sqlString(card.element ?? null),
        sqlJson(card.name),
        sqlJson(card.keywords),
        sqlJson(card.intro ?? {}),
        sqlJson(card.personalityPortrait ?? {}),
        sqlJson(card.uprightMeaning),
        sqlJson(card.reversedMeaning),
        sqlJson(card.reflectionQuestion),
        "now()"
      ].join(", ") +
      `) on conflict (canonical_id) do update set arcana = excluded.arcana, number = excluded.number, suit = excluded.suit, rank = excluded.rank, element = excluded.element, name = excluded.name, keywords = excluded.keywords, intro = excluded.intro, personality_portrait = excluded.personality_portrait, upright_meaning = excluded.upright_meaning, reversed_meaning = excluded.reversed_meaning, reflection_question = excluded.reflection_question, updated_at = now();`
  );
}

// Admin A5 (migration 20261113095000, review AI-04): one active row per (feature, owner, locale). The first active
// library entry of a feature is the runtime prompt; a later active entry of the same feature (context_handoff_system
// shares persona_chat) is stored archived. Before an active row is inserted, the previous active row of the same
// prompt is archived, so re-seeding restores the canonical text without breaking the unique index.
const seededActiveFeatures = new Set();
lines.push("", "-- Prompt versions");
for (const prompt of prompts) {
  const feature = normalizePromptFeature(prompt.feature);
  const firstActive = prompt.status === "active" && !seededActiveFeatures.has(feature);
  if (firstActive) seededActiveFeatures.add(feature);
  const seedStatus = prompt.status === "active" && !firstActive ? "archived" : (prompt.status ?? "draft");
  for (const locale of ["vi", "en"]) {
    const promptText = prompt.prompt?.[locale];
    if (!promptText) continue;
    lines.push(
      `delete from public.prompt_versions where feature = ${sqlString(feature)} and owner_type = 'global' and owner_id is null and version = ${sqlString(prompt.version)} and locale = ${sqlString(locale)};`
    );
    if (seedStatus === "active") {
      lines.push(
        `update public.prompt_versions set status = 'archived', updated_at = now() where feature = ${sqlString(feature)} and owner_type = 'global' and owner_id is null and locale = ${sqlString(locale)} and status = 'active';`
      );
    }
    lines.push(
      `insert into public.prompt_versions (feature, owner_type, owner_id, version, status, locale, prompt_text, safety_notes, published_at, updated_at) values (` +
        [
          sqlString(feature),
          sqlString("global"),
          "null",
          sqlString(prompt.version),
          sqlString(seedStatus),
          sqlString(locale),
          sqlString(promptText),
          sqlString(`reviewers: ${(prompt.approvalRequired ?? []).join(", ")}`),
          seedStatus === "active" ? "now()" : "null",
          "now()"
        ].join(", ") +
        `);`
    );
  }
}

lines.push("", "-- Persona chat skill prompt versions");
for (const persona of allPersonas) {
  for (const locale of ["vi", "en"]) {
    const promptText = personaSkillPrompt(persona, locale);
    lines.push(
      `delete from public.prompt_versions where feature = 'persona_chat' and owner_type = 'persona' and owner_id = (select id from public.personas where slug = ${sqlString(persona.slug)}) and version = ${sqlString(personaSkillVersion)} and locale = ${sqlString(locale)};`
    );
    lines.push(
      `update public.prompt_versions set status = 'archived', updated_at = now() where feature = 'persona_chat' and owner_type = 'persona' and owner_id = (select id from public.personas where slug = ${sqlString(persona.slug)}) and locale = ${sqlString(locale)} and status = 'active';`
    );
    lines.push(
      `insert into public.prompt_versions (feature, owner_type, owner_id, version, status, locale, prompt_text, safety_notes, published_at, updated_at) values (` +
        [
          sqlString("persona_chat"),
          sqlString("persona"),
          `(select id from public.personas where slug = ${sqlString(persona.slug)})`,
          sqlString(personaSkillVersion),
          sqlString("active"),
          sqlString(locale),
          sqlString(promptText),
          sqlString("persona_skill; inspired-by transparency; no copyrighted text; no regulated advice"),
          "now()",
          "now()"
        ].join(", ") +
        `);`
    );
  }
  lines.push(
    `update public.personas set active_prompt_version_id = (select id from public.prompt_versions where feature = 'persona_chat' and owner_type = 'persona' and owner_id = public.personas.id and version = ${sqlString(personaSkillVersion)} and locale = 'vi' limit 1), updated_at = now() where slug = ${sqlString(persona.slug)};`
  );
}

lines.push("", "-- AI Council configuration");
lines.push(
  `insert into public.ai_council_config_versions (version, status, default_template_key, max_guides_per_turn, max_transcript_turns, context_policy, turn_policy, safety_boundaries, runtime_config, published_at, updated_at) values (` +
    [
      sqlString(aiCouncilConfig.configVersion),
      sqlString(aiCouncilConfig.status === "active" ? "active" : "draft"),
      sqlString(aiCouncilConfig.defaultTemplateId),
      String(aiCouncilConfig.maxGuidesPerTurn),
      String(aiCouncilConfig.maxTranscriptTurns),
      sqlJson(aiCouncilConfig.contextPolicy ?? {}),
      sqlJson(aiCouncilConfig.turnPolicy ?? {}),
      sqlJson(aiCouncilConfig.safetyBoundaries ?? {}),
      sqlJson({
        id: aiCouncilConfig.id,
        contract: councilContract,
        defaultPersonaSlugs: aiCouncilConfig.defaultPersonaSlugs,
        fallbackPersonaSlugs: aiCouncilConfig.fallbackPersonaSlugs,
        allowSingleGuideFollowup: aiCouncilConfig.allowSingleGuideFollowup,
        journalSaveEnabled: aiCouncilConfig.journalSaveEnabled,
        emptyState: aiCouncilConfig.emptyState
      }),
      aiCouncilConfig.status === "active" ? "now()" : "null",
      "now()"
    ].join(", ") +
    `) on conflict (version) do update set status = excluded.status, default_template_key = excluded.default_template_key, max_guides_per_turn = excluded.max_guides_per_turn, max_transcript_turns = excluded.max_transcript_turns, context_policy = excluded.context_policy, turn_policy = excluded.turn_policy, safety_boundaries = excluded.safety_boundaries, runtime_config = excluded.runtime_config, published_at = excluded.published_at, updated_at = now();`
);
lines.push(`delete from public.ai_council_template_versions where config_version_id = (select id from public.ai_council_config_versions where version = ${sqlString(aiCouncilConfig.configVersion)});`);
for (const template of aiCouncilConfig.councilTemplates ?? []) {
  lines.push(
    `insert into public.ai_council_template_versions (config_version_id, template_key, status, name, use_case, situation_tags, meeting_mode, max_guides, synthesis_mode, roster, flow, output_contract, updated_at) values (` +
      [
        `(select id from public.ai_council_config_versions where version = ${sqlString(aiCouncilConfig.configVersion)})`,
        sqlString(template.id),
        sqlString(template.status ?? "draft_review"),
        sqlJson(template.name),
        sqlJson(template.useCase),
        sqlTextArray(template.situationTags ?? []),
        sqlString(template.meetingMode),
        String(template.maxGuides),
        sqlString(template.synthesisMode),
        sqlJson(template.roster ?? []),
        sqlJson(template.flow ?? {}),
        sqlTextArray(template.outputContract ?? []),
        "now()"
      ].join(", ") +
      `);`
  );
}

lines.push("", "-- Model route versions");
for (const route of modelRoutes) {
  lines.push(
    `insert into public.model_route_versions (feature, version, status, primary_provider, primary_model, fallback_provider, fallback_model, temperature, max_output_tokens, response_schema, fallback_when, safety_policy, published_at, updated_at) values (` +
      [
        sqlString(route.feature),
        sqlString(route.version),
        sqlString(route.status ?? "draft"),
        sqlString(route.primaryProvider),
        sqlString(route.primaryModel),
        sqlString(route.fallbackProvider ?? null),
        sqlString(route.fallbackModel ?? null),
        String(route.temperature ?? 0.7),
        String(route.maxOutputTokens ?? 600),
        sqlString(responseSchemaForRoute(route)),
        sqlTextArray(route.fallbackWhen ?? []),
        sqlJson(route.safetyPolicy ?? {}),
        route.status === "active" || route.status === "experimental" ? "now()" : "null",
        "now()"
      ].join(", ") +
      `) on conflict (feature, version) do update set status = excluded.status, primary_provider = excluded.primary_provider, primary_model = excluded.primary_model, fallback_provider = excluded.fallback_provider, fallback_model = excluded.fallback_model, temperature = excluded.temperature, max_output_tokens = excluded.max_output_tokens, response_schema = excluded.response_schema, fallback_when = excluded.fallback_when, safety_policy = excluded.safety_policy, published_at = excluded.published_at, updated_at = now();`
  );
}

lines.push("", "commit;", "");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Generated ${path.relative(root, outPath)} with ${lines.length} SQL lines.`);
