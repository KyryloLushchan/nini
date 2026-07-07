/* ============================================================
   NiNi Sushi — КОРЗИНА
   Хранится в памяти страницы (без localStorage).
   ============================================================ */

const Cart = {
  items: {},   // { id: qty }
  discountPercent: 0,   // персональная скидка залогиненного клиента (только отображение)

  // сумма скидки (та же формула, что на сервере)
  discountAmount(){
    return this.discountPercent > 0 ? Math.round(this.total() * this.discountPercent / 100) : 0;
  },

  add(id){
    this.items[id] = (this.items[id] || 0) + 1;
    this.render();
    if(typeof notifyAdd === 'function') notifyAdd();
  },
  remove(id){
    delete this.items[id];
    this.render();
  },
  setQty(id, qty){
    if(qty <= 0){ this.remove(id); return; }
    this.items[id] = qty;
    this.render();
  },
  clear(){
    this.items = {};
    this.render();
  },
  count(){
    return Object.values(this.items).reduce((a,b)=>a+b, 0);
  },
  total(){
    return Object.entries(this.items).reduce((sum,[id,qty])=>{
      const dish = MENU.find(d => d.id == id);
      return sum + (dish ? dishPrice(dish) * qty : 0);
    }, 0);
  },
  // список для отправки в заказ
  list(lang){
    return Object.entries(this.items).map(([id,qty])=>{
      const d = MENU.find(x => x.id == id);
      const p = dishPrice(d);
      return { id:+id, name:d.name[lang], qty, price:p, sum:p*qty };
    });
  },

  render(){
    const lang = window.currentLang || 'ua';
    const t = I18N[lang];

    // счётчик в шапке
    document.getElementById('cartCount').textContent = this.count();

    // тело корзины
    const box = document.getElementById('cartItems');
    const entries = Object.entries(this.items);
    if(entries.length === 0){
      box.innerHTML = `<div class="cart-empty">${t.cart_empty}</div>`;
    } else {
      box.innerHTML = entries.map(([id,qty])=>{
        const d = MENU.find(x => x.id == id);
        return `
          <div class="cart-item">
            <img class="cart-item__img" src="${d.img || `img/menu/${d.id}.jpg`}" alt=""
                 onerror="this.style.background='var(--coral-soft)';this.src='';">
            <div class="cart-item__info">
              <div class="cart-item__name">${d.name[lang]}</div>
              <div class="cart-item__price">${
                hasSale(d)
                  ? `<span class="price-old">${fmtPrice(d.price)}</span> <span class="price-new">${fmtPrice(dishPrice(d))}</span>`
                  : fmtPrice(d.price)
              }</div>
              <div class="cart-item__ctrl">
                <button class="qty-btn" onclick="Cart.setQty(${d.id}, ${qty-1})">−</button>
                <span class="qty-val">${qty}</span>
                <button class="qty-btn" onclick="Cart.setQty(${d.id}, ${qty+1})">+</button>
                <button class="cart-item__rm" onclick="Cart.remove(${d.id})">✕</button>
              </div>
            </div>
          </div>`;
      }).join('');
    }

    // сумма (с учётом персональной скидки, если есть)
    const raw = this.total();
    const disc = this.discountAmount();
    document.getElementById('cartTotal').textContent = fmtPrice(raw - disc);

    // строка скидки
    const row = document.getElementById('cartDiscountRow');
    if(row){
      if(this.discountPercent > 0 && raw > 0){
        row.classList.remove('hidden');
        const label = DISC_LABEL[lang] || DISC_LABEL.en;
        document.getElementById('cartDiscountText').textContent = `${label}: −${this.discountPercent}%`;
      } else {
        row.classList.add('hidden');
      }
    }

    // обновить контролы карточек и мобильную плашку
    if(typeof syncMenuControls === 'function') syncMenuControls();
    if(typeof updateOrderBar === 'function') updateOrderBar();
  }
};

/* подпись строки скидки по языкам */
const DISC_LABEL = { ua: 'Твоя знижка', ru: 'Твоя скидка', en: 'Your discount', vn: 'Ưu đãi của bạn' };

/* Подтянуть персональную скидку залогиненного клиента (RLS: видна только своя строка).
   Это только отображение — реальный расчёт всё равно на сервере (send-order). */
async function loadMyDiscount(){
  try{
    if(typeof supa === 'undefined' || !supa){ Cart.discountPercent = 0; Cart.render(); return; }
    const { data: sess } = await supa.auth.getSession();
    if(!sess || !sess.session){ Cart.discountPercent = 0; Cart.render(); return; }
    const { data, error } = await supa.from('discounts').select('percent').maybeSingle();
    const p = (!error && data) ? Number(data.percent) : 0;
    Cart.discountPercent = (Number.isFinite(p) && p >= 1 && p <= 100) ? p : 0;
  }catch(_e){
    Cart.discountPercent = 0;
  }
  Cart.render();
}

/* Формат цены в донгах: 189000 -> "189 000₫" */
function fmtPrice(v){
  return v.toLocaleString('ru-RU').replace(/,/g,' ') + '₫';
}
