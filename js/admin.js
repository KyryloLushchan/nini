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
let invRows = [];   // локальные строки распознанной накладной (до «Внести всё»)

/* ---------- Загрузка Supabase (тот же CDN + SRI, что и на сайте) ---------- */
(function loadSupabase(){
  const s = document.createElement('script');
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.108.2/dist/umd/supabase.js";
  s.integrity = "sha384-nD3dwv4+ZqdYnmZKe/249ImlV04om7xTCcsoSeQYI+RO+XlKPoqAWaJR1M5SJH9p";
  s.crossOrigin = "anonymous";
  s.onload = init;
  s.onerror = ()=>{ document.body.innerHTML = '<p style="padding:40px;text-align:center">Failed to load Supabase</p>'; };
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
  $('tabCash').addEventListener('click', ()=> switchTab('cash'));
  $('tabMoves').addEventListener('click', ()=> switchTab('moves'));

  // Движения
  $('movesType').addEventListener('change', loadMoves);
  $('movesIng').addEventListener('change', loadMoves);
  $('movesRefresh').addEventListener('click', loadMoves);

  $('incSubmit').addEventListener('click', handleIncome);
  $('incIngredient').addEventListener('change', toggleIncNewFields);

  // Редактирование остатка (корректирующее движение adjust)
  $('stockBody').addEventListener('change', (e)=>{
    const inp = e.target.closest('.stock-edit');
    if(inp) handleStockEdit(inp);
  });

  // Фото-приход накладной
  $('invRecognize').addEventListener('click', handleRecognizeInvoice);
  $('invResult').addEventListener('click', (e)=>{
    const del = e.target.closest('.inv-del');
    if(del){ deleteInvRow(Number(del.dataset.index)); return; }
    if(e.target.closest('#invSubmit')) handleSubmitInvoice();
    else if(e.target.closest('#invCancel')) cancelInvoice();
  });

  // Калькуляция
  $('addDishBtn').addEventListener('click', ()=> openDishForm(null));
  $('dishSave').addEventListener('click', handleDishSave);
  $('dishCancel').addEventListener('click', closeDishForm);
  $('dishDelete').addEventListener('click', handleDishDelete);
  $('calcBody').addEventListener('click', onCalcClick);
  $('calcBody').addEventListener('change', onCalcChange);

  // Касса
  $('cashAddBtn').addEventListener('click', openCashForm);
  $('cashCancel').addEventListener('click', closeCashForm);
  $('cashSave').addEventListener('click', handleCashSave);
  $('cashRefreshBtn').addEventListener('click', loadCash);
  // Редактирование/удаление движений кассы (прямой UPDATE/DELETE)
  $('cashBody').addEventListener('change', (e)=>{
    const amt = e.target.closest('.cash-amt-edit');
    if(amt){ handleCashAmountEdit(amt); return; }
    const nt = e.target.closest('.cash-note-edit');
    if(nt) handleCashNoteEdit(nt);
  });
  $('cashBody').addEventListener('click', (e)=>{
    const del = e.target.closest('.cash-del');
    if(del) handleCashDelete(del.closest('.cash-row').dataset.id);
  });
}

/* ---------- Вход / выход ---------- */
async function handleLogin(){
  const note  = $('loginNote');
  const email = $('email').value.trim();
  const pass  = $('password').value;
  note.className = 'form__note';

  if(!email || !pass){ note.textContent = '⚠️ Enter email and password'; note.classList.add('is-error'); return; }

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
    note.textContent = 'Error: ' + e.message; note.classList.add('is-error');
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
    calc:   { btn: 'tabCalc',   panel: 'panelCalc'   },
    cash:   { btn: 'tabCash',   panel: 'panelCash'   },
    moves:  { btn: 'tabMoves',  panel: 'panelMoves'  }
  };
  Object.keys(map).forEach(k=>{
    $(map[k].btn).classList.toggle('is-active', k === tab);
    $(map[k].panel).classList.toggle('hidden', k !== tab);
  });
  if(tab === 'calc') loadCalc();
  if(tab === 'cash') loadCash();
  if(tab === 'moves') loadMoves();
}

/* ---------- Остатки ---------- */
async function loadStock(){
  const body = $('stockBody');
  body.innerHTML = '<div class="center-load"><span class="spinner"></span> Loading…</div>';
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
    body.innerHTML = '<p class="stock-empty">Failed to load stock: ' + e.message + '</p>';
  }
}

function renderStock(list){
  const body = $('stockBody');
  if(!list.length){
    body.innerHTML = '<p class="stock-empty">No ingredients yet</p>';
    return;
  }
  const rows = list.map(it=>{
    const low = Number(it.stock) <= Number(it.min_stock);
    return `
      <tr class="${low ? 'is-low' : ''}">
        <td>${escapeHtml(it.name)}${low ? '<span class="badge-low">low</span>' : ''}</td>
        <td class="num"><input class="stock-edit${low ? ' low' : ''}" type="number" step="any"
              value="${escapeHtml(it.stock)}" data-id="${it.id}" data-current="${escapeHtml(it.stock)}"
              title="Edit stock"></td>
        <td>${escapeHtml(it.unit || '')}</td>
      </tr>`;
  }).join('');
  body.innerHTML = `
    <div class="table-wrap">
      <table class="stock">
        <thead>
          <tr>
            <th>Name</th>
            <th class="num">Stock</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* Изменение остатка вручную: пишем НЕ stock напрямую, а корректирующее
   движение 'adjust' на разницу (новое − текущее). Триггер пересчитает stock. */
async function handleStockEdit(input){
  const note = $('stockNote');
  if(note) note.className = 'form__note';
  const id = input.dataset.id;
  const next = Number(input.value);

  if(!Number.isFinite(next)){ if(note){ note.className='form__note is-error'; note.textContent='⚠️ Enter a number'; } await loadStock(); return; }

  input.disabled = true;
  try{
    // Читаем АКТУАЛЬНЫЙ остаток из БД (а не устаревшее значение на экране) и
    // считаем корректировку от него — тогда «вписал X → стало ровно X»
    // независимо от заказов/приходов, случившихся после загрузки страницы.
    const { data: cur, error: e1 } = await supa.from('ingredients').select('stock').eq('id', id).single();
    if(e1) throw e1;
    const live = Number(cur?.stock) || 0;
    const delta = next - live;
    if(delta !== 0){
      const { error } = await supa.from('movements').insert({
        ingredient_id: id, type: 'adjust', amount: delta, source: 'manual', note: 'stock correction'
      });
      if(error) throw error;
    }
    if(note){ note.className = 'form__note is-ok'; note.textContent = '✅ Stock updated'; }
    await loadStock();
  }catch(e){
    if(note){ note.className = 'form__note is-error'; note.textContent = 'Error: ' + e.message; }
    await loadStock();
  }
}

/* ---------- Приход ---------- */
function fillIngredientSelect(list){
  const sel = $('incIngredient');
  sel.innerHTML = list.map(it=>
    `<option value="${it.id}">${escapeHtml(it.name)}${it.unit ? ' (' + escapeHtml(it.unit) + ')' : ''}</option>`
  ).join('') + '<option value="new">➕ New ingredient</option>';
  toggleIncNewFields();
}

/* показать поля нового ингредиента, если выбрано «➕ New ingredient» */
function toggleIncNewFields(){
  const isNew = $('incIngredient').value === 'new';
  $('incNewFields').classList.toggle('hidden', !isNew);
}

async function handleIncome(){
  const note = $('incNoteMsg');
  note.className = 'form__note';

  const sel = $('incIngredient').value;
  const isNew = sel === 'new';
  const newName = $('incNewName').value.trim();
  const newUnit = $('incNewUnit').value;
  const amount = Number($('incAmount').value);
  const noteText = $('incNote').value.trim();
  const priceRaw = $('incPrice').value.trim();

  if(!sel){ note.textContent = '⚠️ Select an ingredient'; note.classList.add('is-error'); return; }
  if(isNew && !newName){ note.textContent = '⚠️ Enter the new ingredient name'; note.classList.add('is-error'); return; }
  if(!Number.isFinite(amount) || amount <= 0){ note.textContent = '⚠️ Quantity must be greater than 0'; note.classList.add('is-error'); return; }

  // Цена закупки — необязательная, целое ≥ 0
  let price = 0;
  if(priceRaw !== ''){
    price = Number(priceRaw);
    if(!Number.isInteger(price) || price < 0){ note.textContent = '⚠️ Purchase price must be an integer ≥ 0'; note.classList.add('is-error'); return; }
  }

  const btn = $('incSubmit');
  btn.disabled = true;
  const html = btn.innerHTML;
  btn.innerHTML = '<span class="spinner spinner--btn"></span>';
  try{
    // 0) Новый ингредиент — сначала создаём (stock:0), затем приход
    let ingredient_id = sel;
    let ingName = '';
    let ingUnit = '';
    if(isNew){
      const { data, error } = await supa.from('ingredients')
        .insert({ name: newName, unit: newUnit, stock: 0 }).select('id').single();
      if(error) throw error;
      ingredient_id = data.id;
      ingName = newName;
      ingUnit = newUnit;
    } else {
      const found = ingredients.find(x=> String(x.id) === String(ingredient_id));
      ingName = found?.name || '';
      ingUnit = found?.unit || '';
    }

    // 1) Только INSERT в movements — stock пересчитает триггер БД
    const { error } = await supa.from('movements').insert({
      ingredient_id,
      type: 'in',
      amount,
      source: 'manual',
      note: noteText || null
    });
    if(error) throw error;

    // 2) Если цена > 0 — расход в кассу (best-effort, склад уже оприходован)
    let cashWarn = '';
    if(price > 0){
      const { error: cErr } = await supa.from('cash_movements').insert({
        amount: -price,
        source: 'purchase',
        note: 'Purchase: ' + ingName + ' ' + amount + (ingUnit ? ' ' + ingUnit : '')
      });
      if(cErr) cashWarn = ' (cash not recorded: ' + cErr.message + ')';
    }

    // очистить форму + подтверждение + обновить остатки (и кассу, если открыта)
    $('incAmount').value = '';
    $('incPrice').value = '';
    $('incNote').value = '';
    $('incNewName').value = '';
    note.textContent = '✅ Income added' + cashWarn;
    note.classList.add(cashWarn ? 'is-error' : 'is-ok');
    await loadStock();
    if(!$('panelCash').classList.contains('hidden')) loadCash();
  }catch(e){
    note.textContent = 'Error: ' + e.message;
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
  body.innerHTML = '<div class="center-load"><span class="spinner"></span> Loading…</div>';
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
    body.innerHTML = '<p class="stock-empty">Failed to load dishes: ' + escapeHtml(e.message) + '</p>';
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
    body.innerHTML = '<p class="stock-empty">No dishes yet. Click "＋ Dish".</p>';
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
              <button class="recipe-row__del" data-action="del-recipe" data-recipe-id="${r.id}" title="Delete">✕</button>
            </li>`;
        }).join('')}</ul>`
      : '<p class="recipe-empty">No ingredients yet</p>';

    const priceTxt = (d.price != null && d.price !== '') ? fmtNum(d.price) : '—';
    const meta = [
      d.category ? escapeHtml(d.category) : null,
      d.code ? 'code ' + escapeHtml(d.code) : null,
      priceTxt,
      d.active === false ? '<span class="off">inactive</span>' : null
    ].filter(Boolean).join(' · ');

    return `
      <div class="dish-card" data-dish-id="${d.id}">
        <div class="dish-card__head">
          <div>
            <div class="dish-card__name">${escapeHtml(d.name)}</div>
            <div class="dish-card__meta">${meta}</div>
          </div>
          <button class="btn btn--ghost dish-card__edit" data-action="edit-dish" data-id="${d.id}">Edit</button>
        </div>
        ${recipeHtml}
        <div class="recipe-add">
          <select class="recipe-add__sel">${ingredientOptions()}</select>
          <input class="recipe-add__amt" type="number" min="0" step="any" inputmode="decimal" placeholder="qty">
          <button class="btn btn--ghost" data-action="add-recipe" data-dish-id="${d.id}">＋ Ingredient</button>
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

  if(!name){ note.textContent = '⚠️ Enter a name'; note.classList.add('is-error'); return; }
  let price = null;
  if(priceRaw !== ''){
    price = Number(priceRaw);
    if(!Number.isFinite(price) || price < 0){ note.textContent = '⚠️ Invalid price'; note.classList.add('is-error'); return; }
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
    setCalcNote('✅ Dish saved', true);
    await loadCalc();
  }catch(e){
    note.textContent = 'Error: ' + e.message;
    note.classList.add('is-error');
  }finally{
    btn.disabled = false;
    btn.innerHTML = html;
  }
}

async function handleDishDelete(){
  if(!editingDishId) return;
  const dish = dishes.find(d=> String(d.id) === String(editingDishId));
  if(!confirm(`Delete dish "${dish?.name || ''}"? Its recipe will be deleted too.`)) return;
  try{
    const { error } = await supa.from('dishes').delete().eq('id', editingDishId);
    if(error) throw error;
    closeDishForm();
    setCalcNote('🗑 Dish deleted', true);
    await loadCalc();
  }catch(e){
    const note = $('dishNote');
    note.className = 'form__note is-error';
    note.textContent = 'Error: ' + e.message;
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

  if(!ingredient_id){ setCalcNote('⚠️ Select an ingredient', false); return; }
  if(!Number.isFinite(amount) || amount <= 0){ setCalcNote('⚠️ Quantity must be greater than 0', false); return; }

  try{
    // upsert по уникальному (dish_id, ingredient_id): если есть — обновит amount
    const { error } = await supa.from('recipe').upsert(
      { dish_id, ingredient_id, amount },
      { onConflict: 'dish_id,ingredient_id' }
    );
    if(error) throw error;
    setCalcNote('✅ Saved', true);
    await loadCalc();
  }catch(e){
    setCalcNote('Error: ' + e.message, false);
  }
}

async function editAmount(inp){
  const amount = Number(inp.value);
  if(!Number.isFinite(amount) || amount <= 0){
    setCalcNote('⚠️ Quantity must be greater than 0', false);
    await loadCalc(); // вернуть прежнее значение
    return;
  }
  try{
    const { error } = await supa.from('recipe').update({ amount }).eq('id', inp.dataset.recipeId);
    if(error) throw error;
    setCalcNote('✅ Saved', true);
    await loadCalc();
  }catch(e){
    setCalcNote('Error: ' + e.message, false);
    await loadCalc();
  }
}

async function delRecipe(recipeId){
  try{
    const { error } = await supa.from('recipe').delete().eq('id', recipeId);
    if(error) throw error;
    setCalcNote('🗑 Ingredient removed', true);
    await loadCalc();
  }catch(e){
    setCalcNote('Error: ' + e.message, false);
  }
}

function setCalcNote(msg, ok){
  const note = $('calcNote');
  note.className = 'form__note ' + (ok ? 'is-ok' : 'is-error');
  note.textContent = msg;
}

/* ============================================================
   КАССА — движения денег (cash_movements)
   ============================================================ */

/* "1 234 567 ₫" — разделитель пробел */
function cashAbs(n){
  const s = String(Math.abs(Math.round(Number(n) || 0)));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₫';
}
const CASH_SOURCE = { order: 'Order', purchase: 'Purchase', manual: 'Manual' };

async function loadCash(){
  const body = $('cashBody');
  const balEl = $('cashBalance');
  body.innerHTML = '<div class="center-load"><span class="spinner"></span> Loading…</div>';
  try{
    const [balRes, histRes] = await Promise.all([
      supa.from('cash_movements').select('amount'),                       // баланс — сумма ВСЕХ
      supa.from('cash_movements')
        .select('id, amount, source, order_id, note, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
    ]);
    if(balRes.error) throw balRes.error;
    if(histRes.error) throw histRes.error;

    const balance = (balRes.data || []).reduce((s, r)=> s + Number(r.amount || 0), 0);
    balEl.textContent = (balance < 0 ? '−' : '') + cashAbs(balance);
    balEl.classList.toggle('is-neg', balance < 0);

    renderCash(histRes.data || []);
  }catch(e){
    balEl.textContent = '—';
    body.innerHTML = '<p class="cash-empty">Failed to load cash: ' + escapeHtml(e.message) + '</p>';
  }
}

function renderCash(rows){
  const body = $('cashBody');
  if(!rows.length){
    body.innerHTML = '<p class="cash-empty">No entries yet</p>';
    return;
  }
  body.innerHTML = '<ul class="cash-list">' + rows.map(r=>{
    const n = Number(r.amount || 0);
    const pos = n >= 0;
    const src = CASH_SOURCE[r.source] || escapeHtml(r.source || '');
    const ordRef = (r.source === 'order' && r.order_id != null) ? `<span class="cash-row__ord">Order #${escapeHtml(r.order_id)}</span>` : '';
    const date = r.created_at
      ? new Date(r.created_at).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : '';
    return `
      <li class="cash-row" data-id="${r.id}">
        <div class="cash-row__main">
          <div class="cash-row__top">
            <span class="cash-row__src">${src}</span>
            ${ordRef}
            <span class="cash-row__date">${date}</span>
          </div>
          <input class="cash-note-edit" value="${escapeHtml(r.note ?? '')}" placeholder="note">
        </div>
        <input class="cash-amt-edit ${pos ? 'pos' : 'neg'}" type="number" step="1" inputmode="numeric"
               value="${escapeHtml(n)}" data-current="${escapeHtml(n)}" title="Amount (signed)">
        <button class="cash-del" title="Delete entry">×</button>
      </li>`;
  }).join('') + '</ul>';
}

/* ---------- Ручная операция ---------- */
function openCashForm(){
  $('cashAmount').value = '';
  $('cashOpNote').value = '';
  $('cashFormNote').className = 'form__note';
  $('cashFormNote').textContent = '';
  show($('cashForm'));
  $('cashForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  $('cashAmount').focus();
}

function closeCashForm(){ hide($('cashForm')); }

async function handleCashSave(){
  const note = $('cashFormNote');
  note.className = 'form__note';

  const amount = Number($('cashAmount').value);
  const noteText = $('cashOpNote').value.trim();

  if(!Number.isInteger(amount) || amount === 0){
    note.textContent = '⚠️ Amount must be a non-zero integer (signed)';
    note.classList.add('is-error');
    return;
  }

  const btn = $('cashSave');
  btn.disabled = true;
  const html = btn.innerHTML;
  btn.innerHTML = '<span class="spinner spinner--btn"></span>';
  try{
    const { error } = await supa.from('cash_movements').insert({
      amount, source: 'manual', note: noteText || null
    });
    if(error) throw error;
    closeCashForm();
    setCashNote('✅ Entry added', true);
    await loadCash();
  }catch(e){
    note.textContent = 'Error: ' + e.message;
    note.classList.add('is-error');
  }finally{
    btn.disabled = false;
    btn.innerHTML = html;
  }
}

function setCashNote(msg, ok){
  const note = $('cashNote');
  note.className = 'form__note ' + (ok ? 'is-ok' : 'is-error');
  note.textContent = msg;
}

/* Изменить сумму движения (прямой UPDATE — cash_movements это источник правды) */
async function handleCashAmountEdit(input){
  const id = input.closest('.cash-row').dataset.id;
  const cur = Number(input.dataset.current);
  const next = Number(input.value);
  if(!Number.isInteger(next)){ setCashNote('⚠️ Amount must be an integer (signed)', false); await loadCash(); return; }
  if(next === cur) return;
  try{
    const { error } = await supa.from('cash_movements').update({ amount: next }).eq('id', id);
    if(error) throw error;
    setCashNote('✅ Amount updated', true);
    await loadCash();
  }catch(e){
    setCashNote('Error: ' + e.message, false);
    await loadCash();
  }
}

/* Изменить примечание движения */
async function handleCashNoteEdit(input){
  const id = input.closest('.cash-row').dataset.id;
  const val = input.value.trim();
  try{
    const { error } = await supa.from('cash_movements').update({ note: val || null }).eq('id', id);
    if(error) throw error;
    setCashNote('✅ Note updated', true);
    await loadCash();
  }catch(e){
    setCashNote('Error: ' + e.message, false);
    await loadCash();
  }
}

/* Удалить движение кассы */
async function handleCashDelete(id){
  if(!confirm('Delete this cash entry?')) return;
  try{
    const { error } = await supa.from('cash_movements').delete().eq('id', id);
    if(error) throw error;
    setCashNote('🗑 Entry deleted', true);
    await loadCash();
  }catch(e){
    setCashNote('Error: ' + e.message, false);
  }
}

/* ============================================================
   ФОТО-ПРИХОД НАКЛАДНОЙ (parse-invoice)
   ============================================================ */

/* Читаем фото и всегда отдаём JPEG data-URI.
   Это конвертирует HEIC (фото iPhone; Safari умеет его декодировать в canvas),
   который OpenAI Vision не принимает, и заодно ужимает большие снимки. */
function fileToJpegDataUrl(file, maxDim = 1600, quality = 0.85){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      try{
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height) || 1);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      }catch(e){ URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = ()=>{
      URL.revokeObjectURL(url);
      reject(new Error('could not open image (this browser may not support HEIC — try JPG/PNG)'));
    };
    img.src = url;
  });
}

async function handleRecognizeInvoice(){
  const note = $('invNote');
  note.className = 'form__note';
  const file = $('invFile').files && $('invFile').files[0];
  if(!file){ note.textContent = '⚠️ Select an invoice photo'; note.classList.add('is-error'); return; }

  const btn = $('invRecognize');
  btn.disabled = true;
  const html = btn.innerHTML;
  btn.innerHTML = '<span class="spinner spinner--btn"></span>';
  note.innerHTML = '<span class="note-loading"><span class="spinner"></span> Recognizing…</span>';
  try{
    const image_base64 = await fileToJpegDataUrl(file);
    const res = await fetch(CONFIG.SUPABASE_URL + '/functions/v1/parse-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CONFIG.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + CONFIG.SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ image_base64 })
    });
    const data = await res.json().catch(()=> null);
    if(!res.ok || !data || !data.ok) throw new Error((data && data.error) || ('HTTP ' + res.status));

    const items = Array.isArray(data.items) ? data.items : [];
    await ensureIngredients();
    if(!items.length){
      $('invResult').innerHTML = '';
      note.className = 'form__note';
      note.textContent = 'No items found — check the photo';
      return;
    }
    invRows = items.map(it=>{
      const c = invAutoConvert(it);
      return {
        name: it.name ?? '', qty: c.qty, unit: c.unit,
        priceBase: c.priceBase, total: it.total, ingId: fuzzyIngredientId(it.name)
      };
    });
    renderInvoice();
    note.className = 'form__note';
    note.textContent = '';
  }catch(e){
    $('invResult').innerHTML = '';
    note.className = 'form__note is-error';
    note.textContent = 'Recognition error: ' + e.message;
  }finally{
    btn.disabled = false;
    btn.innerHTML = html;
  }
}

/* отменить результат распознавания — очистить блок */
function cancelInvoice(){
  invRows = [];
  $('invResult').innerHTML = '';
  $('invFile').value = '';
  $('invNote').className = 'form__note';
  $('invNote').textContent = '';
}

/* расстояние Левенштейна */
function invLevenshtein(a, b){
  const m = a.length, n = b.length;
  if(!m) return n;
  if(!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i)=> i);
  for(let i = 1; i <= m; i++){
    const cur = [i];
    for(let j = 1; j <= n; j++){
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}
/* подобрать ingredient.id по имени (регистр/пробелы игнорируем).
   Совпадение: Levenshtein <= 2 ИЛИ одна строка содержит другую.
   Из совпадений — лучшее (минимальная дистанция); иначе 'new'. */
function fuzzyIngredientId(name){
  const n = String(name ?? '').trim().toLowerCase();
  if(!n) return 'new';
  let bestId = 'new', bestDist = Infinity;
  for(const it of ingredients){
    const m = String(it.name ?? '').trim().toLowerCase();
    if(!m) continue;
    const contains = n.includes(m) || m.includes(n);
    const dist = invLevenshtein(n, m);
    if(dist <= 2 || contains){
      if(dist < bestDist){ bestDist = dist; bestId = it.id; }
    }
  }
  return bestId;
}

function invIngredientOptions(selected){
  const isNew = selected === 'new';
  return `<option value="new"${isNew ? ' selected' : ''}>➕ Create new</option>` +
    ingredients.map(it=>
      `<option value="${it.id}"${String(it.id) === String(selected) ? ' selected' : ''}>` +
      `${escapeHtml(it.name)}${it.unit ? ' (' + escapeHtml(it.unit) + ')' : ''}</option>`
    ).join('');
}

function renderInvoice(){
  if(!invRows.length){ $('invResult').innerHTML = ''; return; }
  const rows = invRows.map((r, i)=> `
      <tr class="inv-row" data-index="${i}">
        <td><input class="inv-name" value="${escapeHtml(r.name ?? '')}"></td>
        <td><input class="inv-qty inv-num" type="number" step="any" value="${escapeHtml(r.qty ?? '')}"></td>
        <td>
          <select class="inv-unit">
            <option value="g"${r.unit === 'g' ? ' selected' : ''}>g</option>
            <option value="pcs"${r.unit === 'pcs' ? ' selected' : ''}>pcs</option>
          </select>
        </td>
        <td><input class="inv-total inv-num" type="number" step="any" value="${escapeHtml(r.total ?? '')}"></td>
        <td><select class="inv-ing">${invIngredientOptions(r.ingId)}</select></td>
        <td><button class="inv-del" data-index="${i}" title="Delete row">×</button></td>
      </tr>`).join('');
  $('invResult').innerHTML = `
    <div class="inv-table-wrap">
      <table class="inv-table">
        <thead><tr>
          <th>Name</th><th>Qty</th><th>Unit</th><th>Total</th><th>Ingredient</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="inv-submit-row">
      <div class="inv-actions">
        <button id="invSubmit" class="btn btn--primary">Add all</button>
        <button id="invCancel" class="btn btn--ghost">Cancel</button>
      </div>
      <p id="invSubmitNote" class="form__note"></p>
    </div>`;
}

/* синхронизировать правки из DOM обратно в invRows (перед удалением/вставкой) */
function syncInvRowsFromDom(){
  const rows = [...document.querySelectorAll('#invResult .inv-row')];
  rows.forEach((row, i)=>{
    if(!invRows[i]) return;
    invRows[i].name  = row.querySelector('.inv-name').value;
    invRows[i].qty   = row.querySelector('.inv-qty').value;
    invRows[i].unit  = row.querySelector('.inv-unit').value;
    invRows[i].total = row.querySelector('.inv-total').value;
    invRows[i].ingId = row.querySelector('.inv-ing').value;
  });
}

/* удалить строку локально и перерисовать (без запросов к БД) */
function deleteInvRow(i){
  syncInvRowsFromDom();
  invRows.splice(i, 1);
  renderInvoice();
}

/* авто-конвертация позиции накладной -> база ('г' | 'шт').
   Возвращает { unit, qty (итоговое кол-во), priceBase (цена за 1 базовую ед.) }.
   Правила:
   - unit из GPT = 'kg'      -> 'г', qty × 1000
   - unit из GPT = 'g'       -> 'г'
   - weight_grams не null    -> 'г', qty × weight_grams
   - иначе                   -> 'шт' */
function invAutoConvert(it){
  const gpt = String(it.unit ?? '').trim().toLowerCase();
  const qty = Number(it.qty) || 0;
  const ppu = Number(it.price_per_unit);
  const wg  = (it.weight_grams == null || it.weight_grams === '') ? null : Number(it.weight_grams);
  const p = (div) => Number.isFinite(ppu) ? ppu / div : null;

  if(gpt === 'kg')            return { unit: 'g', qty: qty * 1000, priceBase: p(1000) };
  if(gpt === 'g')             return { unit: 'g', qty: qty,        priceBase: p(1) };
  if(wg != null && wg > 0)    return { unit: 'g', qty: qty * wg,   priceBase: p(wg) };
  return { unit: 'pcs', qty: qty, priceBase: p(1) };
}

async function handleSubmitInvoice(){
  const note = $('invSubmitNote');
  if(note) note.className = 'form__note';
  syncInvRowsFromDom();
  if(!invRows.length) return;

  const btn = $('invSubmit');
  btn.disabled = true;
  const html = btn.innerHTML;
  btn.innerHTML = '<span class="spinner spinner--btn"></span>';
  try{
    let done = 0;
    for(const r of invRows){
      const name      = String(r.name ?? '').trim();
      const qty       = Number(r.qty);          // итоговое кол-во (редактируемое)
      const unit      = r.unit;                 // 'г' | 'шт' (из селекта)
      const priceBase = Number(r.priceBase);    // цена за 1 базовую ед. (из распознавания)
      const total     = Number(r.total);        // сумма (из распознавания, скрыта в UI)
      const ingSel    = r.ingId;

      if(!name) throw new Error('empty name in one of the rows');
      if(!Number.isFinite(qty) || qty <= 0) throw new Error('invalid quantity: ' + name);

      // а) ингредиент (или создаём новый) — единица из селекта
      let ingredientId = ingSel;
      if(ingSel === 'new'){
        const { data, error } = await supa.from('ingredients')
          .insert({ name, unit, stock: 0 }).select('id').single();
        if(error) throw error;
        ingredientId = data.id;
      }
      // б) приход — stock пересчитает триггер
      {
        const { error } = await supa.from('movements').insert({
          ingredient_id: ingredientId, type: 'in', amount: qty, source: 'invoice', note: name
        });
        if(error) throw error;
      }
      // в) цена за базовую единицу
      if(Number.isFinite(priceBase) && priceBase > 0){
        const { error } = await supa.from('ingredients').update({ price: priceBase }).eq('id', ingredientId);
        if(error) throw error;
      }
      // г) расход в кассу
      if(Number.isFinite(total) && total > 0){
        const { error } = await supa.from('cash_movements').insert({
          amount: -total, source: 'purchase', note: 'Invoice: ' + name + ' ' + qty + ' ' + unit
        });
        if(error) throw error;
      }
      done++;
    }
    // очистить блок + обновить остатки/кассу
    invRows = [];
    $('invResult').innerHTML = '';
    $('invFile').value = '';
    $('invNote').className = 'form__note is-ok';
    $('invNote').textContent = `✅ Items added: ${done}`;
    await loadStock();
    if(!$('panelCash').classList.contains('hidden')) loadCash();
  }catch(e){
    if($('invSubmitNote')){ $('invSubmitNote').className = 'form__note is-error'; $('invSubmitNote').textContent = 'Error: ' + e.message; }
  }finally{
    if($('invSubmit')){ btn.disabled = false; btn.innerHTML = html; }
  }
}

/* ============================================================
   ДВИЖЕНИЯ — история склада (movements)
   ============================================================ */
const MV_TYPE = { in: 'Приход', out: 'Расход', adjust: 'Коррекция' };
const MV_SOURCE = { manual: 'Вручную', invoice: 'Накладная', tg: 'TG кухня', order: 'Заказ', inventory: 'Инвентаризация' };

function fillMovesIng(){
  const sel = $('movesIng');
  const prev = sel.value;
  sel.innerHTML = '<option value="">Все ингредиенты</option>' +
    ingredients.map(it=> `<option value="${it.id}">${escapeHtml(it.name)}</option>`).join('');
  sel.value = prev;
}

async function loadMoves(){
  const body = $('movesBody');
  body.innerHTML = '<div class="center-load"><span class="spinner"></span> Загрузка…</div>';
  try{
    await ensureIngredients();
    fillMovesIng();
    let query = supa.from('movements')
      .select('id, ingredient_id, type, amount, source, order_id, note, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    const tf = $('movesType').value;
    const inf = $('movesIng').value;
    if(tf) query = query.eq('type', tf);
    if(inf) query = query.eq('ingredient_id', inf);
    const { data, error } = await query;
    if(error) throw error;
    renderMoves(data || []);
  }catch(e){
    body.innerHTML = '<p class="moves-empty">Не удалось загрузить движения: ' + escapeHtml(e.message) + '</p>';
  }
}

function renderMoves(rows){
  const body = $('movesBody');
  if(!rows.length){ body.innerHTML = '<p class="moves-empty">Движений нет</p>'; return; }
  const ingMap = {};
  ingredients.forEach(i=> ingMap[i.id] = i);

  const trs = rows.map(r=>{
    const ing = ingMap[r.ingredient_id];
    const ingName = ing ? ing.name : ('#' + r.ingredient_id);
    const unit = ing && ing.unit ? ing.unit : '';
    const date = r.created_at
      ? new Date(r.created_at).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : '';
    const typeLabel = MV_TYPE[r.type] || escapeHtml(r.type || '');
    let src = MV_SOURCE[r.source] || escapeHtml(r.source || '');
    if(r.source === 'order' && r.order_id != null) src = `Заказ #${escapeHtml(r.order_id)}`;
    return `
      <tr>
        <td>${date}</td>
        <td>${escapeHtml(ingName)}</td>
        <td><span class="mv-type ${r.type}">${typeLabel}</span></td>
        <td class="num">${fmtNum(r.amount)}${unit ? ' ' + escapeHtml(unit) : ''}</td>
        <td>${src}</td>
        <td class="mv-note">${escapeHtml(r.note || '')}</td>
      </tr>`;
  }).join('');

  body.innerHTML = `
    <div class="table-wrap">
      <table class="moves">
        <thead><tr>
          <th>Дата</th><th>Ингредиент</th><th>Тип</th><th class="num">Кол-во</th><th>Источник</th><th>Примечание</th>
        </tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>`;
}

/* ---------- Безопасный вывод текста ---------- */
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}
