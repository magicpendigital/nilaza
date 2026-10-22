import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405
    });
  }

  try {
    const input = await req.json();
    const language = input.language ?? "vi";
    const selectedPersonas = input.selectedPersonas ?? [
      { id: "figure-aristotle", slug: "aristotle", name: { vi: "Aristotle", en: "Aristotle" } },
      { id: "figure-confucius", slug: "confucius", name: { vi: "Khổng Tử", en: "Confucius" } },
      { id: "book-calm-living-mentor", slug: "calm-living-mentor", name: { vi: "Guide Sống Bình Tâm", en: "Calm Living Mentor" } }
    ];
    const userMessage = input.userMessage ?? input.message ?? "";

    const turns = selectedPersonas.slice(0, 3).map((persona: { id: string; slug: string; name?: { vi?: string; en?: string } }, index: number) => {
      const name = (language === "vi" ? persona.name?.vi : persona.name?.en) ?? persona.name?.en ?? persona.slug;
      const lens = language === "vi" ? "phản chiếu an toàn" : "safe reflection";
      return {
        personaId: persona.id,
        text:
          language === "vi"
            ? `${name}: hãy nhìn câu hỏi "${userMessage}" như một tình huống cần thêm dữ kiện, không phải một định mệnh đã cố định.`
            : `${name}: treat "${userMessage}" as a situation that needs more information, not a fixed destiny.`,
        lens,
        promptVersionId: "ai_council_system",
        order: index
      };
    });

    return new Response(
      JSON.stringify({
        turns,
        promptVersionId: "ai_council_system",
        moderationStatus: "fallback"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    });
  }
});
