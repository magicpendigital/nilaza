import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, language, profileGoals } = await req.json()
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Example logic: Fetch prompt version, request LLM, store result
    // For MVP, we mock the generated pulse
    const insightText = language === 'vi' 
      ? 'Hôm nay mời bạn lắng nghe trước khi quyết định. Một khoảng dừng nhỏ có thể cho thấy đâu là mong muốn thật của mình.'
      : 'Today asks you to listen before you decide. A small pause may reveal which desire is truly yours.'

    const dailyPulse = {
      dateKey: new Date().toISOString().split('T')[0],
      title: language === 'vi' ? 'Dẫn hướng hôm nay' : 'Daily guidance',
      text: insightText,
      reflectionPrompt: language === 'vi' ? 'Điều gì đang làm bạn phân tâm?' : 'What is distracting you?',
      source: 'backend',
      rerollCount: 0,
      createdAt: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(dailyPulse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
