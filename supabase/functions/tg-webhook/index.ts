// Supabase Edge Function: tg-webhook
// Принимает апдейты Telegram (вебхук):
//   • /start  -> приветствие с кнопкой «Відкрити меню»;
//   • callback_query от inline-кнопок заказа:
//       "ok:<id>" -> списать ингредиенты по рецептам, заказ -> approved;
//       "no:<id>" -> заказ -> rejected (без списания).
// Токен бота — секрет TELEGRAM_BOT_TOKEN.
// Доступ защищён секретным заголовком X-Telegram-Bot-Api-Secret-Token (секрет WEBHOOK_SECRET).
// Работа с БД — через SUPABASE_SERVICE_ROLE_KEY (обходит RLS). Остаток склада
// пересчитывает триггер БД при вставке в movements — stock напрямую не трогаем.
//
// Деплой (функция публичная — Telegram не шлёт JWT):
//   supabase functions deploy tg-webhook --no-verify-jwt
//
// Привязка вебхука:
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<project>.supabase.co/functions/v1/tg-webhook&secret_token=<WEBHOOK_SECRET>"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";
const KITCHEN_CHAT_ID = Deno.env.get("KITCHEN_CHAT_ID") || "";
const SITE = "https://ninisushi.com";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sbHeaders = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  "Content-Type": "application/json",
};

const GREETING =
  "🍣 Вітаємо в NiNi Sushi!\n\n" +
  "Свіжі суші та роли з доставкою 🥢\n" +
  "🕘 Години роботи: 14:30 – 22:30\n\n" +
  "Натисніть кнопку нижче, щоб переглянути меню та оформити замовлення 👇";

async function tg(method: string, body: unknown) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* PostgREST helpers (service-role) */
async function sbGet(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  if (!r.ok) return [];
  return await r.json().catch(() => []);
}
async function sbDelete(path: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "DELETE",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
  });
}

async function answer(id: string, text = "") {
  await tg("answerCallbackQuery", { callback_query_id: id, text });
}

/* Дописать к тексту сообщения суффикс и убрать inline-кнопки.
   editMessageText без reply_markup удаляет клавиатуру. */
async function finalize(msg: any, suffix: string) {
  const base: string = msg?.text ?? "";
  await tg("editMessageText", {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text: base ? `${base}\n\n${suffix}` : suffix,
  });
}

/* in.(...) список для PostgREST: значения в кавычках, всё урл-кодируем */
function inList(values: (string | number)[]): string {
  const body = values.map((v) => `"${String(v).replace(/"/g, "")}"`).join(",");
  return encodeURIComponent(body);
}

async function handleCallback(cq: any) {
  const data: string = cq?.data ?? "";
  // Приход через Telegram: выбор ингредиента (только в группе Кухня)
  const mi = data.match(/^inv:(\d+)$/);
  if (mi) { await handleInvSelect(cq, mi[1]); return; }
  const m = data.match(/^(ok|no):(.+)$/);
  if (!m) { await answer(cq.id); return; }
  const action = m[1];
  const orderId = m[2];
  const msg = cq.message;

  if (action === "no") {
    // Отклонить — только если ещё новый (не перетираем уже одобренный)
    const upd = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&status=eq.new`,
      { method: "PATCH", headers: { ...sbHeaders, Prefer: "return=representation" }, body: JSON.stringify({ status: "rejected" }) },
    );
    const rows = await upd.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) { await answer(cq.id, "Вже оброблено"); return; }
    await answer(cq.id, "Відхилено");
    await finalize(msg, "❌ Відхилено");
    return;
  }

  // action === "ok": атомарно «занимаем» заказ new -> approved (защита от двойного списания).
  // Списываем ТОЛЬКО если этот PATCH реально перевёл строку из status='new'.
  const claim = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&status=eq.new&select=id,items,total`,
    { method: "PATCH", headers: { ...sbHeaders, Prefer: "return=representation" }, body: JSON.stringify({ status: "approved" }) },
  );
  const claimed = await claim.json().catch(() => []);
  if (!Array.isArray(claimed) || claimed.length === 0) { await answer(cq.id, "Вже оброблено"); return; }
  const order = claimed[0];
  const items: any[] = Array.isArray(order.items) ? order.items : [];

  try {
    // dishes по code = item.id
    const codes = [...new Set(items.map((it) => String(it.id)))];
    const dishesRows = codes.length
      ? await sbGet(`dishes?select=id,code&code=in.(${inList(codes)})`)
      : [];
    const codeToDish: Record<string, any> = {};
    for (const d of dishesRows) codeToDish[String(d.code)] = d.id;

    // recipe по найденным блюдам
    const dishIds = [...new Set(Object.values(codeToDish))];
    const recRows = dishIds.length
      ? await sbGet(`recipe?select=dish_id,ingredient_id,amount&dish_id=in.(${inList(dishIds)})`)
      : [];
    const recByDish: Record<string, any[]> = {};
    for (const r of recRows) (recByDish[r.dish_id] ??= []).push(r);

    // Суммируем расход по ингредиентам с учётом qty
    const totals = new Map<any, { ingredient_id: any; amount: number }>();
    for (const it of items) {
      const dishId = codeToDish[String(it.id)];
      if (dishId == null) continue;
      const qty = Number(it.qty) || 0;
      if (qty <= 0) continue;
      for (const r of (recByDish[dishId] || [])) {
        const add = Number(r.amount) * qty;
        if (!Number.isFinite(add) || add <= 0) continue;
        const prev = totals.get(r.ingredient_id);
        if (prev) prev.amount += add;
        else totals.set(r.ingredient_id, { ingredient_id: r.ingredient_id, amount: add });
      }
    }

    const movements = [...totals.values()].map((t) => ({
      ingredient_id: t.ingredient_id,
      type: "out",
      amount: t.amount,
      source: "order",
      order_id: order.id,
    }));

    if (movements.length) {
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/movements`, {
        method: "POST",
        headers: { ...sbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify(movements),
      });
      if (!ins.ok) {
        // откат: вернуть заказ в 'new', чтобы можно было повторить
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
          method: "PATCH", headers: sbHeaders, body: JSON.stringify({ status: "new" }),
        });
        await answer(cq.id, "Помилка списання, спробуйте ще раз");
        return;
      }
    }

    // Выручка в кассу — ровно ОДНА строка на заказ (привязано к атомарному claim выше).
    // best-effort: заказ уже approved и склад списан, поэтому при сбое НЕ откатываем
    // (иначе повторное одобрение задвоило бы списание ингредиентов).
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/cash_movements`, {
        method: "POST",
        headers: { ...sbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ amount: order.total, source: "order", order_id: order.id, note: null }),
      });
    } catch (_e) { /* запись в кассу не критична для одобрения */ }

    // Дублируем заказ на кухню (best-effort): только название + количество.
    // Если sendMessage упал — ничего не откатываем, заказ уже одобрен и списан.
    if (KITCHEN_CHAT_ID) {
      try {
        const lines = items.map((it) => `• ${it.name} × ${it.qty}`).join("\n");
        await tg("sendMessage", {
          chat_id: KITCHEN_CHAT_ID,
          text: `🍣 Order #${order.id}\n\n${lines}`,
        });
      } catch (e) {
        console.log("KITCHEN sendMessage failed:", e);
      }
    }

    await answer(cq.id, "Списано зі складу");
    await finalize(msg, "✅ Схвалено");
  } catch (_e) {
    // непредвиденная ошибка — возвращаем заказ в 'new'
    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: "PATCH", headers: sbHeaders, body: JSON.stringify({ status: "new" }),
    });
    await answer(cq.id, "Помилка, спробуйте ще раз");
  }
}

/* ============================================================
   ПРИХОД ТОВАРА ЧЕРЕЗ TELEGRAM (только в группе «Кухня»)
   /nhap -> клавиатура ингредиентов -> ввод "кол-во цена"
   ============================================================ */
const INPUT_TTL_MS = 10 * 60 * 1000; // состояние живёт 10 минут

/* /nhap -> клавиатура всех ингредиентов (name_vn), по 2 в ряд */
async function sendIngredientKeyboard(chatId: number) {
  const rows = await sbGet("ingredients?select=id,name,name_vn&order=name_vn.asc");
  if (!rows.length) {
    await tg("sendMessage", { chat_id: chatId, text: "Không có nguyên liệu" });
    return;
  }
  const btns = rows.map((r) => ({ text: r.name_vn || r.name, callback_data: `inv:${r.id}` }));
  const keyboard: unknown[] = [];
  for (let i = 0; i < btns.length; i += 2) keyboard.push(btns.slice(i, i + 2));
  await tg("sendMessage", {
    chat_id: chatId,
    text: "Chọn nguyên liệu:",
    reply_markup: { inline_keyboard: keyboard },
  });
}

/* Нажата кнопка inv:<id> -> сохраняем состояние и просим ввести кол-во и цену */
async function handleInvSelect(cq: any, ingredientId: string) {
  const chatId = cq.message?.chat?.id;
  if (String(chatId) !== KITCHEN_CHAT_ID) { await answer(cq.id); return; }
  const userId = cq.from?.id;
  if (userId == null) { await answer(cq.id); return; }

  const rows = await sbGet(`ingredients?id=eq.${ingredientId}&select=id,name,name_vn`);
  const ing = rows[0];
  if (!ing) { await answer(cq.id, "?"); return; }
  const nameVn = ing.name_vn || ing.name;

  // upsert состояния диалога (сбрасывает таймер)
  await fetch(`${SUPABASE_URL}/rest/v1/tg_input_state`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      ingredient_id: Number(ingredientId),
      created_at: new Date().toISOString(),
    }),
  });

  await answer(cq.id);
  await tg("sendMessage", {
    chat_id: chatId,
    text: `${nameVn}: nhập số lượng và giá.\nVí dụ: 2000 500000`,
  });
}

/* Сообщение в группе Кухня: /nhap или ввод "кол-во цена" при активном состоянии */
async function handleKitchenMessage(msg: any, text: string, chatId: number) {
  const userId = msg?.from?.id;
  if (userId == null) return;

  const cmd = text.trim().split(/\s+/)[0].split("@")[0];
  if (cmd === "/nhap") { await sendIngredientKeyboard(chatId); return; }

  // есть ли активное состояние ввода у этого пользователя в этом чате?
  const st = (await sbGet(
    `tg_input_state?chat_id=eq.${chatId}&user_id=eq.${userId}&select=ingredient_id,created_at&limit=1`,
  ))[0];
  if (!st) return; // обычное сообщение — игнорируем

  // протухло (>10 мин) — удаляем и игнорируем
  if (Date.now() - new Date(st.created_at).getTime() > INPUT_TTL_MS) {
    await sbDelete(`tg_input_state?chat_id=eq.${chatId}&user_id=eq.${userId}`);
    return;
  }

  // ждём "ЧИСЛО ЧИСЛО" (кол-во, цена)
  const m = text.trim().match(/^(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)$/);
  if (!m) {
    await tg("sendMessage", { chat_id: chatId, text: "❌ Sai định dạng. Ví dụ: 2000 500000" });
    return; // состояние НЕ удаляем — можно повторить
  }
  const amount = Number(m[1].replace(",", "."));
  const price = Math.round(Number(m[2].replace(",", ".")));

  const ing = (await sbGet(`ingredients?id=eq.${st.ingredient_id}&select=id,name,name_vn`))[0];
  const nameVn = ing?.name_vn || ing?.name || `#${st.ingredient_id}`;
  const nameRu = ing?.name || `#${st.ingredient_id}`;

  // приход на склад — stock пересчитает триггер
  await fetch(`${SUPABASE_URL}/rest/v1/movements`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ ingredient_id: st.ingredient_id, type: "in", amount, source: "tg", note: "TG приход" }),
  });
  // расход в кассу
  await fetch(`${SUPABASE_URL}/rest/v1/cash_movements`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ amount: -price, source: "purchase", note: `TG: ${nameRu}` }),
  });
  // состояние отработано — удаляем
  await sbDelete(`tg_input_state?chat_id=eq.${chatId}&user_id=eq.${userId}`);

  await tg("sendMessage", { chat_id: chatId, text: `✅ Đã nhập: ${nameVn} +${amount} (${price}₫)` });
}

serve(async (req) => {
  // Проверка секрета от Telegram
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (got !== WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });
  }

  try {
    const update = await req.json();

    // Inline-кнопки одобрения/отклонения заказа
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return new Response("ok");
    }

    const msg = update.message ?? update.edited_message;
    const text: string = msg?.text ?? "";
    const chatId = msg?.chat?.id;

    // Приход товара через Telegram — ТОЛЬКО в группе «Кухня»
    if (msg && chatId != null && String(chatId) === KITCHEN_CHAT_ID) {
      await handleKitchenMessage(msg, text, chatId);
      return new Response("ok");
    }

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
