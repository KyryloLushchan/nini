// Supabase Edge Function: parse-invoice
// ------------------------------------------------------------
// Принимает фото накладной (base64) и через OpenAI Vision (gpt-4o-mini)
// извлекает позиции. Возвращает { ok:true, items:[...] }.
//
// Секрет ключа OpenAI: GPT_API.
//
// Деплой (вызывается только из защищённой /admin.html, JWT не нужен):
//   supabase functions deploy parse-invoice --no-verify-jwt
//
// Тело запроса: { image_base64: string }  (data-URI или чистый base64)

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

const SYSTEM = `You extract line items from a Vietnamese supplier invoice.
Return ONLY valid JSON in this format:
{ items: [{ name: string, qty: number, unit: string, price_per_unit: number, total: number }] }
Rules:
- name: product name translated to English (short, e.g. "Salmon", "Cucumber", "Rice")
- unit: exactly one of 'kg', 'g', 'bag', 'pack', 'bottle', 'box', 'carton' (translate Vietnamese units: túi/gói->bag/pack, chai->bottle, hộp->box, thùng->carton)
- qty, price_per_unit, total: numbers, no formatting
- Skip the total row of the invoice.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  try {
    const KEY = Deno.env.get("GPT_API");
    if (!KEY) return json({ ok: false, error: "no api key" }, 500);

    const body = await req.json().catch(() => null);
    const image_base64 = body?.image_base64;
    if (!image_base64 || typeof image_base64 !== "string") {
      return json({ ok: false, error: "no image" }, 400);
    }
    // Принимаем и data-URI, и «голый» base64
    const dataUri = image_base64.startsWith("data:")
      ? image_base64
      : `data:image/jpeg;base64,${image_base64}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUri } },
              { type: "text", text: "Extract items." },
            ],
          },
        ],
      }),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return json({ ok: false, error: `openai ${r.status}: ${t.slice(0, 300)}` }, 502);
    }

    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return json({ ok: false, error: "bad json from model" }, 502);
    }

    return json({ ok: true, ...(parsed as Record<string, unknown>) });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
