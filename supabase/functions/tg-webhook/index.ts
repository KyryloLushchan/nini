// Supabase Edge Function: tg-webhook
// Принимает апдейты Telegram (вебхук) и отвечает на /start приветствием.
// Токен бота берётся из секрета TELEGRAM_BOT_TOKEN.
// Доступ защищён секретным заголовком X-Telegram-Bot-Api-Secret-Token (секрет WEBHOOK_SECRET).
//
// Деплой (функция должна быть публичной — Telegram не шлёт JWT):
//   supabase functions deploy tg-webhook --no-verify-jwt
//
// Привязка вебхука:
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<project>.supabase.co/functions/v1/tg-webhook&secret_token=<WEBHOOK_SECRET>"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";
const SITE = "https://ninisushi.com";

const GREETING =
  "🍣 Вітаємо в NiNi Sushi!\n\n" +
  "Свіжі суші та роли з доставкою 🥢\n" +
  "🕘 Години роботи: 16:00 – 20:00\n\n" +
  "Натисніть кнопку нижче, щоб переглянути меню та оформити замовлення 👇";

async function tg(method: string, body: unknown) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

serve(async (req) => {
  // Проверка секрета от Telegram
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (got !== WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });
  }

  try {
    const update = await req.json();
    const msg = update.message ?? update.edited_message;
    const text: string = msg?.text ?? "";
    const chatId = msg?.chat?.id;

    if (chatId && text.startsWith("/start")) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: GREETING,
        reply_markup: {
          inline_keyboard: [[{ text: "🛒 Відкрити меню", web_app: { url: SITE } }]],
        },
      });
    }

    // Telegram достаточно ответа 200
    return new Response("ok");
  } catch (_e) {
    return new Response("ok"); // не возвращаем ошибку, чтобы Telegram не зацикливал ретраи
  }
});
