// Supabase Edge Function: grab-bot
// ------------------------------------------------------------
// Отдельный Telegram-бот для РУЧНОГО ввода заказов GrabFood менеджером.
// Работает только в личном чате менеджера с ботом (не в группах):
//   /start или /grab -> инлайн-меню активных блюд (англ. названия, по 2 в ряд);
//   тап по блюду     -> +1 в корзину (grab_cart), сообщение перерисовывается;
//   «🧹 Очистить»     -> очистить корзину;
//   «📝 Комментарий»  -> просим текст, следующее сообщение сохраняется как комментарий;
//   «✅ Отправить»    -> INSERT orders (customer_name:'Grab', status:'new',
//       total уже с учётом Grab −10%) и сообщение с кнопками ✅/❌ (ok:<id>/no:<id>)
//       в группу «Orders» — ЧЕРЕЗ ОСНОВНОЙ бот (grab-bot не состоит в группах).
//       Автоодобрения НЕТ: списание склада, касса и дубль на кухню происходят
//       только когда кто-то нажмёт «✅ Одобрить» — это уже существующая логика
//       approve в tg-webhook, её не трогаем.
//
// Секреты: GRAB_BOT_TOKEN, GRAB_WEBHOOK_SECRET (свои), плюс уже существующие
// TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// send-order и tg-webhook НЕ трогаем — независимый источник заказов в ту же БД.
//
// Деплой:
//   supabase functions deploy grab-bot --no-verify-jwt
//
// Привязка вебхука (нужен GRAB_BOT_TOKEN):
//   curl "https://api.telegram.org/bot<GRAB_BOT_TOKEN>/setWebhook?url=https://<project>.supabase.co/functions/v1/grab-bot&secret_token=<GRAB_WEBHOOK_SECRET>&allowed_updates=%5B%22message%22%2C%22callback_query%22%5D"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GRAB_BOT_TOKEN = Deno.env.get("GRAB_BOT_TOKEN") || "";
const GRAB_WEBHOOK_SECRET = Deno.env.get("GRAB_WEBHOOK_SECRET") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sbHeaders = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  "Content-Type": "application/json",
};

type CartItem = { code: string; qty: number };
type Cart = { items: CartItem[]; comment: string | null };

/* Telegram API: бот менеджера (grab-bot) — меню, кнопки, ответы менеджеру */
async function tgGrab(method: string, body: unknown) {
  return fetch(`https://api.telegram.org/bot${GRAB_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* Telegram API: ОСНОВНОЙ бот — он состоит в группах Кухня/Orders, grab-bot нет */
async function tgMain(method: string, body: unknown) {
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function answer(id: string, text = "") {
  await tgGrab("answerCallbackQuery", { callback_query_id: id, text });
}

/* PostgREST helpers (service-role, RLS обходится) */
async function sbGet(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  if (!r.ok) return [];
  return await r.json().catch(() => []);
}

/* in.(...) список для PostgREST: значения в кавычках, всё урл-кодируем */
function inList(values: (string | number)[]): string {
  const body = values.map((v) => `"${String(v).replace(/"/g, "")}"`).join(",");
  return encodeURIComponent(body);
}

function fmtPrice(v: number): string {
  return v.toLocaleString("ru-RU").replace(/,/g, " ") + "₫";
}

/* ---------- Доступ: whitelist по Telegram user ID (grab_users) ---------- */
async function isAllowed(userId: number): Promise<boolean> {
  const rows = await sbGet(`grab_users?select=user_id&user_id=eq.${userId}`);
  return rows.length > 0;
}

/* ---------- Корзина менеджера (таблица grab_cart, ключ — chat/user id) ---------- */
async function loadCart(userId: number): Promise<Cart> {
  const rows = await sbGet(`grab_cart?select=items,comment&user_id=eq.${userId}`);
  const row = rows[0];
  const items: CartItem[] = Array.isArray(row?.items) ? row.items : [];
  return { items, comment: row?.comment ?? null };
}

async function saveCart(userId: number, items: CartItem[], comment: string | null) {
  await fetch(`${SUPABASE_URL}/rest/v1/grab_cart`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, items, comment, updated_at: new Date().toISOString() }),
  });
}

/* ---------- Меню / клавиатура ---------- */
async function loadDishes(): Promise<any[]> {
  return await sbGet(`dishes?select=id,code,name_en,price&active=eq.true&order=sort_order.asc,name_en.asc`);
}

function buildKeyboard(dishes: any[]) {
  const rows: any[] = [];
  for (let i = 0; i < dishes.length; i += 2) {
    const row = [{ text: dishes[i].name_en || dishes[i].code, callback_data: `g:${dishes[i].code}` }];
    if (dishes[i + 1]) {
      row.push({ text: dishes[i + 1].name_en || dishes[i + 1].code, callback_data: `g:${dishes[i + 1].code}` });
    }
    rows.push(row);
  }
  rows.push([
    { text: "🧹 Очистить", callback_data: "g:clear" },
    { text: "📝 Комментарий", callback_data: "g:note" },
    { text: "✅ Отправить", callback_data: "g:send" },
  ]);
  return { inline_keyboard: rows };
}

function cartText(cart: Cart, dishByCode: Record<string, any>): string {
  const header = "🛵 GRAB — оформление заказа";
  if (!cart.items.length) return `${header}\n\nКорзина пуста. Выберите позиции ниже.`;
  const lines = cart.items
    .map((it) => `• ${dishByCode[it.code]?.name_en || it.code} × ${it.qty}`)
    .join("\n");
  const commentLine = cart.comment ? `\n\n📝 ${cart.comment}` : "";
  return `${header}\n\n${lines}${commentLine}`;
}

async function sendMenu(chatId: number) {
  const dishes = await loadDishes();
  const cart = await loadCart(chatId);
  const dishByCode: Record<string, any> = {};
  for (const d of dishes) dishByCode[d.code] = d;
  await tgGrab("sendMessage", {
    chat_id: chatId,
    text: cartText(cart, dishByCode),
    reply_markup: buildKeyboard(dishes),
  });
}

async function redrawMenu(chatId: number, messageId: number, cart: Cart) {
  const dishes = await loadDishes();
  const dishByCode: Record<string, any> = {};
  for (const d of dishes) dishByCode[d.code] = d;
  await tgGrab("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: cartText(cart, dishByCode),
    reply_markup: buildKeyboard(dishes),
  });
}

/* ---------- Текстовые сообщения менеджера ---------- */
async function handleMessage(msg: any) {
  const chatId = msg?.chat?.id;
  const userId = msg?.from?.id;
  const text: string = (msg?.text ?? "").trim();
  if (chatId == null || !text) return;

  // Доступ — ДО любых действий (склад/касса/просмотр меню)
  if (userId == null || !(await isAllowed(userId))) {
    await tgGrab("sendMessage", { chat_id: chatId, text: `⛔ Доступ запрещён. Ваш ID: ${userId ?? "?"}` });
    return;
  }

  if (text === "/start" || text === "/grab") {
    await sendMenu(chatId);
    return;
  }

  // Единственное назначение произвольного текста в этом боте — комментарий к заказу
  const cart = await loadCart(chatId);
  await saveCart(chatId, cart.items, text);
  await tgGrab("sendMessage", { chat_id: chatId, text: `📝 Комментарий сохранён: ${text}` });
}

/* ---------- Отправка заказа: создаём НОВЫЙ заказ и ждём подтверждения в группе
   Orders — точно как обычные заказы с сайта. Автоодобрения больше нет: склад,
   касса и дубль на кухню происходят автоматически при «✅ Одобрить»
   (существующая логика approve в tg-webhook, её не трогаем). ---------- */
async function handleSend(cq: any, chatId: number, messageId: number) {
  const cart = await loadCart(chatId);
  if (!cart.items.length) { await answer(cq.id, "Корзина пуста"); return; }

  const codes = [...new Set(cart.items.map((it) => it.code))];
  const dishRows = codes.length
    ? await sbGet(`dishes?select=id,code,name_en,price&code=in.(${inList(codes)})`)
    : [];
  const dishByCode: Record<string, any> = {};
  for (const d of dishRows) dishByCode[d.code] = d;

  const items: { id: number; name: string; qty: number; price: number; sum: number }[] = [];
  let rawTotal = 0;
  for (const it of cart.items) {
    const d = dishByCode[it.code];
    if (!d) continue;
    const price = Number(d.price) || 0;
    const sum = price * it.qty;
    rawTotal += sum;
    items.push({ id: Number(it.code), name: d.name_en || it.code, qty: it.qty, price, sum });
  }
  if (!items.length) { await answer(cq.id, "Позиции не найдены в меню"); return; }

  // Итог со скидкой Grab −10% — то, что попадёт в кассу при одобрении: approve
  // в tg-webhook кладёт в кассу ровно orders.total, поэтому скидку закладываем
  // в сам total (tg-webhook не трогаем и не учит его отдельно считать Grab).
  const total = Math.round(rawTotal * 0.9);

  const ins = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=representation" },
    body: JSON.stringify({
      customer_name: "Grab",
      comment: cart.comment || null,
      items,
      total,
      status: "new",
    }),
  });
  const insRows = await ins.json().catch(() => []);
  if (!ins.ok || !Array.isArray(insRows) || !insRows[0]) {
    console.log("GRAB order insert failed:", await ins.text().catch(() => ""));
    await answer(cq.id, "Ошибка создания заказа");
    return;
  }
  const orderId = insRows[0].id;

  // Сообщение в группу Orders — с теми же кнопками ok:/no:, что и обычные заказы
  // (их обрабатывает существующий handleCallback в tg-webhook).
  const lines = items.map((it) => `• ${it.name} × ${it.qty} = ${fmtPrice(it.sum)}`).join("\n");
  let oText = `🛵 GRAB Order #${orderId}\n\n${lines}\n— — —\n`;
  oText += `💰 Sum: ${fmtPrice(rawTotal)}\n🏷 Grab −10%\n💰 TOTAL: ${fmtPrice(total)}`;
  if (cart.comment) oText += `\n📝 ${cart.comment}`;

  if (TELEGRAM_CHAT_ID) {
    try {
      await tgMain("sendMessage", {
        chat_id: TELEGRAM_CHAT_ID,
        text: oText,
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Одобрить", callback_data: `ok:${orderId}` },
            { text: "❌ Отклонить", callback_data: `no:${orderId}` },
          ]],
        },
      });
    } catch (e) {
      console.log("GRAB orders-group sendMessage failed:", e);
    }
  }

  // Очистить корзину менеджера, подтвердить
  await saveCart(chatId, [], null);
  await answer(cq.id, `Заказ #${orderId} отправлен на подтверждение`);
  await tgGrab("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: `📨 Заказ #${orderId} отправлен, ждёт подтверждения в Orders`,
  });
}

/* ---------- Кнопки ---------- */
async function handleCallback(cq: any) {
  const data: string = cq?.data ?? "";
  const chatId = cq?.message?.chat?.id;
  const messageId = cq?.message?.message_id;
  const userId = cq?.from?.id;
  if (chatId == null || messageId == null) { await answer(cq.id); return; }

  // Доступ — ДО любых действий (склад/касса/просмотр меню)
  if (userId == null || !(await isAllowed(userId))) {
    await answer(cq.id, "⛔ Нет доступа");
    return;
  }

  if (data === "g:clear") {
    await saveCart(chatId, [], null);
    await redrawMenu(chatId, messageId, { items: [], comment: null });
    await answer(cq.id, "Корзина очищена");
    return;
  }

  if (data === "g:note") {
    await tgGrab("sendMessage", { chat_id: chatId, text: "Напишите комментарий одним сообщением:" });
    await answer(cq.id);
    return;
  }

  if (data === "g:send") {
    await handleSend(cq, chatId, messageId);
    return;
  }

  const mCode = data.match(/^g:(\d+)$/);
  if (mCode) {
    const code = mCode[1];
    const cart = await loadCart(chatId);
    const idx = cart.items.findIndex((it) => it.code === code);
    if (idx >= 0) cart.items[idx].qty += 1;
    else cart.items.push({ code, qty: 1 });
    await saveCart(chatId, cart.items, cart.comment);
    await redrawMenu(chatId, messageId, cart);
    await answer(cq.id);
    return;
  }

  await answer(cq.id);
}

serve(async (req) => {
  if (GRAB_WEBHOOK_SECRET) {
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (got !== GRAB_WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });
  }

  try {
    const update = await req.json();

    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return new Response("ok");
    }
    if (update.message) {
      await handleMessage(update.message);
      return new Response("ok");
    }
    return new Response("ok");
  } catch (e) {
    console.log("grab-bot error:", e);
    return new Response("ok");
  }
});
