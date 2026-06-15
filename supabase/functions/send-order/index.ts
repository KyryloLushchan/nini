// Supabase Edge Function: send-order
// Принимает { text } от сайта и отправляет его в Telegram.
// Токен бота и chat_id берутся ИЗ СЕКРЕТОВ (в коде их нет).
//
// Деплой:
//   supabase secrets set TELEGRAM_BOT_TOKEN=<НОВЫЙ_ТОКЕН> TELEGRAM_CHAT_ID=-1003907561257
//   supabase functions deploy send-order
//
// Проверка:
//   curl -i -X POST https://<project>.supabase.co/functions/v1/send-order \
//     -H "Content-Type: application/json" \
//     -H "Authorization: Bearer <ANON_KEY>" \
//     -H "apikey: <ANON_KEY>" \
//     -d '{"text":"test"}'

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  // preflight из браузера
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text) return json({ ok: false, error: "no text" }, 400);

    const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!TOKEN || !CHAT_ID) {
      return json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID secrets" }, 500);
    }

    const tg = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });
    const data = await tg.json();

    // Прокидываем ответ Telegram наружу, чтобы было видно реальную ошибку
    return json({ ok: data.ok === true, telegram: data }, data.ok ? 200 : 500);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
