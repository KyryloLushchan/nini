// Supabase Edge Function: send-order
// ------------------------------------------------------------
// Принимает СТРУКТУРИРОВАННЫЙ заказ и САМ собирает текст для Telegram.
// Клиент больше НЕ присылает готовый текст — поэтому endpoint нельзя
// использовать для рассылки произвольного спама в группу.
//
// Защита:
//   1) позиции проверяются по серверному меню (id -> цена/название);
//      неизвестные id и пустой заказ отклоняются;
//   2) цены и сумма пересчитываются на сервере (клиенту не верим);
//   3) лёгкий in-memory rate-limit + дедуп одинаковых заказов.
//
// Деплой:
//   supabase functions deploy send-order
//
// Тело запроса:
//   { items:[{id,qty}], name, phone, telegram?, address, lat?, lng?, comment?, lang? }

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

/* ===== Серверное меню (источник правды для цен/названий) ===== */
type Dish = { p: number; c: string; n: Record<string, string>; noSale?: boolean };
const MENU: Record<string, Dish> = {
  "1":{"p":189000,"c":"rolls","n":{"ua":"Філадельфія з лососем","ru":"Филадельфия с лососем","en":"Philadelphia with Salmon","vn":"Philadelphia cá hồi"}},
  "2":{"p":199000,"c":"rolls","n":{"ua":"Філадельфія з лососем та авокадо","ru":"Филадельфия с лососем и авокадо","en":"Philadelphia Salmon & Avocado","vn":"Philadelphia cá hồi & bơ"}},
  "3":{"p":189000,"c":"rolls","n":{"ua":"Філадельфія Гриль","ru":"Филадельфия Гриль","en":"Philadelphia Grill","vn":"Philadelphia nướng"}},
  "7":{"p":79000,"c":"rolls","n":{"ua":"Макі Лосось","ru":"Маки Лосось","en":"Maki Salmon","vn":"Maki cá hồi"}},
  "8":{"p":35000,"c":"rolls","n":{"ua":"Макі Огірок","ru":"Маки Огурец","en":"Maki Cucumber","vn":"Maki dưa leo"}},
  "10":{"p":95000,"c":"rolls","n":{"ua":"Макі Лосось-Огірок-Крем сир","ru":"Маки Лосось-Огурец-Крем сыр","en":"Maki Salmon-Cucumber-Cheese","vn":"Maki cá hồi - dưa leo - phô mai"}},
  "11":{"p":105000,"c":"rolls","n":{"ua":"Макі Вугор","ru":"Маки с угрем","en":"Maki Eel","vn":"Maki lươn"}},
  "12":{"p":219000,"c":"rolls","n":{"ua":"Червоний Дракон","ru":"Красный Дракон","en":"Red Dragon","vn":"Rồng đỏ"}},
  "13":{"p":219000,"c":"rolls","n":{"ua":"Золотий Дракон","ru":"Золотой Дракон","en":"Golden Dragon","vn":"Rồng vàng"}},
  "15":{"p":175000,"c":"rolls","n":{"ua":"Зелений Дракон","ru":"Зелёный Дракон","en":"Green Dragon","vn":"Rồng xanh"}},
  "20":{"p":199000,"c":"rolls","n":{"ua":"Spicy Tuna roll","ru":"Spicy Tuna roll","en":"Spicy Tuna roll","vn":"Spicy Tuna roll"}},
  "23":{"p":49000,"c":"sushi","n":{"ua":"Нігірі Лосось","ru":"Нигири Лосось","en":"Nigiri Salmon","vn":"Nigiri cá hồi"}},
  "24":{"p":49000,"c":"sushi","n":{"ua":"Нігірі Тунець","ru":"Нигири Тунец","en":"Nigiri Tuna","vn":"Nigiri cá ngừ"}},
  "25":{"p":49000,"c":"sushi","n":{"ua":"Нігірі Креветка","ru":"Нигири Креветка","en":"Nigiri Shrimp","vn":"Nigiri tôm"}},
  "26":{"p":69000,"c":"sushi","n":{"ua":"Нігірі Вугор","ru":"Нигири Угорь","en":"Nigiri Eel","vn":"Nigiri lươn"}},
  "27":{"p":59000,"c":"sushi","n":{"ua":"Гункан Лосось","ru":"Гункан Лосось","en":"Gunkan Salmon","vn":"Gunkan cá hồi"}},
  "28":{"p":59000,"c":"sushi","n":{"ua":"Гункан Тунець спайсі","ru":"Гункан Тунец спайси","en":"Gunkan Spicy Tuna","vn":"Gunkan cá ngừ cay"}},
  "29":{"p":59000,"c":"sushi","n":{"ua":"Гункан Креветка","ru":"Гункан Креветка","en":"Gunkan Shrimp","vn":"Gunkan tôm"}},
  "30":{"p":79000,"c":"sushi","n":{"ua":"Гункан Вугор","ru":"Гункан Угорь","en":"Gunkan Eel","vn":"Gunkan lươn"}},
  "31":{"p":15000,"c":"drinks","n":{"ua":"Вода","ru":"Вода","en":"Water","vn":"Nước"}},
  "32":{"p":20000,"c":"drinks","n":{"ua":"Pepsi","ru":"Pepsi","en":"Pepsi","vn":"Pepsi"}},
  "33":{"p":20000,"c":"drinks","n":{"ua":"Pepsi Zero","ru":"Pepsi Zero","en":"Pepsi Zero","vn":"Pepsi Zero"}},
  "34":{"p":20000,"c":"drinks","n":{"ua":"Pepsi Zero Lime","ru":"Pepsi Zero Lime","en":"Pepsi Zero Lime","vn":"Pepsi Zero Lime"}},
  "35":{"p":200000,"c":"rolls","n":{"ua":"Запечений з лососем","ru":"Запечённый с лососем","en":"Baked Salmon","vn":"Cuộn nướng cá hồi"}},
  "36":{"p":175000,"c":"rolls","n":{"ua":"Запечений з куркою","ru":"Запечённый с курицей","en":"Baked Chicken","vn":"Cuộn nướng gà"}},
  "38":{"p":189000,"c":"rolls","n":{"ua":"Spicy Tokyo roll","ru":"Spicy Tokyo roll","en":"Spicy Tokyo roll","vn":"Spicy Tokyo roll"}},
  "43":{"p":147500,"c":"rolls","n":{"ua":"Yamamoto set","ru":"Yamamoto set","en":"Yamamoto set","vn":"Yamamoto set"}},
  "44":{"p":159000,"c":"rolls","n":{"ua":"Teriyaki Eggplant roll VEGAN","ru":"Teriyaki Eggplant roll VEGAN","en":"Teriyaki Eggplant roll VEGAN","vn":"Teriyaki Eggplant roll VEGAN"}},
  "45":{"p":210000,"c":"rolls","n":{"ua":"Філадельфія з вугром та авокадо","ru":"Филадельфия с угрём и авокадо","en":"Philadelphia Eel & Avocado","vn":"Philadelphia lươn & bơ"}},
  "90":{"p":135000,"c":"rolls","n":{"ua":"Філадельфія з лососем (Light)","ru":"Филадельфия с лососем (Light)","en":"Philadelphia with Salmon (Light)","vn":"Philadelphia cá hồi (Light)"}},
  "91":{"p":135000,"c":"rolls","n":{"ua":"Філадельфія Гриль (Light)","ru":"Филадельфия Гриль (Light)","en":"Philadelphia Grill (Light)","vn":"Philadelphia nướng (Light)"}},
  "200":{"p":20000,"c":"addon","noSale":true,"n":{"ua":"Додатковий імбир","ru":"Дополнительный имбирь","en":"Extra ginger","vn":"Gừng thêm"}},
  "201":{"p":20000,"c":"addon","noSale":true,"n":{"ua":"Додатковий васабі","ru":"Дополнительный васаби","en":"Extra wasabi","vn":"Wasabi thêm"}},
  "202":{"p":20000,"c":"addon","noSale":true,"n":{"ua":"Соєвий соус","ru":"Соевый соус","en":"Soy sauce","vn":"Nước tương"}},
};
const SALE = 0.20;
const dishPrice = (d: Dish) => (d.c === "drinks" || d.noSale) ? d.p : Math.round(d.p * (1 - SALE));
const fmtPrice = (v: number) => v.toLocaleString("ru-RU").replace(/,/g, " ") + "₫";
const clean = (s: unknown, max = 300) => String(s ?? "").trim().slice(0, max);
/* экранирование для parse_mode: HTML (& < > обязательно) */
const escHtml = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const normCC = (c: unknown) => (typeof c === "string" && /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : null);

/* Страны по IP из двух источников (по одному коду на источник, null если не ответил). */
async function ipCountries(ip: string): Promise<(string | null)[]> {
  if (!ip || ip === "unknown") return [];
  const a = (async () => {
    try {
      const r = await fetch(`https://api.country.is/${ip}`, { signal: AbortSignal.timeout(4000) });
      if (r.ok) { const d = await r.json().catch(() => null); return normCC(d?.country); }
    } catch { /* ignore */ }
    return null;
  })();
  const b = (async () => {
    try {
      const r = await fetch(`https://ipwho.is/${ip}?fields=country_code,success`, { signal: AbortSignal.timeout(4000) });
      if (r.ok) { const d = await r.json().catch(() => null); if (d?.success) return normCC(d?.country_code); }
    } catch { /* ignore */ }
    return null;
  })();
  return await Promise.all([a, b]);
}

/* ===== Надёжный rate-limit / дедуп через таблицу order_rate (общая для всех инстансов) =====
   Возвращает причину отказа ('rate limited' | 'duplicate') или null. fail-open при ошибке. */
const RATE_MAX = 5, RATE_WINDOW_MS = 60_000, DEDUP_WINDOW_MS = 90_000;

async function dbThrottle(sbUrl: string, service: string, ip: string, fp: string): Promise<string | null> {
  const h = { apikey: service, Authorization: `Bearer ${service}` };
  const now = Date.now();
  const since60 = new Date(now - RATE_WINDOW_MS).toISOString();
  const since90 = new Date(now - DEDUP_WINDOW_MS).toISOString();
  try {
    // сколько заказов с этого IP за окно
    const rc = await fetch(
      `${sbUrl}/rest/v1/order_rate?select=id&ip=eq.${encodeURIComponent(ip)}&created_at=gte.${since60}`,
      { headers: { ...h, Prefer: "count=exact", Range: "0-0" } },
    );
    const total = parseInt((rc.headers.get("content-range") ?? "").split("/")[1] ?? "0", 10) || 0;
    if (total >= RATE_MAX) return "rate limited";

    // тот же заказ (fingerprint) недавно
    const rd = await fetch(
      `${sbUrl}/rest/v1/order_rate?select=id&fingerprint=eq.${encodeURIComponent(fp)}&created_at=gte.${since90}&limit=1`,
      { headers: h },
    );
    const dup = await rd.json().catch(() => []);
    if (Array.isArray(dup) && dup.length) return "duplicate";

    // фиксируем попытку
    await fetch(`${sbUrl}/rest/v1/order_rate`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ ip, fingerprint: fp }),
    });
    // изредка подчищаем старое, чтобы таблица не росла
    if (Math.random() < 0.05) {
      const old = new Date(now - 3_600_000).toISOString();
      await fetch(`${sbUrl}/rest/v1/order_rate?created_at=lt.${old}`, {
        method: "DELETE",
        headers: { ...h, Prefer: "return=minimal" },
      });
    }
    return null;
  } catch {
    return null; // fail-open
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  try {
    const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!TOKEN || !CHAT_ID) return json({ ok: false, error: "secrets" }, 500);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ ok: false, error: "bad body" }, 400);

    const lang = ["ua", "ru", "en", "vn"].includes(body.lang) ? body.lang : "ua";
    const name = clean(body.name, 120);
    const phone = clean(body.phone, 40);
    const telegram = clean(body.telegram, 80);
    const address = clean(body.address, 300);
    const comment = clean(body.comment, 500);
    // количество человек: целое 1..50, иначе игнорируем
    const peopleNum = Math.floor(Number(body.people));
    const people = (Number.isFinite(peopleNum) && peopleNum >= 1 && peopleNum <= 50) ? peopleNum : null;
    const lat = clean(body.lat, 40);
    const lng = clean(body.lng, 40);

    // Обязательные поля
    if (!name || !phone || !address) return json({ ok: false, error: "missing fields" }, 400);

    // Позиции: только из меню, qty 1..30, максимум 40 строк
    const raw = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
    const lines: { id: number; name: string; qty: number; price: number; sum: number }[] = [];
    let total = 0;
    for (const it of raw) {
      const dish = MENU[String(it?.id)];
      const qty = Math.floor(Number(it?.qty));
      if (!dish || !Number.isFinite(qty) || qty < 1 || qty > 30) {
        return json({ ok: false, error: "invalid item" }, 400);
      }
      const price = dishPrice(dish);
      const sum = price * qty;
      total += sum;
      lines.push({ id: Number(it.id), name: dish.n.en ?? dish.n.ua, qty, price, sum });
    }
    if (lines.length === 0) return json({ ok: false, error: "empty cart" }, 400);

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

    // Гео-ограничение: заказы только из разрешённой страны (по умолчанию VN).
    // fail-open: если страну определить не удалось — заказ пропускаем.
    // Блокируем заказ ТОЛЬКО при уверенности: оба источника ответили и оба «не VN».
    // Если расходятся / один не ответил — пропускаем (fail-open), чтобы не терять
    // реальных гостей из Вьетнама из-за неточной IP-геолокации.
    const ALLOWED_COUNTRY = (Deno.env.get("ALLOWED_COUNTRY") || "VN").toUpperCase();
    if (ALLOWED_COUNTRY) {
      const known = (await ipCountries(ip)).filter((c): c is string => !!c);
      if (known.length >= 2 && known.every((c) => c !== ALLOWED_COUNTRY)) {
        return json({ ok: false, error: "region not allowed", country: known[0] }, 403);
      }
    }

    // Проверка Cloudflare Turnstile (главная защита от ботов)
    const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET");
    if (TURNSTILE_SECRET) {
      const token = clean(body.turnstileToken, 4000);
      if (!token) return json({ ok: false, error: "captcha required" }, 403);
      const form = new URLSearchParams();
      form.append("secret", TURNSTILE_SECRET);
      form.append("response", token);
      if (ip !== "unknown") form.append("remoteip", ip);
      const vr = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: form,
      });
      const vj = await vr.json().catch(() => ({ success: false }));
      if (!vj.success) return json({ ok: false, error: "captcha failed" }, 403);
    }

    // Анти-спам: надёжный rate-limit/дедуп через БД (общий для всех инстансов)
    const fp = `${phone}|${lines.map((l) => l.name + "x" + l.qty).join(",")}`;
    {
      const sbUrl = Deno.env.get("SUPABASE_URL");
      const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (sbUrl && service) {
        const reason = await dbThrottle(sbUrl, service, ip, fp);
        if (reason) return json({ ok: false, error: reason }, 429);
      }
    }

    // Проверенный user_id из JWT (клиенту не верим) + персональная скидка.
    // Всё считается ТОЛЬКО на сервере.
    const SB_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY");
    let user_id: string | null = null;
    const userToken = clean(body.userToken, 4000);
    if (userToken && SB_URL) {
      const ur = await fetch(`${SB_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${userToken}`, apikey: ANON ?? SERVICE ?? "" },
      });
      if (ur.ok) {
        const u = await ur.json().catch(() => null);
        if (u && typeof u.id === "string") user_id = u.id;
      }
    }

    // Персональная скидка: читаем через service-role (RLS обходится)
    let discountPercent = 0;
    if (user_id && SB_URL && SERVICE) {
      try {
        const dr = await fetch(
          `${SB_URL}/rest/v1/discounts?user_id=eq.${user_id}&select=percent`,
          { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } },
        );
        if (dr.ok) {
          const rows = await dr.json().catch(() => []);
          const p = Array.isArray(rows) && rows[0] ? Number(rows[0].percent) : 0;
          if (Number.isFinite(p) && p >= 1 && p <= 100) discountPercent = p;
        }
      } catch { /* скидку не удалось получить — считаем без неё */ }
    }
    const discountAmount = discountPercent > 0 ? Math.round(total * discountPercent / 100) : 0;
    const totalFinal = total - discountAmount;

    // Текст заказа собирает СЕРВЕР (всегда на английском). parse_mode: HTML —
    // все пользовательские поля ОБЯЗАТЕЛЬНО через escHtml.
    let msg = `🍣 NEW ORDER NiNi Sushi\n\n`;
    msg += `👤 ${escHtml(name)}\n📞 ${escHtml(phone)}\n`;
    if (telegram) msg += `✈️ ${escHtml(telegram)}\n`;
    // Адрес: в <code> — тап по нему в Telegram = копирование одним касанием.
    msg += `📍 <code>${escHtml(address)}</code>\n`;
    if (people) msg += `👥 People: ${people}\n`;
    if (lat && lng) {
      msg += `📍 Coordinates: ${escHtml(lat)},${escHtml(lng)}\n`;
      msg += `🗺 https://maps.google.com/?q=${escHtml(lat)},${escHtml(lng)}\n`;
    }
    if (comment) msg += `📝 ${escHtml(comment)}\n`;
    msg += `\n— — —\n`;
    for (const l of lines) msg += `• ${escHtml(l.name)} × ${l.qty} = ${fmtPrice(l.sum)}\n`;
    msg += `— — —\n`;
    if (discountPercent > 0) {
      msg += `💰 Subtotal: ${fmtPrice(total)}\n`;
      msg += `🏷 Discount: -${discountPercent}% (-${fmtPrice(discountAmount)})\n`;
    }
    msg += `💰 TOTAL: ${fmtPrice(totalFinal)}`;

    // 1) СНАЧАЛА сохраняем заказ и получаем id (нужен для кнопок). total = итог со скидкой.
    let orderId: number | null = null;
    try {
      if (SB_URL && SERVICE) {
        const ins = await fetch(`${SB_URL}/rest/v1/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SERVICE,
            Authorization: `Bearer ${SERVICE}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            customer_name: name, phone, address, comment,
            items: lines, total: totalFinal,
            lat: lat || null, lng: lng || null,
            user_id, status: "new",
          }),
        });
        if (ins.ok) {
          const rows = await ins.json().catch(() => null);
          if (Array.isArray(rows) && rows[0] && typeof rows[0].id === "number") {
            orderId = rows[0].id;
          }
        }
      }
    } catch (_e) { /* запись в БД не критична для отправки */ }

    // 2) Отправляем в группу. Есть id — номер заказа в самый верх + кнопки.
    const text = orderId !== null ? `🧾 Order #${orderId}\n\n${msg}` : msg;
    const sendBody: Record<string, unknown> = {
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (orderId !== null) {
      sendBody.reply_markup = {
        inline_keyboard: [[
          { text: "✅ Одобрить", callback_data: `ok:${orderId}` },
          { text: "❌ Отклонить", callback_data: `no:${orderId}` },
        ]],
      };
    }
    const tg = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sendBody),
    });
    const data = await tg.json();

    return json({ ok: data.ok === true }, data.ok ? 200 : 500);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
