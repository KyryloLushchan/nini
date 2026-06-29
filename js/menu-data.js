/* ============================================================
   NiNi Sushi — ДАННЫЕ МЕНЮ
   ------------------------------------------------------------
   Как пользоваться:
   - id           : номер блюда (= имя файла фото: img/menu/1.jpg и т.д.)
   - cat          : категория верхнего меню-бара
                    "sushi"   = Суши (Нігірі + Гункан)
                    "rolls"   = Роллы (Філадельфія + Spicy Tuna + Дракони + Макі)
                    "drinks"  = Напитки
   - sub          : подгруппа (для заголовков внутри категории)
   - price        : цена продажи в донгах (VND)
   - spicy        : true -> бейдж 🌶 Гострі
   - veg          : true -> бейдж 🥬 Вегетаріанські
   - name / desc  : переводы на 4 языка (ua, ru, en, vn)

   ⚠️ ФОТО: рядом с каждым блюдом в комментарии написано название —
   просто положи правильный снимок под номером id в папку img/menu/
   Имя файла = "<id>.jpg" (расширение не важно, главное чтобы совпадало).
   ============================================================ */

const MENU = [
  /* ---------- РОЛЛЫ · НОВИНКА ---------- */
  {
    id: 38, cat: "rolls", sub: "new", price: 189000, neu: true, img: "img/menu/38.jpg", // ФОТО: Spicy Tokyo roll
    name: { ua: "Spicy Tokyo roll", ru: "Spicy Tokyo roll", en: "Spicy Tokyo roll", vn: "Spicy Tokyo roll" },
    desc: {
      ua: "Лосось, Авокадо, Омлет, Крем-сир Філадельфія, Спайсі майонез",
      ru: "Лосось, Авокадо, Омлет, Крем-сыр Филадельфия, Спайси майонез",
      en: "Salmon, Avocado, Omelette, Philadelphia cream cheese, Spicy mayo",
      vn: "Cá hồi, Bơ, Trứng cuộn, Phô mai Philadelphia, Sốt mayo cay"
    }
  },
  {
    id: 43, cat: "rolls", sub: "new", price: 147500, neu: true, img: "img/menu/43.jpg", // ФОТО: Yamamoto set
    name: { ua: "Yamamoto set", ru: "Yamamoto set", en: "Yamamoto set", vn: "Yamamoto set" },
    desc: {
      ua: "Лосось, тобіко, васабі, little bit спайсі майонез",
      ru: "Лосось, тобико, васаби, little bit спайси майонез",
      en: "Salmon, tobiko, wasabi, little bit spicy mayo",
      vn: "Cá hồi, tobiko, wasabi, little bit sốt mayo cay"
    }
  },

  /* ---------- РОЛЛЫ · ФІЛАДЕЛЬФІЯ ---------- */
  {
    id: 1, cat: "rolls", sub: "philadelphia", price: 189000, img: "img/menu/1.jpg", liteId: 90, // ФОТО: Філадельфія з лососем
    name: { ua: "Філадельфія з лососем", ru: "Филадельфия с лососем", en: "Philadelphia with Salmon", vn: "Philadelphia cá hồi" },
    desc: {
      ua: "Рис, Лосось, Огірок, Крем-сир, Норі",
      ru: "Рис, Лосось, Огурец, Крем-сыр, Нори",
      en: "Rice, Salmon, Cucumber, Cream cheese, Nori",
      vn: "Cơm, Cá hồi, Dưa leo, Phô mai kem, Rong biển"
    }
  },
  {
    id: 2, cat: "rolls", sub: "philadelphia", price: 199000, img: "img/menu/37.jpg", // ФОТО: Філадельфія з лососем та авокадо
    name: { ua: "Філадельфія з лососем та авокадо", ru: "Филадельфия с лососем и авокадо", en: "Philadelphia Salmon & Avocado", vn: "Philadelphia cá hồi & bơ" },
    desc: {
      ua: "Рис, Лосось, Авокадо, Крем-сир, Тобіко, Норі",
      ru: "Рис, Лосось, Авокадо, Крем-сыр, Тобико, Нори",
      en: "Rice, Salmon, Avocado, Cream cheese, Tobiko, Nori",
      vn: "Cơm, Cá hồi, Bơ, Phô mai kem, Trứng cá tobiko, Rong biển"
    }
  },
  {
    id: 3, cat: "rolls", sub: "philadelphia", price: 189000, img: "img/menu/3.jpg", liteId: 91, // ФОТО: Філадельфія Гриль
    name: { ua: "Філадельфія Гриль", ru: "Филадельфия Гриль", en: "Philadelphia Grill", vn: "Philadelphia nướng" },
    desc: {
      ua: "Рис, Лосось, Огірок, Крем-сир, Норі",
      ru: "Рис, Лосось, Огурец, Крем-сыр, Нори",
      en: "Rice, Salmon, Cucumber, Cream cheese, Nori",
      vn: "Cơm, Cá hồi, Dưa leo, Phô mai kem, Rong biển"
    }
  },

  /* ---- LIGHT-версии Філадельфій (скрыты; доступны тумблером LUX/LIGHT на родительской карточке) ---- */
  {
    id: 90, cat: "rolls", sub: "philadelphia", price: 135000, hidden: true, luxId: 1, img: "img/menu/42.jpg", // LIGHT: Філадельфія з лососем
    name: { ua: "Філадельфія з лососем (Light)", ru: "Филадельфия с лососем (Light)", en: "Philadelphia with Salmon (Light)", vn: "Philadelphia cá hồi (Light)" },
    desc: {
      ua: "Рис, Лосось, Огірок, Крем-сир, Норі",
      ru: "Рис, Лосось, Огурец, Крем-сыр, Нори",
      en: "Rice, Salmon, Cucumber, Cream cheese, Nori",
      vn: "Cơm, Cá hồi, Dưa leo, Phô mai kem, Rong biển"
    }
  },
  {
    id: 91, cat: "rolls", sub: "philadelphia", price: 135000, hidden: true, luxId: 3, img: "img/menu/41.jpg", // LIGHT: Філадельфія Гриль
    name: { ua: "Філадельфія Гриль (Light)", ru: "Филадельфия Гриль (Light)", en: "Philadelphia Grill (Light)", vn: "Philadelphia nướng (Light)" },
    desc: {
      ua: "Рис, Лосось, Огірок, Крем-сир, Норі",
      ru: "Рис, Лосось, Огурец, Крем-сыр, Нори",
      en: "Rice, Salmon, Cucumber, Cream cheese, Nori",
      vn: "Cơm, Cá hồi, Dưa leo, Phô mai kem, Rong biển"
    }
  },

  /* ---------- РОЛЛЫ · ЗАПЕЧЕНІ ---------- */
  {
    id: 35, cat: "rolls", sub: "baked", price: 200000, img: "img/menu/34.png", // ФОТО: Запечений з лососем
    name: { ua: "Запечений з лососем", ru: "Запечённый с лососем", en: "Baked Salmon", vn: "Cuộn nướng cá hồi" },
    desc: {
      ua: "Крем-сир Філадельфія, Авокадо, Сирна шапочка, Лосось, Теріякі",
      ru: "Крем-сыр Филадельфия, Авокадо, Сырная шапочка, Лосось, Терияки",
      en: "Philadelphia cream cheese, Avocado, Cheese cap, Salmon, Teriyaki",
      vn: "Phô mai Philadelphia, Bơ, Phô mai phủ, Cá hồi, Sốt teriyaki"
    }
  },
  {
    id: 36, cat: "rolls", sub: "baked", price: 175000, img: "img/menu/35.png", // ФОТО: Запечений з куркою
    name: { ua: "Запечений з куркою", ru: "Запечённый с курицей", en: "Baked Chicken", vn: "Cuộn nướng gà" },
    desc: {
      ua: "Омлет у японському стилі, Авокадо, Сирна шапочка, Курка, Теріякі, Кріп",
      ru: "Омлет в японском стиле, Авокадо, Сырная шапочка, Курица, Терияки, Укроп",
      en: "Japanese-style omelette, Avocado, Cheese cap, Chicken, Teriyaki, Dill",
      vn: "Trứng cuộn kiểu Nhật, Bơ, Phô mai phủ, Gà, Sốt teriyaki, Thì là"
    }
  },

  /* ---------- РОЛЛЫ · SPICY TUNA ROLL ---------- */
  {
    id: 20, cat: "rolls", sub: "spicy", price: 199000, spicy: true, img: "img/menu/39.jpg", // ФОТО: Spicy Tuna roll
    name: { ua: "Spicy Tuna roll", ru: "Spicy Tuna roll", en: "Spicy Tuna roll", vn: "Spicy Tuna roll" },
    desc: {
      ua: "Рис, Тунець, Крем-сир, Авокадо, Тобіко, Салат айсберг, Шірача + Майонез, Норі",
      ru: "Рис, Тунец, Крем-сыр, Авокадо, Тобико, Салат айсберг, Ширача + Майонез, Нори",
      en: "Rice, Tuna, Cream cheese, Avocado, Tobiko, Iceberg, Sriracha + Mayo, Nori",
      vn: "Cơm, Cá ngừ, Phô mai kem, Bơ, Tobiko, Xà lách, Sriracha + Mayo, Rong biển"
    }
  },

  /* ---------- РОЛЛЫ · ДРАКОНИ ---------- */
  {
    id: 12, cat: "rolls", sub: "dragon", price: 219000, img: "img/menu/12.jpg", // ФОТО: Червоний Дракон
    name: { ua: "Червоний Дракон", ru: "Красный Дракон", en: "Red Dragon", vn: "Rồng đỏ" },
    desc: {
      ua: "Рис, Лосось, Вугор, Авокадо, Тобіко, Омлет, Норі",
      ru: "Рис, Лосось, Угорь, Авокадо, Тобико, Омлет, Нори",
      en: "Rice, Salmon, Eel, Avocado, Tobiko, Omelette, Nori",
      vn: "Cơm, Cá hồi, Lươn, Bơ, Tobiko, Trứng cuộn, Rong biển"
    }
  },
  {
    id: 13, cat: "rolls", sub: "dragon", price: 219000, img: "img/menu/36.jpg", // ФОТО: Золотий Дракон
    name: { ua: "Золотий Дракон", ru: "Золотой Дракон", en: "Golden Dragon", vn: "Rồng vàng" },
    desc: {
      ua: "Рис, Вугор, Лосось, Тунець, Авокадо, Тобіко, Омлет, Норі",
      ru: "Рис, Угорь, Лосось, Тунец, Авокадо, Тобико, Омлет, Нори",
      en: "Rice, Eel, Salmon, Tuna, Avocado, Tobiko, Omelette, Nori",
      vn: "Cơm, Lươn, Cá hồi, Cá ngừ, Bơ, Tobiko, Trứng cuộn, Rong biển"
    }
  },
  {
    id: 15, cat: "rolls", sub: "dragon", price: 175000,             // ФОТО: Зелений Дракон
    name: { ua: "Зелений Дракон", ru: "Зелёный Дракон", en: "Green Dragon", vn: "Rồng xanh" },
    desc: {
      ua: "Рис, Креветка, Вугор, Крем-сир, Авокадо, Норі",
      ru: "Рис, Креветка, Угорь, Крем-сыр, Авокадо, Нори",
      en: "Rice, Shrimp, Eel, Cream cheese, Avocado, Nori",
      vn: "Cơm, Tôm, Lươn, Phô mai kem, Bơ, Rong biển"
    }
  },

  /* ---------- РОЛЛЫ · МАКІ ---------- */
  {
    id: 10, cat: "rolls", sub: "maki", price: 95000, img: "img/menu/32.png", // ФОТО: Макі Лосось-Огірок-Крем сир
    name: { ua: "Макі Лосось-Огірок-Крем сир", ru: "Маки Лосось-Огурец-Крем сыр", en: "Maki Salmon-Cucumber-Cheese", vn: "Maki cá hồi - dưa leo - phô mai" },
    desc: {
      ua: "Рис, Лосось, Огірок, Крем-сир, Норі ½",
      ru: "Рис, Лосось, Огурец, Крем-сыр, Нори ½",
      en: "Rice, Salmon, Cucumber, Cream cheese, Nori ½",
      vn: "Cơm, Cá hồi, Dưa leo, Phô mai kem, Rong biển ½"
    }
  },
  {
    id: 7, cat: "rolls", sub: "maki", price: 79000,                 // ФОТО: Макі Лосось
    name: { ua: "Макі Лосось", ru: "Маки Лосось", en: "Maki Salmon", vn: "Maki cá hồi" },
    desc: {
      ua: "Рис, Лосось, Норі ½",
      ru: "Рис, Лосось, Нори ½",
      en: "Rice, Salmon, Nori ½",
      vn: "Cơm, Cá hồi, Rong biển ½"
    }
  },
  {
    id: 8, cat: "rolls", sub: "maki", price: 35000, veg: true,      // ФОТО: Макі Огірок
    name: { ua: "Макі Огірок", ru: "Маки Огурец", en: "Maki Cucumber", vn: "Maki dưa leo" },
    desc: {
      ua: "Рис, Огірок, Норі ½",
      ru: "Рис, Огурец, Нори ½",
      en: "Rice, Cucumber, Nori ½",
      vn: "Cơm, Dưa leo, Rong biển ½"
    }
  },
  {
    id: 11, cat: "rolls", sub: "maki", price: 105000, img: "img/menu/33.png", // ФОТО: Макі Вугор
    name: { ua: "Макі Вугор", ru: "Маки с угрем", en: "Maki Eel", vn: "Maki lươn" },
    desc: {
      ua: "Рис, Вугор, Норі ½",
      ru: "Рис, Угорь, Нори ½",
      en: "Rice, Eel, Nori ½",
      vn: "Cơm, Lươn, Rong biển ½"
    }
  },

  /* ---------- СУШИ · ГУНКАН (всі гострі) ---------- */
  {
    id: 27, cat: "sushi", sub: "gunkan", price: 59000, spicy: true, // ФОТО: Гункан Лосось
    name: { ua: "Гункан Лосось", ru: "Гункан Лосось", en: "Gunkan Salmon", vn: "Gunkan cá hồi" },
    desc: {
      ua: "Рис, Лосось, Майонез, Шірача, Норі смужка",
      ru: "Рис, Лосось, Майонез, Ширача, Нори полоска",
      en: "Rice, Salmon, Mayo, Sriracha, Nori strip",
      vn: "Cơm, Cá hồi, Mayo, Sriracha, Rong biển"
    }
  },
  {
    id: 28, cat: "sushi", sub: "gunkan", price: 59000, spicy: true, // ФОТО: Гункан Тунець спайсі
    name: { ua: "Гункан Тунець спайсі", ru: "Гункан Тунец спайси", en: "Gunkan Spicy Tuna", vn: "Gunkan cá ngừ cay" },
    desc: {
      ua: "Рис, Тунець, Майонез, Шірача, Норі смужка",
      ru: "Рис, Тунец, Майонез, Ширача, Нори полоска",
      en: "Rice, Tuna, Mayo, Sriracha, Nori strip",
      vn: "Cơm, Cá ngừ, Mayo, Sriracha, Rong biển"
    }
  },
  {
    id: 29, cat: "sushi", sub: "gunkan", price: 59000, spicy: true, // ФОТО: Гункан Креветка
    name: { ua: "Гункан Креветка", ru: "Гункан Креветка", en: "Gunkan Shrimp", vn: "Gunkan tôm" },
    desc: {
      ua: "Рис, Креветка, Майонез, Шірача, Норі смужка",
      ru: "Рис, Креветка, Майонез, Ширача, Нори полоска",
      en: "Rice, Shrimp, Mayo, Sriracha, Nori strip",
      vn: "Cơm, Tôm, Mayo, Sriracha, Rong biển"
    }
  },
  {
    id: 30, cat: "sushi", sub: "gunkan", price: 79000, spicy: true, img: "img/menu/31.png", // ФОТО: Гункан Вугор
    name: { ua: "Гункан Вугор", ru: "Гункан Угорь", en: "Gunkan Eel", vn: "Gunkan lươn" },
    desc: {
      ua: "Рис, Вугор, Майонез, Шірача, Норі смужка",
      ru: "Рис, Угорь, Майонез, Ширача, Нори полоска",
      en: "Rice, Eel, Mayo, Sriracha, Nori strip",
      vn: "Cơm, Lươn, Mayo, Sriracha, Rong biển"
    }
  },

  /* ---------- СУШИ · НІГІРІ ---------- */
  {
    id: 23, cat: "sushi", sub: "nigiri", price: 49000,              // ФОТО: Нігірі Лосось
    name: { ua: "Нігірі Лосось", ru: "Нигири Лосось", en: "Nigiri Salmon", vn: "Nigiri cá hồi" },
    desc: {
      ua: "Рис, Лосось",
      ru: "Рис, Лосось",
      en: "Rice, Salmon",
      vn: "Cơm, Cá hồi"
    }
  },
  {
    id: 24, cat: "sushi", sub: "nigiri", price: 49000,              // ФОТО: Нігірі Тунець
    name: { ua: "Нігірі Тунець", ru: "Нигири Тунец", en: "Nigiri Tuna", vn: "Nigiri cá ngừ" },
    desc: {
      ua: "Рис, Тунець",
      ru: "Рис, Тунец",
      en: "Rice, Tuna",
      vn: "Cơm, Cá ngừ"
    }
  },
  {
    id: 25, cat: "sushi", sub: "nigiri", price: 49000,              // ФОТО: Нігірі Креветка
    name: { ua: "Нігірі Креветка", ru: "Нигири Креветка", en: "Nigiri Shrimp", vn: "Nigiri tôm" },
    desc: {
      ua: "Рис, Креветка",
      ru: "Рис, Креветка",
      en: "Rice, Shrimp",
      vn: "Cơm, Tôm"
    }
  },
  {
    id: 26, cat: "sushi", sub: "nigiri", price: 69000,              // ФОТО: Нігірі Вугор
    name: { ua: "Нігірі Вугор", ru: "Нигири Угорь", en: "Nigiri Eel", vn: "Nigiri lươn" },
    desc: {
      ua: "Рис, Вугор",
      ru: "Рис, Угорь",
      en: "Rice, Eel",
      vn: "Cơm, Lươn"
    }
  },

  /* ---------- НАПИТКИ ---------- */
  {
    id: 31, cat: "drinks", sub: "drinks", price: 15000, img: "img/menu/Вода.png", // ФОТО: Вода
    name: { ua: "Вода", ru: "Вода", en: "Water", vn: "Nước" },
    desc: { ua: "", ru: "", en: "", vn: "" }
  },
  {
    id: 32, cat: "drinks", sub: "drinks", price: 20000, img: "img/menu/Pepsi.png", // ФОТО: Pepsi
    name: { ua: "Pepsi", ru: "Pepsi", en: "Pepsi", vn: "Pepsi" },
    desc: { ua: "", ru: "", en: "", vn: "" }
  },
  {
    id: 33, cat: "drinks", sub: "drinks", price: 20000, img: "img/menu/Ppsi Zero.png", // ФОТО: Pepsi Zero
    name: { ua: "Pepsi Zero", ru: "Pepsi Zero", en: "Pepsi Zero", vn: "Pepsi Zero" },
    desc: { ua: "", ru: "", en: "", vn: "" }
  },
  {
    id: 34, cat: "drinks", sub: "drinks", price: 20000, img: "img/menu/Pepsi Zero lime.jpeg", // ФОТО: Pepsi Zero Lime
    name: { ua: "Pepsi Zero Lime", ru: "Pepsi Zero Lime", en: "Pepsi Zero Lime", vn: "Pepsi Zero Lime" },
    desc: { ua: "", ru: "", en: "", vn: "" }
  }
];

/* ===== СКИДКА −20% на всё, кроме напитков (drinks) ===== */
const SALE = 0.20;
/* Действующая цена блюда: со скидкой, кроме категории drinks */
function dishPrice(d){
  if(!d) return 0;
  return (d.cat === 'drinks' || d.noSale) ? d.price : Math.round(d.price * (1 - SALE));
}
/* Есть ли скидка у блюда (для бейджа и зачёркнутой цены) */
function hasSale(d){ return !!d && d.cat !== 'drinks' && !d.noSale; }

/* ===== ПЕРЕВОДЫ ИНТЕРФЕЙСА ===== */
const I18N = {
  ua: {
    nav_sushi: "Суші", nav_rolls: "Роли", nav_hot: "Гарячі роли", nav_drinks: "Напої",
    hero_tagline: "Свіжі суші з доставкою", hero_btn: "Переглянути меню",
    hours_label: "Години роботи:", hours_time: "🕘 16:00 – 20:00",
    sub_new: "Новинки", badge_new: "Новинка",
    sub_philadelphia: "Філадельфія", sub_california: "Каліфорнія", sub_maki: "Макі",
    sub_spicy: "Spicy Tuna roll", sub_dragon: "Дракони", sub_baked: "Запечені", sub_felix: "Фелікс",
    sub_nigiri: "Нігірі", sub_gunkan: "Гункан", sub_drinks: "Напої",
    add: "У кошик", spicy: "Гострі", veg: "Вегетаріанські",
    cart: "Кошик", cart_empty: "Кошик порожній", total: "Разом",
    checkout: "Оформити замовлення", drinks_soon: "Напої скоро з'являться",
    login: "Вхід", register: "Реєстрація", logout: "Вийти",
    order_name: "Ім'я", order_phone: "Телефон", order_telegram: "Telegram", order_address: "Адреса",
    order_pay: "Оплата", pay_cash: "Готівка кур'єру", pay_qr: "QR кур'єру",
    order_people: "Кількість осіб", order_comment: "Коментар", order_send: "Підтвердити замовлення",
    email: "Email", password: "Пароль", my_orders: "Мої замовлення",
    map_geo: "📍 Моя геолокація", map_pick: "Вибрати на карті",
    map_hint: "Уточніть квартиру/поверх у коментарі нижче",
    success_title: "✅ Замовлення відправлено!",
    success_text: "Наш менеджер зв'яжеться з вами найближчим часом для підтвердження.",
    success_ok: "Добре",
    order_bar_cta: "Оформити", added_toast: "Товар додано до кошика",
    forgot_password: "Забули пароль?",
    reset_sending: "Надсилаємо...", reset_sent: "Лист для відновлення надіслано на пошту"
  },
  ru: {
    nav_sushi: "Суши", nav_rolls: "Роллы", nav_hot: "Горячие роллы", nav_drinks: "Напитки",
    hero_tagline: "Свежие суши с доставкой", hero_btn: "Смотреть меню",
    hours_label: "Часы работы:", hours_time: "🕘 16:00 – 20:00",
    sub_new: "Новинки", badge_new: "Новинка",
    sub_philadelphia: "Филадельфия", sub_california: "Калифорния", sub_maki: "Маки",
    sub_spicy: "Spicy Tuna roll", sub_dragon: "Драконы", sub_baked: "Запечённые", sub_felix: "Феликс",
    sub_nigiri: "Нигири", sub_gunkan: "Гункан", sub_drinks: "Напитки",
    add: "В корзину", spicy: "Острые", veg: "Вегетарианские",
    cart: "Корзина", cart_empty: "Корзина пуста", total: "Итого",
    checkout: "Оформить заказ", drinks_soon: "Напитки скоро появятся",
    login: "Вход", register: "Регистрация", logout: "Выйти",
    order_name: "Имя", order_phone: "Телефон", order_telegram: "Telegram", order_address: "Адрес",
    order_pay: "Оплата", pay_cash: "Наличные курьеру", pay_qr: "QR курьеру",
    order_people: "Количество человек", order_comment: "Комментарий", order_send: "Подтвердить заказ",
    email: "Email", password: "Пароль", my_orders: "Мои заказы",
    map_geo: "📍 Моя геолокация", map_pick: "Выбрать на карте",
    map_hint: "Уточните квартиру/этаж в комментарии ниже",
    success_title: "✅ Заказ отправлен!",
    success_text: "Наш менеджер свяжется с вами в ближайшее время для подтверждения.",
    success_ok: "Хорошо",
    order_bar_cta: "Оформить", added_toast: "Товар добавлен в корзину",
    forgot_password: "Забыли пароль?",
    reset_sending: "Отправляем...", reset_sent: "Письмо для восстановления отправлено на почту"
  },
  en: {
    nav_sushi: "Sushi", nav_rolls: "Rolls", nav_hot: "Hot Rolls", nav_drinks: "Drinks",
    hero_tagline: "Fresh sushi delivered", hero_btn: "View menu",
    hours_label: "Working hours:", hours_time: "🕘 4:00 – 8:00 PM",
    sub_new: "New", badge_new: "New",
    sub_philadelphia: "Philadelphia", sub_california: "California", sub_maki: "Maki",
    sub_spicy: "Spicy Tuna roll", sub_dragon: "Dragons", sub_baked: "Baked", sub_felix: "Felix",
    sub_nigiri: "Nigiri", sub_gunkan: "Gunkan", sub_drinks: "Drinks",
    add: "Add to cart", spicy: "Spicy", veg: "Vegetarian",
    cart: "Cart", cart_empty: "Cart is empty", total: "Total",
    checkout: "Checkout", drinks_soon: "Drinks coming soon",
    login: "Log in", register: "Sign up", logout: "Log out",
    order_name: "Name", order_phone: "Phone", order_telegram: "Telegram", order_address: "Address",
    order_pay: "Payment", pay_cash: "Cash to courier", pay_qr: "QR to courier",
    order_people: "Number of people", order_comment: "Comment", order_send: "Confirm order",
    email: "Email", password: "Password", my_orders: "My orders",
    map_geo: "📍 My location", map_pick: "Pick on map",
    map_hint: "Add apartment/floor in the comment below",
    success_title: "✅ Order sent!",
    success_text: "Our manager will contact you shortly to confirm.",
    success_ok: "OK",
    order_bar_cta: "Checkout", added_toast: "Added to cart",
    forgot_password: "Forgot password?",
    reset_sending: "Sending...", reset_sent: "Recovery email sent"
  },
  vn: {
    nav_sushi: "Sushi", nav_rolls: "Cuộn", nav_hot: "Cuộn nóng", nav_drinks: "Đồ uống",
    hero_tagline: "Sushi tươi giao tận nơi", hero_btn: "Xem thực đơn",
    hours_label: "Giờ làm việc:", hours_time: "🕘 16h00 – 20h00",
    sub_new: "Mới", badge_new: "Mới",
    sub_philadelphia: "Philadelphia", sub_california: "California", sub_maki: "Maki",
    sub_spicy: "Spicy Tuna roll", sub_dragon: "Rồng", sub_baked: "Nướng", sub_felix: "Felix",
    sub_nigiri: "Nigiri", sub_gunkan: "Gunkan", sub_drinks: "Đồ uống",
    add: "Thêm vào giỏ", spicy: "Cay", veg: "Chay",
    cart: "Giỏ hàng", cart_empty: "Giỏ hàng trống", total: "Tổng cộng",
    checkout: "Đặt hàng", drinks_soon: "Đồ uống sắp có",
    login: "Đăng nhập", register: "Đăng ký", logout: "Đăng xuất",
    order_name: "Tên", order_phone: "Điện thoại", order_telegram: "Telegram", order_address: "Địa chỉ",
    order_pay: "Thanh toán", pay_cash: "Tiền mặt cho shipper", pay_qr: "QR cho shipper",
    order_people: "Số người", order_comment: "Ghi chú", order_send: "Xác nhận đơn hàng",
    email: "Email", password: "Mật khẩu", my_orders: "Đơn hàng của tôi",
    map_geo: "📍 Vị trí của tôi", map_pick: "Chọn trên bản đồ",
    map_hint: "Ghi rõ căn hộ/tầng trong ghi chú bên dưới",
    success_title: "✅ Đã gửi đơn hàng!",
    success_text: "Quản lý của chúng tôi sẽ sớm liên hệ với bạn để xác nhận.",
    success_ok: "Đồng ý",
    order_bar_cta: "Đặt hàng", added_toast: "Đã thêm vào giỏ",
    forgot_password: "Quên mật khẩu?",
    reset_sending: "Đang gửi...", reset_sent: "Email khôi phục đã được gửi"
  }
};

/* Порядок категорий и подгрупп для рендера */
const CATEGORIES = ["rolls", "sushi", "drinks"];
const SUBGROUPS = {
  rolls: ["new", "philadelphia", "baked", "spicy", "dragon", "maki"],
  sushi: ["gunkan", "nigiri"],
  drinks: ["drinks"]
};
