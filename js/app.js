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
      const dishes = dishesInCat.filter(d => d.sub === sub);
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
    (d.spicy ? `<span class="badge badge--spicy">🌶 ${t.spicy}</span>` : '') +
    (d.veg   ? `<span class="badge badge--veg">🥬 ${t.veg}</span>`   : '');

  return `
    <article class="card">
      <div class="card__imgwrap">
        <img class="card__img" src="${d.img || `img/menu/${d.id}.jpg`}" alt="${d.name[lang]}"
             onerror="this.outerHTML='<div class=\\'card__img--ph\\'>${d.name[lang].replace(/'/g,'')}</div>'">
        <div class="card__badges">${badges}</div>
      </div>
      <div class="card__body">
        <h4 class="card__name">${d.name[lang]}</h4>
        <p class="card__desc">${d.desc[lang]}</p>
        <div class="card__foot">
          <span class="card__price">${fmtPrice(d.price)}</span>
          <button class="card__add" onclick="Cart.add(${d.id}); openCart();">${t.add}</button>
        </div>
      </div>
    </article>`;
}

/* ---------- ЯЗЫК ---------- */
function setLang(lang){
  window.currentLang = lang;
  document.documentElement.lang = lang;
  document.getElementById('langBtn').textContent = lang.toUpperCase() + ' ▾';

  // перевод всех статических элементов
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(I18N[lang][key]) el.textContent = I18N[lang][key];
  });

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
    <a href="#cat-sushi"  data-i18n="nav_sushi">Суші</a>
    <a href="#cat-rolls"  data-i18n="nav_rolls">Роли</a>
    <a href="#cat-hot"    data-i18n="nav_hot">Гарячі роли</a>
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
