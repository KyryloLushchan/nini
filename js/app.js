/* ============================================================
   NiNi Sushi — ГЛАВНЫЙ СКРИПТ
   Рендер меню, языки, навигация, открытие панелей/модалок.
   ============================================================ */

window.currentLang = 'ua';

/* ---------- РЕНДЕР МЕНЮ ---------- */
function renderMenu(){
  const lang = window.currentLang;
  const t = I18N[lang];
  const root = document.getElementById('menu');
  let html = '';

  CATEGORIES.forEach(cat=>{
    const dishesInCat = MENU.filter(d => d.cat === cat);
    html += `<section class="cat-block" id="cat-${cat}">`;
    html += `<h2 class="cat-title">${t['nav_'+cat]}</h2>`;

    if(cat === 'drinks' && dishesInCat.length === 0){
      html += `<div class="empty-cat">${t.drinks_soon}</div>`;
      html += `</section>`;
      return;
    }

    SUBGROUPS[cat].forEach(sub=>{
      const dishes = dishesInCat.filter(d => d.sub === sub && !d.hidden);
      if(dishes.length === 0) return;
      html += `<h3 class="sub-title">${t['sub_'+sub] || ''}</h3>`;
      html += `<div class="grid">`;
      dishes.forEach(d=>{ html += cardHTML(d, lang, t); });
      html += `</div>`;
    });

    html += `</section>`;
  });

  root.innerHTML = html;
}

function cardHTML(d, lang, t){
  const badges =
    (d.neu   ? `<span class="badge badge--new">${t.badge_new || 'NEW'}</span>` : '') +
    (d.spicy ? `<span class="badge badge--spicy">🌶 ${t.spicy}</span>` : '') +
    (d.veg   ? `<span class="badge badge--veg">🥬 ${t.veg}</span>`   : '');

  const priceHTML = hasSale(d)
    ? `<span class="card__price"><span class="price-old">${fmtPrice(d.price)}</span> <span class="price-new">${fmtPrice(dishPrice(d))}</span></span>`
    : `<span class="card__price">${fmtPrice(d.price)}</span>`;

  const saleBadge = hasSale(d) ? `<span class="sale-badge">−20%</span>` : '';

  // Тумблер LUX/LIGHT (если у блюда есть лайт-версия или это сама лайт-версия)
  const isLite = !!d.luxId;
  const counterpartId = isLite ? d.luxId : d.liteId;
  const toggleHTML = counterpartId
    ? `<div class="variant-switch ${isLite ? 'is-light' : 'is-lux'}" title="LUX / LIGHT" onclick="switchVariant(this, ${counterpartId})">
         <span class="variant-switch__lux">LUX</span>
         <span class="vtoggle"><span class="vtoggle__knob"></span></span>
         <span class="variant-switch__light">LIGHT</span>
       </div>`
    : '';

  return `
    <article class="card">
      <div class="card__imgwrap">
        <img class="card__img" src="${d.img || `img/menu/${d.id}.jpg`}" alt="${d.name[lang]}"
             onerror="this.outerHTML='<div class=\\'card__img--ph\\'>${d.name[lang].replace(/'/g,'')}</div>'">
        <div class="card__badges">${badges}</div>
        ${saleBadge}
      </div>
      <div class="card__body">
        <h4 class="card__name">${d.name[lang]}</h4>
        <p class="card__desc">${d.desc[lang]}</p>
        ${toggleHTML}
        <div class="card__foot">
          ${priceHTML}
          <div class="card__ctrl" data-id="${d.id}">${cardCtrlHTML(d, t)}</div>
        </div>
      </div>
    </article>`;
}

/* Контрол карточки: кнопка "У кошик" либо степпер −/+, если товар уже в корзине */
function cardCtrlHTML(d, t){
  const qty = Cart.items[d.id] || 0;
  if(qty > 0){
    return `<div class="card-stepper">
      <button class="step-btn" onclick="Cart.setQty(${d.id}, ${qty-1})" aria-label="−">−</button>
      <span class="step-val">${qty}</span>
      <button class="step-btn" onclick="Cart.setQty(${d.id}, ${qty+1})" aria-label="+">+</button>
    </div>`;
  }
  return `<button class="card__add" onclick="Cart.add(${d.id})">${t.add}</button>`;
}

/* Переключение LUX <-> LIGHT: перерисовываем карточку другим вариантом */
function switchVariant(el, id){
  const card = el.closest('.card');
  const d = MENU.find(x => x.id == id);
  if(!card || !d) return;
  const lang = window.currentLang || 'ua';
  card.outerHTML = cardHTML(d, lang, I18N[lang]);
}

/* Обновить контролы всех видимых карточек под текущее состояние корзины */
function syncMenuControls(){
  const t = I18N[window.currentLang || 'ua'];
  document.querySelectorAll('.card__ctrl').forEach(el=>{
    const d = MENU.find(x => x.id == el.dataset.id);
    if(d) el.innerHTML = cardCtrlHTML(d, t);
  });
}

/* Мобильная плашка корзины снизу */
function updateOrderBar(){
  const bar = document.getElementById('orderBar');
  if(!bar) return;
  const n = Cart.count();
  if(n <= 0){ bar.classList.remove('is-visible'); document.body.classList.remove('has-order-bar'); return; }
  const lang = window.currentLang || 'ua';
  document.getElementById('orderBarInfo').textContent = `${n} ${pluralItems(n, lang)}, ${fmtPrice(Cart.total())}`;
  bar.classList.add('is-visible');
  document.body.classList.add('has-order-bar');
}

/* Десктопный тост "Товар додано до кошика" */
let addToastTimer = null;
function notifyAdd(){
  const el = document.getElementById('addToast');
  if(!el) return;
  el.classList.add('is-visible');
  clearTimeout(addToastTimer);
  addToastTimer = setTimeout(()=> el.classList.remove('is-visible'), 1800);
}

/* Склонение слова "товар" по числу */
function pluralItems(n, lang){
  const forms = {
    ua: ['товар','товари','товарів'],
    ru: ['товар','товара','товаров'],
    en: ['item','items','items'],
    vn: ['món','món','món']
  };
  const f = forms[lang] || forms.ua;
  const m10 = n % 10, m100 = n % 100;
  let i;
  if(m10 === 1 && m100 !== 11) i = 0;
  else if(m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) i = 1;
  else i = 2;
  return f[i];
}

/* ---------- ЯЗЫК ---------- */
function setLang(lang){
  window.currentLang = lang;
  document.documentElement.lang = lang;
  const LANG_FLAGS = { ua:'🇺🇦', ru:'🇷🇺', en:'🇬🇧', vn:'🇻🇳' };
  document.getElementById('langBtn').textContent = (LANG_FLAGS[lang] || lang.toUpperCase()) + ' ▾';

  // перевод всех статических элементов
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(I18N[lang][key]) el.textContent = I18N[lang][key];
  });

  // поле Telegram показываем только для ua/ru
  const tgRow = document.getElementById('ordTelegramRow');
  if(tgRow) tgRow.style.display = (lang === 'ua' || lang === 'ru') ? 'contents' : 'none';

  renderMenu();
  Cart.render();
  updateAuthLabels();
}

/* ---------- ПАНЕЛЬ КОРЗИНЫ ---------- */
function openCart(){
  document.getElementById('cartPanel').classList.add('is-open');
  document.getElementById('overlay').classList.add('is-open');
}
function closeCart(){
  document.getElementById('cartPanel').classList.remove('is-open');
  document.getElementById('overlay').classList.remove('is-open');
}

/* ---------- МОДАЛКИ ---------- */
function openModal(id){ document.getElementById(id).classList.add('is-open'); }
function closeModal(id){ document.getElementById(id).classList.remove('is-open'); }

/* ---------- СТИКИ-БАР: подсветка активной категории ---------- */
function initScrollSpy(){
  const links = document.querySelectorAll('.catbar__link');
  const blocks = CATEGORIES.map(c => document.getElementById('cat-'+c));
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const id = e.target.id.replace('cat-','');
        links.forEach(l=>l.classList.toggle('is-active', l.dataset.cat === id));
      }
    });
  }, { rootMargin:'-140px 0px -60% 0px' });
  blocks.forEach(b=> b && obs.observe(b));
}

/* ---------- МОБИЛЬНОЕ NAV ---------- */
function buildMobileNav(){
  const mnav = document.createElement('nav');
  mnav.className = 'mnav'; mnav.id = 'mnav';
  mnav.innerHTML = `
    <a href="#cat-rolls"  data-i18n="nav_rolls">Роли</a>
    <a href="#cat-sushi"  data-i18n="nav_sushi">Суші</a>
    <a href="#cat-drinks" data-i18n="nav_drinks">Напої</a>`;
  document.body.appendChild(mnav);
  mnav.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=> mnav.classList.remove('is-open')));
}

/* ---------- ИНИЦИАЛИЗАЦИЯ ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  renderMenu();
  Cart.render();
  buildMobileNav();
  initScrollSpy();

  // язык
  document.getElementById('langBtn').addEventListener('click', (e)=>{
    e.stopPropagation();
    document.getElementById('langMenu').classList.toggle('is-open');
  });
  document.querySelectorAll('#langMenu button').forEach(b=>{
    b.addEventListener('click', ()=>{
      setLang(b.dataset.lang);
      document.getElementById('langMenu').classList.remove('is-open');
    });
  });
  document.addEventListener('click', ()=> document.getElementById('langMenu').classList.remove('is-open'));

  // корзина
  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('overlay').addEventListener('click', closeCart);
  document.getElementById('orderBar').addEventListener('click', openCart);

  // checkout
  document.getElementById('checkoutBtn').addEventListener('click', ()=>{
    if(Cart.count() === 0) return;
    closeCart();
    openModal('orderModal');
    if(typeof initOrderMap === 'function') initOrderMap();
  });

  // закрытие модалок
  document.querySelectorAll('[data-close]').forEach(b=>{
    b.addEventListener('click', ()=> b.closest('.modal').classList.remove('is-open'));
  });
  document.querySelectorAll('.modal').forEach(m=>{
    m.addEventListener('click', (e)=>{ if(e.target === m) m.classList.remove('is-open'); });
  });

  // аккаунт: вошёл -> личный кабинет, иначе -> форма входа
  document.getElementById('accountBtn').addEventListener('click', ()=>{
    if(typeof handleAccountClick === 'function') handleAccountClick();
    else openModal('authModal');
  });

  // бургер
  document.getElementById('burger').addEventListener('click', ()=>{
    document.getElementById('mnav').classList.toggle('is-open');
  });

  // язык по умолчанию
  setLang('ua');
});
