/* ============================================================
   NiNi Sushi — SUPABASE (регистрация/вход/заказы) + TELEGRAM
   ------------------------------------------------------------
   ⚙️ НАСТРОЙКА — заполни 4 значения ниже.
   Пока они пустые, сайт работает в "demo"-режиме:
   регистрация/вход показывают сообщение, а заказ
   отправляется через WhatsApp/Telegram ссылкой.

   Подробная инструкция — в README.md
   ============================================================ */

const CONFIG = {
  SUPABASE_URL:      "https://rdxlvebvwjzfmzvguqaf.supabase.co",   // напр. https://xxxx.supabase.co
  SUPABASE_ANON_KEY: "sb_publishable_PDCTi1UKKDVl2-29eN-QKQ_anyhzzzf",   // публичный anon-ключ
  WHATSAPP:          "84367021338" // запасной канал заказа
};

/* ---------- Подключение Supabase (если настроен) ---------- */
let supa = null;
(function loadSupabase(){
  if(!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) return;
  const s = document.createElement('script');
  // фиксированная версия + SRI: если CDN скомпрометируют, чужой код не выполнится
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.108.2/dist/umd/supabase.js";
  s.integrity = "sha384-nD3dwv4+ZqdYnmZKe/249ImlV04om7xTCcsoSeQYI+RO+XlKPoqAWaJR1M5SJH9p";
  s.crossOrigin = "anonymous";
  s.onload = ()=>{
    supa = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    refreshUser();
  };
  document.head.appendChild(s);
})();

let currentUser = null;

/* На странице несколько Turnstile-виджетов — берём/сбрасываем токен конкретного */
function turnstileGet(id){ try{ const el=document.getElementById(id); return (window.turnstile && el) ? (turnstile.getResponse(el) || '') : ''; }catch(_e){ return ''; } }
function turnstileReset(id){ try{ const el=document.getElementById(id); if(window.turnstile && el) turnstile.reset(el); }catch(_e){} }

async function refreshUser(){
  if(!supa) return;
  const { data } = await supa.auth.getUser();
  currentUser = data?.user || null;
  updateAuthLabels();
}

function updateAuthLabels(){
  const t = I18N[window.currentLang || 'ua'];
  const btn = document.getElementById('accountBtn');
  if(currentUser){
    btn.title = currentUser.email;
  } else {
    btn.title = t.login;
  }
}

/* ---------- РЕГИСТРАЦИЯ / ВХОД ---------- */
let authMode = 'login'; // или 'register'

function initAuthUI(){
  const tabLogin = document.getElementById('tabLogin');
  const tabReg   = document.getElementById('tabRegister');
  const submit   = document.getElementById('authSubmit');

  tabLogin.addEventListener('click', ()=>{ authMode='login'; tabLogin.classList.add('is-active'); tabReg.classList.remove('is-active'); submit.textContent = I18N[currentLang].login; });
  tabReg.addEventListener('click',   ()=>{ authMode='register'; tabReg.classList.add('is-active'); tabLogin.classList.remove('is-active'); submit.textContent = I18N[currentLang].register; });

  submit.addEventListener('click', handleAuth);

  const forgot = document.getElementById('forgotPassword');
  if(forgot) forgot.addEventListener('click', handleForgotPassword);
}

async function handleForgotPassword(){
  const note   = document.getElementById('authNote');
  const forgot = document.getElementById('forgotPassword');
  const t = I18N[window.currentLang || 'ua'];
  note.className = 'form__note';
  note.textContent = '';

  let email = document.getElementById('authEmail').value.trim();
  if(!email){
    email = (prompt('Email:') || '').trim();
  }
  if(!email){ note.textContent = '⚠️ Email'; note.classList.add('is-error'); return; }

  if(!supa){
    note.textContent = 'Supabase ще не налаштовано (див. README.md).';
    note.classList.add('is-error');
    return;
  }

  // индикатор ожидания + блокировка ссылки
  if(forgot) forgot.disabled = true;
  note.innerHTML = `<span class="note-loading"><span class="spinner"></span> ${t.reset_sending}</span>`;

  try{
    const captchaToken = turnstileGet('authTurnstile');
    const { error } = await supa.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://kyrylolushchan.github.io/nini/reset.html',
      captchaToken: captchaToken || undefined
    });
    if(error){
      note.className = 'form__note is-error';
      note.textContent = error.message;
      return;
    }
    note.className = 'form__note is-ok';
    note.innerHTML = `<span class="reset-ok"><span class="reset-ok__check">✅</span><span class="reset-ok__text">${t.reset_sent}</span></span>`;
  }catch(err){
    note.className = 'form__note is-error';
    note.textContent = 'Помилка: ' + err.message;
  }finally{
    if(forgot) forgot.disabled = false;
    turnstileReset('authTurnstile');
  }
}

async function handleAuth(){
  const note  = document.getElementById('authNote');
  const email = document.getElementById('authEmail').value.trim();
  const pass  = document.getElementById('authPassword').value;
  note.className = 'form__note';

  if(!email || !pass){ note.textContent = '⚠️ Email + пароль'; note.classList.add('is-error'); return; }

  if(!supa){
    note.textContent = 'Supabase ще не налаштовано (див. README.md).';
    note.classList.add('is-error');
    return;
  }

  try{
    const captchaToken = turnstileGet('authTurnstile');
    const options = captchaToken ? { captchaToken } : undefined;
    let res;
    if(authMode === 'register'){
      res = await supa.auth.signUp({ email, password: pass, options });
    } else {
      res = await supa.auth.signInWithPassword({ email, password: pass, options });
    }
    if(res.error){ note.textContent = res.error.message; note.classList.add('is-error'); return; }

    await refreshUser();
    note.textContent = authMode === 'register' ? '✅ Готово! Перевір пошту.' : '✅ Вхід виконано.';
    note.classList.add('is-ok');
    setTimeout(()=> closeModal('authModal'), 1200);
  }catch(err){
    note.textContent = 'Помилка: ' + err.message;
    note.classList.add('is-error');
  }finally{
    turnstileReset('authTurnstile');
  }
}

/* ---------- ЛИЧНЫЙ КАБИНЕТ ---------- */
function initAccountUI(){
  const logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

/* Клик по иконке аккаунта: вошёл -> кабинет, нет -> вход/регистрация */
function handleAccountClick(){
  if(currentUser) openAccountModal();
  else openModal('authModal');
}

async function handleLogout(){
  if(supa) await supa.auth.signOut();
  currentUser = null;
  updateAuthLabels();
  closeModal('accountModal');
}

async function openAccountModal(){
  const emailEl  = document.getElementById('accountEmail');
  const ordersEl = document.getElementById('accountOrders');
  if(emailEl)  emailEl.textContent = currentUser ? currentUser.email : '';
  if(ordersEl) ordersEl.innerHTML = '<p class="account__empty">Завантаження…</p>';

  openModal('accountModal');
  await loadMyOrders();
}

async function loadMyOrders(){
  const ordersEl = document.getElementById('accountOrders');
  if(!ordersEl) return;

  if(!supa || !currentUser){
    ordersEl.innerHTML = '<p class="account__empty">Замовлень поки немає</p>';
    return;
  }

  try{
    const { data, error } = await supa
      .from('orders')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if(error) throw error;
    renderMyOrders(data || []);
  }catch(e){
    console.warn('Load orders error', e);
    ordersEl.innerHTML = '<p class="account__empty">Не вдалося завантажити замовлення</p>';
  }
}

function renderMyOrders(orders){
  const ordersEl = document.getElementById('accountOrders');
  if(!ordersEl) return;

  if(!orders.length){
    ordersEl.innerHTML = '<p class="account__empty">Замовлень поки немає</p>';
    return;
  }

  ordersEl.innerHTML = orders.map(o=>{
    const date = o.created_at
      ? new Date(o.created_at).toLocaleString('uk-UA', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : '';
    const items = Array.isArray(o.items) ? o.items : [];
    const list = items.map(i=> `<li>${i.name} × ${i.qty}</li>`).join('');
    const payText = o.payment === 'cash' ? 'Готівка кур\'єру' : (o.payment === 'qr' ? 'QR кур\'єру' : '');
    return `
      <div class="order-card">
        <div class="order-card__top">
          <span class="order-card__date">${date}</span>
          <strong class="order-card__total">${fmtPrice(o.total || 0)}</strong>
        </div>
        <ul class="order-card__items">${list}</ul>
        ${payText ? `<div class="order-card__pay">💳 ${payText}</div>` : ''}
      </div>`;
  }).join('');
}

/* ---------- ОТПРАВКА ЗАКАЗА ---------- */
function initOrderUI(){
  document.getElementById('orderSend').addEventListener('click', sendOrder);
}

async function sendOrder(){
  const lang = window.currentLang || 'ua';
  const note = document.getElementById('orderNote');
  note.className = 'form__note';

  const name    = document.getElementById('ordName').value.trim();
  const phone   = document.getElementById('ordPhone').value.trim();
  let   telegram= document.getElementById('ordTelegram').value.trim();
  const address = document.getElementById('ordAddress').value.trim();
  const comment = document.getElementById('ordComment').value.trim();
  const lat     = document.getElementById('ordLat').value.trim();
  const lng     = document.getElementById('ordLng').value.trim();

  // поле Telegram обязательно только для ua/ru
  const telegramRequired = (lang === 'ua' || lang === 'ru');

  if(!name || !phone || !address || (telegramRequired && !telegram)){
    note.textContent = telegramRequired
      ? '⚠️ Заповни ім\'я, телефон, Telegram і адресу'
      : '⚠️ Заповни ім\'я, телефон і адресу';
    note.classList.add('is-error');
    return;
  }
  // нормализуем: гарантируем ведущий @
  if(telegram && telegram[0] !== '@') telegram = '@' + telegram;
  if(Cart.count() === 0){ note.textContent='Кошик порожній'; note.classList.add('is-error'); return; }

  // Проверка «я не робот» (Cloudflare Turnstile)
  const tsToken = turnstileGet('ordTurnstile');
  if(!tsToken){
    note.textContent = '⚠️ Підтвердіть, що ви не робот';
    note.classList.add('is-error');
    return;
  }

  const items = Cart.list(lang);

  // JWT пользователя (если вошёл) — сервер сам проверит его и привяжет заказ
  let userToken = '';
  if(supa){
    try{ const { data } = await supa.auth.getSession(); userToken = data?.session?.access_token || ''; }catch(_e){}
  }

  // Отправка СТРУКТУРИРОВАННОГО заказа — текст собирает, проверяет и СОХРАНЯЕТ в БД сервер
  // (клиент не пишет в БД напрямую и не присылает готовый текст — endpoint нельзя спамить)
  const payload = {
    name, phone, telegram, address, comment,
    lat: lat || '', lng: lng || '',
    lang,
    turnstileToken: tsToken,
    userToken,
    items: items.map(i => ({ id: i.id, qty: i.qty }))
  };

  const sendBtn = document.getElementById('orderSend');
  sendBtn.disabled = true;
  try{
    const res = await fetch("https://rdxlvebvwjzfmzvguqaf.supabase.co/functions/v1/send-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(res.status === 403 && data.error === 'region not allowed'){
      const msg = {
        ua: '🚫 Доставка доступна лише у В\'єтнамі',
        ru: '🚫 Доставка доступна только во Вьетнаме',
        en: '🚫 Delivery is available only in Vietnam',
        vn: '🚫 Chỉ giao hàng trong Việt Nam'
      };
      note.textContent = msg[lang] || msg.en;
      note.classList.add('is-error');
      return;
    }
    if(!res.ok || !data.ok) throw new Error('Edge Function response not ok');

    note.textContent = '';
    Cart.clear();
    closeModal('orderModal');
    openModal('orderSuccessModal');
  }catch(e){
    console.warn('Edge Function error', e);
    note.textContent = '❌ Sending failed, please try again';
    note.classList.add('is-error');
  }finally{
    sendBtn.disabled = false;
    // токен Turnstile одноразовый — сбрасываем виджет для следующей попытки
    turnstileReset('ordTurnstile');
  }
}

/* ---------- запуск ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  initAuthUI();
  initAccountUI();
  initOrderUI();
});
