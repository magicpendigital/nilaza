import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type CouncilTemplateInput = {
  id?: string;
  status?: string;
  name?: Record<string, string>;
  useCase?: Record<string, string>;
  situationTags?: string[];
  meetingMode?: string;
  maxGuides?: number;
  synthesisMode?: string;
  roster?: Array<Record<string, unknown>>;
  flow?: Record<string, string[]>;
  outputContract?: string[];
};

type CouncilConfigInput = {
  version?: string;
  status?: "draft" | "review" | "active" | "archived";
  defaultTemplateId?: string;
  maxGuidesPerTurn?: number;
  maxTranscriptTurns?: number;
  contextPolicy?: Record<string, unknown>;
  turnPolicy?: Record<string, unknown>;
  safetyBoundaries?: Record<string, unknown>;
  runtimeConfig?: Record<string, unknown>;
  templates?: CouncilTemplateInput[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

function requiredString(value: string | undefined, field: string) {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  return trimmed;
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number) {
  const candidate = Number.isInteger(value) ? Number(value) : fallback;
  return Math.max(min, Math.min(candidate, max));
}

function normalizeTemplate(template: CouncilTemplateInput) {
  return {
    template_key: requiredString(template.id, "template.id"),
    status: template.status ?? "draft_review",
    name: template.name ?? {},
    use_case: template.useCase ?? {},
    situation_tags: template.situationTags ?? [],
    meeting_mode: requiredString(template.meetingMode, "template.meetingMode"),
    max_guides: boundedInteger(template.maxGuides, 3, 2, 4),
    synthesis_mode: requiredString(template.synthesisMode, "template.synthesisMode"),
    roster: template.roster ?? [],
    flow: template.flow ?? {},
    output_contract: template.outputContract ?? [],
    updated_at: new Date().toISOString()
  };
}

async function createSupabase(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
    return { error: jsonResponse({ error: "Supabase env and Authorization bearer token are required" }, 503) };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return { error: jsonResponse({ error: "Unauthorized" }, 401) };

  const requiredCapability = req.method === "GET" ? "ai.read" : "ai.manage";
  const { data: isAdmin, error: adminError } = await supabase.rpc("has_admin_capability", { capability: requiredCapability });
  if (adminError || isAdmin !== true) return { error: jsonResponse({ error: "Admin role required" }, 403) };

  return { supabase, userId: userData.user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST"].includes(req.method)) return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const context = await createSupabase(req);
    if (context.error) return context.error;
    const { supabase, userId } = context;

    if (req.method === "GET") {
      const { data: configs, error: configError } = await supabase
        .from("ai_council_config_versions")
        .select("*")
        .in("status", ["active", "review", "draft"])
        .order("created_at", { ascending: false })
        .limit(5);
      if (configError) return jsonResponse({ error: configError.message }, 403);

      const activeConfig = configs?.find((config: { status: string }) => config.status === "active") ?? configs?.[0] ?? null;
      const { data: templates, error: templateError } = activeConfig
        ? await supabase
            .from("ai_council_template_versions")
            .select("*")
            .eq("config_version_id", activeConfig.id)
            .order("created_at", { ascending: true })
        : { data: [], error: null };
      if (templateError) return jsonResponse({ error: templateError.message }, 403);

      return jsonResponse({
        status: "ok",
        activeConfig,
        templates: templates ?? [],
        configCount: configs?.length ?? 0
      });
    }

    const input = (await req.json()) as CouncilConfigInput;
    const version = requiredString(input.version, "version");
    const templates = input.templates ?? [];
    if (!templates.length) return jsonResponse({ error: "templates are required" }, 400);
    const requestedStatus = input.status ?? "draft";

    const configPayload = {
      version,
      status: requestedStatus === "active" ? "review" : requestedStatus,
      default_template_key: requiredString(input.defaultTemplateId ?? templates[0]?.id, "defaultTemplateId"),
      max_guides_per_turn: boundedInteger(input.maxGuidesPerTurn, 3, 2, 4),
      max_transcript_turns: boundedInteger(input.maxTranscriptTurns, 32, 8, 64),
      context_policy: input.contextPolicy ?? {},
      turn_policy: input.turnPolicy ?? {},
      safety_boundaries: input.safetyBoundaries ?? {},
      runtime_config: input.runtimeConfig ?? {},
      created_by: userId,
      published_by: null,
      published_at: null,
      updated_at: new Date().toISOString()
    };

    const { data: config, error: configError } = await supabase
      .from("ai_council_config_versions")
      .insert(configPayload)
      .select("id, version, status")
      .single();
    if (configError) return jsonResponse({ error: configError.message }, 403);

    const templateRows = templates.map((template) => ({
      config_version_id: config.id,
      ...normalizeTemplate(template)
    }));
    const { error: templateError } = await supabase.from("ai_council_template_versions").insert(templateRows);
    if (templateError) return jsonResponse({ error: templateError.message }, 403);

    if (requestedStatus === "active") {
      const now = new Date().toISOString();
      const { error: archiveError } = await supabase
        .from("ai_council_config_versions")
        .update({ status: "archived", updated_at: now })
        .eq("status", "active")
        .neq("id", config.id);
      if (archiveError) return jsonResponse({ error: archiveError.message }, 403);

      const { error: promoteError } = await supabase
        .from("ai_council_config_versions")
        .update({ status: "active", published_by: userId, published_at: now, updated_at: now })
        .eq("id", config.id);
      if (promoteError) return jsonResponse({ error: promoteError.message }, 403);
      config.status = "active";
    }

    await supabase.from("usage_events").insert({
      user_id: userId,
      event_name: "admin_ai_council_config_published",
      feature: "ai_council",
      metadata: {
        version,
        status: requestedStatus,
        templateCount: templateRows.length
      }
    });

    return jsonResponse({
      status: "published",
      configId: config.id,
      version: config.version,
      configStatus: config.status,
      templateCount: templateRows.length
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
