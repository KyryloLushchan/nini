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
type Dish = { p: number; c: string; n: Record<string, string> };
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
};
const SALE = 0.20;
const dishPrice = (d: Dish) => d.c === "drinks" ? d.p : Math.round(d.p * (1 - SALE));
const fmtPrice = (v: number) => v.toLocaleString("ru-RU").replace(/,/g, " ") + "₫";
const clean = (s: unknown, max = 300) => String(s ?? "").trim().slice(0, max);

/* ===== Лёгкий rate-limit / дедуп (в памяти инстанса) ===== */
const hits: Map<string, number[]> = new Map();          // ip -> timestamps
const recent: Map<string, number> = new Map();          // fingerprint -> ts
const RATE_MAX = 5, RATE_WINDOW = 60_000, DEDUP_WINDOW = 90_000;

function tooMany(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_MAX;
}
function isDup(fp: string): boolean {
  const now = Date.now();
  const last = recent.get(fp);
  recent.set(fp, now);
  // подчистим старое
  for (const [k, t] of recent) if (now - t > DEDUP_WINDOW) recent.delete(k);
  return last !== undefined && now - last < DEDUP_WINDOW;
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
    const lat = clean(body.lat, 40);
    const lng = clean(body.lng, 40);

    // Обязательные поля
    if (!name || !phone || !address) return json({ ok: false, error: "missing fields" }, 400);

    // Позиции: только из меню, qty 1..30, максимум 40 строк
    const raw = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
    const lines: { name: string; qty: number; sum: number }[] = [];
    let total = 0;
    for (const it of raw) {
      const dish = MENU[String(it?.id)];
      const qty = Math.floor(Number(it?.qty));
      if (!dish || !Number.isFinite(qty) || qty < 1 || qty > 30) {
        return json({ ok: false, error: "invalid item" }, 400);
      }
      const sum = dishPrice(dish) * qty;
      total += sum;
      lines.push({ name: dish.n[lang] ?? dish.n.ua, qty, sum });
    }
    if (lines.length === 0) return json({ ok: false, error: "empty cart" }, 400);

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

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

    // Анти-спам (доп. слой)
    const fp = `${phone}|${lines.map((l) => l.name + "x" + l.qty).join(",")}`;
    if (tooMany(ip)) return json({ ok: false, error: "rate limited" }, 429);
    if (isDup(fp)) return json({ ok: false, error: "duplicate" }, 429);

    // Текст заказа собирает СЕРВЕР
    let msg = `🍣 НОВЕ ЗАМОВЛЕННЯ NiNi Sushi\n\n`;
    msg += `👤 ${name}\n📞 ${phone}\n`;
    if (telegram) msg += `✈️ ${telegram}\n`;
    msg += `📍 ${address}\n`;
    if (lat && lng) msg += `📍 Координати: ${lat},${lng}\n🗺 https://maps.google.com/?q=${lat},${lng}\n`;
    if (comment) msg += `📝 ${comment}\n`;
    msg += `\n— — —\n`;
    for (const l of lines) msg += `• ${l.name} × ${l.qty} = ${fmtPrice(l.sum)}\n`;
    msg += `— — —\n💰 РАЗОМ: ${fmtPrice(total)}`;

    const tg = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: msg }),
    });
    const data = await tg.json();
    return json({ ok: data.ok === true }, data.ok ? 200 : 500);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
