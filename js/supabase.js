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
  SUPABASE_URL:      "https://wqovkezgzpwyyxavrrtv.supabase.co",   // напр. https://xxxx.supabase.co
  SUPABASE_ANON_KEY: "sb_publishable_Xhpgpka8R3sThsfqCDikhQ_DxpK9if0",   // публичный anon-ключ
  TG_BOT_TOKEN:      "8870609367:AAHHkAfiOgXcenmrBxZCHUdL75bitLxqGyQ",   // токен Telegram-бота (для авто-уведомлений; необязательно)
  TG_CHAT_ID:        "524375262",   // твой chat_id в Telegram (куда слать заказы)
  WHATSAPP:          "84367021338" // запасной канал заказа
};

/* ---------- Подключение Supabase (если настроен) ---------- */
let supa = null;
(function loadSupabase(){
  if(!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) return;
  const s = document.createElement('script');
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  s.onload = ()=>{
    supa = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    refreshUser();
  };
  document.head.appendChild(s);
})();

let currentUser = null;

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
    let res;
    if(authMode === 'register'){
      res = await supa.auth.signUp({ email, password: pass });
    } else {
      res = await supa.auth.signInWithPassword({ email, password: pass });
    }
    if(res.error){ note.textContent = res.error.message; note.classList.add('is-error'); return; }

    await refreshUser();
    note.textContent = authMode === 'register' ? '✅ Готово! Перевір пошту.' : '✅ Вхід виконано.';
    note.classList.add('is-ok');
    setTimeout(()=> closeModal('authModal'), 1200);
  }catch(err){
    note.textContent = 'Помилка: ' + err.message;
    note.classList.add('is-error');
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
    const payText = o.payment === 'cash' ? 'Готівка кур\'єру' : 'QR кур\'єру';
    return `
      <div class="order-card">
        <div class="order-card__top">
          <span class="order-card__date">${date}</span>
          <strong class="order-card__total">${fmtPrice(o.total || 0)}</strong>
        </div>
        <ul class="order-card__items">${list}</ul>
        <div class="order-card__pay">💳 ${payText}</div>
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
  const address = document.getElementById('ordAddress').value.trim();
  const pay     = document.querySelector('input[name="pay"]:checked').value;
  const comment = document.getElementById('ordComment').value.trim();
  const lat     = document.getElementById('ordLat').value.trim();
  const lng     = document.getElementById('ordLng').value.trim();

  if(!name || !phone || !address){
    note.textContent = '⚠️ Заповни ім\'я, телефон і адресу';
    note.classList.add('is-error');
    return;
  }
  if(Cart.count() === 0){ note.textContent='Кошик порожній'; note.classList.add('is-error'); return; }

  const items = Cart.list(lang);
  const total = Cart.total();
  const payText = pay === 'cash' ? 'Готівка кур\'єру' : 'QR кур\'єру';

  // 1) Сохранить в Supabase (если настроен)
  if(supa){
    try{
      await supa.from('orders').insert([{
        customer_name: name, phone, address, payment: pay,
        comment, items, total,
        lat: lat || null, lng: lng || null,
        user_id: currentUser ? currentUser.id : null
      }]);
    }catch(e){ console.warn('Supabase insert error', e); }
  }

  // 2) Текст заказа
  let msg = `🍣 НОВЕ ЗАМОВЛЕННЯ NiNi Sushi\n\n`;
  msg += `👤 ${name}\n📞 ${phone}\n📍 ${address}\n💳 ${payText}\n`;
  if(lat && lng){
    msg += `📍 Координати: ${lat},${lng}\n🗺 https://maps.google.com/?q=${lat},${lng}\n`;
  }
  if(comment) msg += `📝 ${comment}\n`;
  msg += `\n— — —\n`;
  items.forEach(i=>{ msg += `• ${i.name} × ${i.qty} = ${fmtPrice(i.sum)}\n`; });
  msg += `— — —\n💰 РАЗОМ: ${fmtPrice(total)}`;

  // 3) Отправка заявки в Telegram (фоном)
  const sendBtn = document.getElementById('orderSend');
  sendBtn.disabled = true;
  try{
    const res = await fetch(`https://api.telegram.org/bot${CONFIG.TG_BOT_TOKEN}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id: CONFIG.TG_CHAT_ID, text: msg })
    });
    const data = await res.json();
    if(!res.ok || !data.ok) throw new Error('Telegram response not ok');

    note.textContent = '✅ Замовлення відправлено!';
    note.classList.add('is-ok');
    Cart.clear();
    setTimeout(()=> closeModal('orderModal'), 1500);
  }catch(e){
    console.warn('TG error', e);
    note.textContent = '❌ Помилка відправки, спробуйте ще раз';
    note.classList.add('is-error');
  }finally{
    sendBtn.disabled = false;
  }
}

/* ---------- запуск ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  initAuthUI();
  initAccountUI();
  initOrderUI();
});
