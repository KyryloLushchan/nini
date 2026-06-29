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
let dishes = [];
let recipesByDish = {};
let editingDishId = null;

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
  $('tabCalc').addEventListener('click', ()=> switchTab('calc'));

  $('incSubmit').addEventListener('click', handleIncome);

  // Калькуляция
  $('addDishBtn').addEventListener('click', ()=> openDishForm(null));
  $('dishSave').addEventListener('click', handleDishSave);
  $('dishCancel').addEventListener('click', closeDishForm);
  $('dishDelete').addEventListener('click', handleDishDelete);
  $('calcBody').addEventListener('click', onCalcClick);
  $('calcBody').addEventListener('change', onCalcChange);
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
  const map = {
    stock:  { btn: 'tabStock',  panel: 'panelStock'  },
    income: { btn: 'tabIncome', panel: 'panelIncome' },
    calc:   { btn: 'tabCalc',   panel: 'panelCalc'   }
  };
  Object.keys(map).forEach(k=>{
    $(map[k].btn).classList.toggle('is-active', k === tab);
    $(map[k].panel).classList.toggle('hidden', k !== tab);
  });
  if(tab === 'calc') loadCalc();
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

/* ============================================================
   КАЛЬКУЛЯЦИЯ — блюда и рецепты
   ============================================================ */

/* На случай открытия вкладки до загрузки остатков — подтянуть ингредиенты. */
async function ensureIngredients(){
  if(ingredients.length) return;
  const { data, error } = await supa
    .from('ingredients')
    .select('id, name, unit, stock, min_stock, price')
    .order('name', { ascending: true });
  if(error) throw error;
  ingredients = data || [];
}

async function loadCalc(){
  const body = $('calcBody');
  body.innerHTML = '<div class="center-load"><span class="spinner"></span> Загрузка…</div>';
  try{
    await ensureIngredients();
    const [dRes, rRes] = await Promise.all([
      supa.from('dishes').select('id, code, name, category, price, active').order('name', { ascending: true }),
      supa.from('recipe').select('id, dish_id, ingredient_id, amount, ingredients(name, unit)')
    ]);
    if(dRes.error) throw dRes.error;
    if(rRes.error) throw rRes.error;

    dishes = dRes.data || [];
    recipesByDish = {};
    (rRes.data || []).forEach(r=>{
      (recipesByDish[r.dish_id] = recipesByDish[r.dish_id] || []).push(r);
    });
    // строки рецепта — по названию ингредиента
    Object.values(recipesByDish).forEach(list=>
      list.sort((a,b)=> (a.ingredients?.name || '').localeCompare(b.ingredients?.name || '', 'ru'))
    );
    renderCalc();
  }catch(e){
    body.innerHTML = '<p class="stock-empty">Не удалось загрузить блюда: ' + escapeHtml(e.message) + '</p>';
  }
}

function ingredientOptions(selectedId){
  const opts = ingredients.map(it=>
    `<option value="${it.id}"${String(it.id) === String(selectedId) ? ' selected' : ''}>` +
    `${escapeHtml(it.name)}${it.unit ? ' (' + escapeHtml(it.unit) + ')' : ''}</option>`
  ).join('');
  return opts;
}

function renderCalc(){
  const body = $('calcBody');
  if(!dishes.length){
    body.innerHTML = '<p class="stock-empty">Блюд пока нет. Нажмите «＋ Блюдо».</p>';
    return;
  }
  body.innerHTML = dishes.map(d=>{
    const rows = (recipesByDish[d.id] || []);
    const recipeHtml = rows.length
      ? `<ul class="recipe-list">${rows.map(r=>{
          const unit = r.ingredients?.unit || '';
          const name = r.ingredients?.name || ('#' + r.ingredient_id);
          return `
            <li class="recipe-row" data-recipe-id="${r.id}">
              <span class="recipe-row__name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
              <input class="recipe-row__amount" type="number" min="0" step="any" inputmode="decimal"
                     value="${escapeHtml(r.amount)}" data-action="edit-amount" data-recipe-id="${r.id}">
              <span class="recipe-row__unit">${escapeHtml(unit)}</span>
              <button class="recipe-row__del" data-action="del-recipe" data-recipe-id="${r.id}" title="Удалить">✕</button>
            </li>`;
        }).join('')}</ul>`
      : '<p class="recipe-empty">Ингредиентов пока нет</p>';

    const priceTxt = (d.price != null && d.price !== '') ? fmtNum(d.price) : '—';
    const meta = [
      d.category ? escapeHtml(d.category) : null,
      d.code ? 'код ' + escapeHtml(d.code) : null,
      priceTxt,
      d.active === false ? '<span class="off">не активно</span>' : null
    ].filter(Boolean).join(' · ');

    return `
      <div class="dish-card" data-dish-id="${d.id}">
        <div class="dish-card__head">
          <div>
            <div class="dish-card__name">${escapeHtml(d.name)}</div>
            <div class="dish-card__meta">${meta}</div>
          </div>
          <button class="btn btn--ghost dish-card__edit" data-action="edit-dish" data-id="${d.id}">Изменить</button>
        </div>
        ${recipeHtml}
        <div class="recipe-add">
          <select class="recipe-add__sel">${ingredientOptions()}</select>
          <input class="recipe-add__amt" type="number" min="0" step="any" inputmode="decimal" placeholder="кол-во">
          <button class="btn btn--ghost" data-action="add-recipe" data-dish-id="${d.id}">＋ Ингредиент</button>
        </div>
      </div>`;
  }).join('');
}

/* ---------- Форма блюда ---------- */
function openDishForm(dish){
  editingDishId = dish ? dish.id : null;
  $('dishCode').value     = dish?.code || '';
  $('dishName').value     = dish?.name || '';
  $('dishCategory').value = dish?.category || '';
  $('dishPrice').value    = (dish && dish.price != null) ? dish.price : '';
  $('dishNote').className = 'form__note';
  $('dishNote').textContent = '';
  $('dishDelete').classList.toggle('hidden', !dish);
  show($('dishForm'));
  $('dishForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  $('dishName').focus();
}

function closeDishForm(){
  editingDishId = null;
  hide($('dishForm'));
}

async function handleDishSave(){
  const note = $('dishNote');
  note.className = 'form__note';

  const code     = $('dishCode').value.trim();
  const name     = $('dishName').value.trim();
  const category = $('dishCategory').value.trim();
  const priceRaw = $('dishPrice').value.trim();

  if(!name){ note.textContent = '⚠️ Укажите название'; note.classList.add('is-error'); return; }
  let price = null;
  if(priceRaw !== ''){
    price = Number(priceRaw);
    if(!Number.isFinite(price) || price < 0){ note.textContent = '⚠️ Некорректная цена'; note.classList.add('is-error'); return; }
  }

  const payload = { code: code || null, name, category: category || null, price };
  const btn = $('dishSave');
  btn.disabled = true;
  const html = btn.innerHTML;
  btn.innerHTML = '<span class="spinner spinner--btn"></span>';
  try{
    let error;
    if(editingDishId){
      ({ error } = await supa.from('dishes').update(payload).eq('id', editingDishId));
    } else {
      ({ error } = await supa.from('dishes').insert(payload));
    }
    if(error) throw error;
    closeDishForm();
    setCalcNote('✅ Блюдо сохранено', true);
    await loadCalc();
  }catch(e){
    note.textContent = 'Ошибка: ' + e.message;
    note.classList.add('is-error');
  }finally{
    btn.disabled = false;
    btn.innerHTML = html;
  }
}

async function handleDishDelete(){
  if(!editingDishId) return;
  const dish = dishes.find(d=> String(d.id) === String(editingDishId));
  if(!confirm(`Удалить блюдо «${dish?.name || ''}»? Рецепт удалится вместе с ним.`)) return;
  try{
    const { error } = await supa.from('dishes').delete().eq('id', editingDishId);
    if(error) throw error;
    closeDishForm();
    setCalcNote('🗑 Блюдо удалено', true);
    await loadCalc();
  }catch(e){
    const note = $('dishNote');
    note.className = 'form__note is-error';
    note.textContent = 'Ошибка: ' + e.message;
  }
}

/* ---------- Рецепт внутри блюда (делегирование событий) ---------- */
function onCalcClick(e){
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const action = el.dataset.action;
  if(action === 'edit-dish'){
    const dish = dishes.find(d=> String(d.id) === el.dataset.id);
    if(dish) openDishForm(dish);
  } else if(action === 'del-recipe'){
    delRecipe(el.dataset.recipeId);
  } else if(action === 'add-recipe'){
    addRecipe(el);
  }
}

function onCalcChange(e){
  const inp = e.target.closest('[data-action="edit-amount"]');
  if(inp) editAmount(inp);
}

async function addRecipe(btn){
  const card = btn.closest('.dish-card');
  const dish_id = btn.dataset.dishId;
  const sel = card.querySelector('.recipe-add__sel');
  const amtEl = card.querySelector('.recipe-add__amt');
  const ingredient_id = sel.value;
  const amount = Number(amtEl.value);

  if(!ingredient_id){ setCalcNote('⚠️ Выберите ингредиент', false); return; }
  if(!Number.isFinite(amount) || amount <= 0){ setCalcNote('⚠️ Количество должно быть больше 0', false); return; }

  try{
    // upsert по уникальному (dish_id, ingredient_id): если есть — обновит amount
    const { error } = await supa.from('recipe').upsert(
      { dish_id, ingredient_id, amount },
      { onConflict: 'dish_id,ingredient_id' }
    );
    if(error) throw error;
    setCalcNote('✅ Сохранено', true);
    await loadCalc();
  }catch(e){
    setCalcNote('Ошибка: ' + e.message, false);
  }
}

async function editAmount(inp){
  const amount = Number(inp.value);
  if(!Number.isFinite(amount) || amount <= 0){
    setCalcNote('⚠️ Количество должно быть больше 0', false);
    await loadCalc(); // вернуть прежнее значение
    return;
  }
  try{
    const { error } = await supa.from('recipe').update({ amount }).eq('id', inp.dataset.recipeId);
    if(error) throw error;
    setCalcNote('✅ Сохранено', true);
    await loadCalc();
  }catch(e){
    setCalcNote('Ошибка: ' + e.message, false);
    await loadCalc();
  }
}

async function delRecipe(recipeId){
  try{
    const { error } = await supa.from('recipe').delete().eq('id', recipeId);
    if(error) throw error;
    setCalcNote('🗑 Ингредиент убран', true);
    await loadCalc();
  }catch(e){
    setCalcNote('Ошибка: ' + e.message, false);
  }
}

function setCalcNote(msg, ok){
  const note = $('calcNote');
  note.className = 'form__note ' + (ok ? 'is-ok' : 'is-error');
  note.textContent = msg;
}

/* ---------- Безопасный вывод текста ---------- */
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}
