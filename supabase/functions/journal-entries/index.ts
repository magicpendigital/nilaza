import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders, createJournalHandler } from "./handler.ts";

const handleJournalRequest = createJournalHandler((req) => {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return {
    async authenticate(token) {
      const { data, error } = await supabase.auth.getUser(token);
      return error ? null : data?.user?.id ?? null;
    },
    async upsert(userId, input) {
      const { data, error } = await supabase.from("journal_entries").upsert({
        user_id: userId, local_id: input.localId, source_type: input.sourceType,
        source_id: input.sourceId ?? null, title: input.title, summary: input.summary,
        mood: input.mood || null, user_note: input.userNote || null, source_snapshot: input.sourceSnapshot,
        visibility: "private", created_at: input.createdAt, updated_at: new Date().toISOString()
        // Never clear deleted_at: late writes must not resurrect a tombstone.
      }, { onConflict: "user_id,local_id" }).select("id,deleted_at").single();
      if (error || !data) throw new Error("Journal write failed");
      return { id: data.id, deletedAt: data.deleted_at };
    },
    async remove(userId, localId) {
      const timestamp = new Date().toISOString();
      // A delete arriving before its queued save still creates a tombstone.
      const { error } = await supabase.from("journal_entries").upsert({
        user_id: userId, local_id: localId, source_type: "manual", source_id: null,
        title: "Deleted entry", summary: "", mood: null, user_note: null, source_snapshot: {},
        visibility: "private", deleted_at: timestamp, created_at: timestamp, updated_at: timestamp
      }, { onConflict: "user_id,local_id" });
      if (error) throw new Error("Journal delete failed");
    }
  };
});

serve(async (req) => {
  const response = await handleJournalRequest(req);
  // Apply the canonical CORS policy at the HTTP boundary for every response.
  response.headers.set("Access-Control-Allow-Origin", corsHeaders["Access-Control-Allow-Origin"]);
  return response;
});
