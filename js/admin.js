/* ============================================================
   NiNi Sushi — АДМИН СКЛАДА
   ------------------------------------------------------------
   Защищённая страница (admin.html): вход через Supabase Auth,
   просмотр остатков и оформление прихода.

   ⚠️ Остаток (ingredients.stock) пересчитывает ТРИГГЕР в БД при
   вставке в movements. Здесь мы НИКОГДА не пишем stock напрямую —
   только INSERT в movements.

   Supabase URL + anon key — те же, что и на сайте (js/supabase.js).
   ============================================================ */

const CONFIG = {
  SUPABASE_URL:      "https://rdxlvebvwjzfmzvguqaf.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_PDCTi1UKKDVl2-29eN-QKQ_anyhzzzf"
};

let supa = null;
let ingredients = [];

/* ---------- Загрузка Supabase (тот же CDN + SRI, что и на сайте) ---------- */
(function loadSupabase(){
  const s = document.createElement('script');
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.108.2/dist/umd/supabase.js";
  s.integrity = "sha384-nD3dwv4+ZqdYnmZKe/249ImlV04om7xTCcsoSeQYI+RO+XlKPoqAWaJR1M5SJH9p";
  s.crossOrigin = "anonymous";
  s.onload = init;
  s.onerror = ()=>{ document.body.innerHTML = '<p style="padding:40px;text-align:center">Не удалось загрузить Supabase</p>'; };
  document.head.appendChild(s);
})();

/* ---------- Утилиты ---------- */
const $ = id => document.getElementById(id);
const fmtNum = v => {
  const n = Number(v);
  if(!Number.isFinite(n)) return '—';
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
};

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

/* ---------- Инициализация ---------- */
async function init(){
  supa = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  bindUI();

  // Восстанавливаем сессию при перезагрузке
  const { data } = await supa.auth.getSession();
  applySession(data?.session || null);

  // Реакция на вход/выход
  supa.auth.onAuthStateChange((_event, session)=> applySession(session));
}

function applySession(session){
  if(session){
    hide($('loginView'));
    show($('appView'));
    $('userEmail').textContent = session.user?.email || '';
    loadStock();
  } else {
    hide($('appView'));
    show($('loginView'));
  }
}

/* ---------- Привязка событий ---------- */
function bindUI(){
  $('loginBtn').addEventListener('click', handleLogin);
  $('password').addEventListener('keydown', e => { if(e.key === 'Enter') handleLogin(); });
  $('logoutBtn').addEventListener('click', handleLogout);

  $('tabStock').addEventListener('click', ()=> switchTab('stock'));
  $('tabIncome').addEventListener('click', ()=> switchTab('income'));

  $('incSubmit').addEventListener('click', handleIncome);
}

/* ---------- Вход / выход ---------- */
async function handleLogin(){
  const note  = $('loginNote');
  const email = $('email').value.trim();
  const pass  = $('password').value;
  note.className = 'form__note';

  if(!email || !pass){ note.textContent = '⚠️ Введите email и пароль'; note.classList.add('is-error'); return; }

  const btn = $('loginBtn');
  btn.disabled = true;
  const html = btn.innerHTML;
  btn.innerHTML = '<span class="spinner spinner--btn"></span>';
  try{
    const { error } = await supa.auth.signInWithPassword({ email, password: pass });
    if(error){ note.textContent = error.message; note.classList.add('is-error'); return; }
    // applySession сработает через onAuthStateChange
    $('password').value = '';
  }catch(e){
    note.textContent = 'Ошибка: ' + e.message; note.classList.add('is-error');
  }finally{
    btn.disabled = false;
    btn.innerHTML = html;
  }
}

async function handleLogout(){
  try{ await supa.auth.signOut(); }catch(_e){}
  // applySession сработает через onAuthStateChange
}

/* ---------- Вкладки ---------- */
function switchTab(tab){
  const isStock = tab === 'stock';
  $('tabStock').classList.toggle('is-active', isStock);
  $('tabIncome').classList.toggle('is-active', !isStock);
  $('panelStock').classList.toggle('hidden', !isStock);
  $('panelIncome').classList.toggle('hidden', isStock);
}

/* ---------- Остатки ---------- */
async function loadStock(){
  const body = $('stockBody');
  body.innerHTML = '<div class="center-load"><span class="spinner"></span> Загрузка…</div>';
  try{
    const { data, error } = await supa
      .from('ingredients')
      .select('id, name, unit, stock, min_stock, price')
      .order('name', { ascending: true });
    if(error) throw error;
    ingredients = data || [];
    renderStock(ingredients);
    fillIngredientSelect(ingredients);
  }catch(e){
    body.innerHTML = '<p class="stock-empty">Не удалось загрузить остатки: ' + e.message + '</p>';
  }
}

function renderStock(list){
  const body = $('stockBody');
  if(!list.length){
    body.innerHTML = '<p class="stock-empty">Ингредиентов пока нет</p>';
    return;
  }
  const rows = list.map(it=>{
    const low = Number(it.stock) <= Number(it.min_stock);
    return `
      <tr class="${low ? 'is-low' : ''}">
        <td>${escapeHtml(it.name)}${low ? '<span class="badge-low">мало</span>' : ''}</td>
        <td class="num"><span class="stock-val">${fmtNum(it.stock)}</span></td>
        <td>${escapeHtml(it.unit || '')}</td>
        <td class="num">${fmtNum(it.min_stock)}</td>
      </tr>`;
  }).join('');
  body.innerHTML = `
    <div class="table-wrap">
      <table class="stock">
        <thead>
          <tr>
            <th>Название</th>
            <th class="num">Остаток</th>
            <th>Ед.</th>
            <th class="num">Мин.</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ---------- Приход ---------- */
function fillIngredientSelect(list){
  const sel = $('incIngredient');
  sel.innerHTML = list.map(it=>
    `<option value="${it.id}">${escapeHtml(it.name)}${it.unit ? ' (' + escapeHtml(it.unit) + ')' : ''}</option>`
  ).join('');
}

async function handleIncome(){
  const note = $('incNoteMsg');
  note.className = 'form__note';

  const ingredient_id = $('incIngredient').value;
  const amount = Number($('incAmount').value);
  const noteText = $('incNote').value.trim();

  if(!ingredient_id){ note.textContent = '⚠️ Выберите ингредиент'; note.classList.add('is-error'); return; }
  if(!Number.isFinite(amount) || amount <= 0){ note.textContent = '⚠️ Количество должно быть больше 0'; note.classList.add('is-error'); return; }

  const btn = $('incSubmit');
  btn.disabled = true;
  const html = btn.innerHTML;
  btn.innerHTML = '<span class="spinner spinner--btn"></span>';
  try{
    // Только INSERT в movements — stock пересчитает триггер БД
    const { error } = await supa.from('movements').insert({
      ingredient_id,
      type: 'in',
      amount,
      source: 'manual',
      note: noteText || null
    });
    if(error) throw error;

    // очистить форму + подтверждение + обновить остатки
    $('incAmount').value = '';
    $('incNote').value = '';
    note.textContent = '✅ Приход добавлен';
    note.classList.add('is-ok');
    await loadStock();
  }catch(e){
    note.textContent = 'Ошибка: ' + e.message;
    note.classList.add('is-error');
  }finally{
    btn.disabled = false;
    btn.innerHTML = html;
  }
}

/* ---------- Безопасный вывод текста ---------- */
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}
