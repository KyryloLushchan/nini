/* ============================================================
   NiNi Sushi — ДАННЫЕ МЕНЮ
   ------------------------------------------------------------
   Как пользоваться:
   - id           : номер блюда (= имя файла фото: img/menu/1.jpg и т.д.)
   - cat          : категория верхнего меню-бара
                    "sushi"   = Суши (Нігірі + Гункан)
                    "rolls"   = Роллы (Філадельфія + Каліфорнія + Макі + Дракони)
                    "hot"     = Горячие роллы (Запечені + Фелікс)
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
  /* ---------- РОЛЛЫ · ФІЛАДЕЛЬФІЯ ---------- */
  {
    id: 1, cat: "rolls", sub: "philadelphia", price: 189000,        // ФОТО: Філадельфія з лососем
    name: { ua: "Філадельфія з лососем", ru: "Филадельфия с лососем", en: "Philadelphia with Salmon", vn: "Philadelphia cá hồi" },
    desc: {
      ua: "Рис, Лосось, Огірок, Крем-сир, Норі",
      ru: "Рис, Лосось, Огурец, Крем-сыр, Нори",
      en: "Rice, Salmon, Cucumber, Cream cheese, Nori",
      vn: "Cơm, Cá hồi, Dưa leo, Phô mai kem, Rong biển"
    }
  },
  {
    id: 2, cat: "rolls", sub: "philadelphia", price: 199000,        // ФОТО: Філадельфія з лососем та авокадо
    name: { ua: "Філадельфія з лососем та авокадо", ru: "Филадельфия с лососем и авокадо", en: "Philadelphia Salmon & Avocado", vn: "Philadelphia cá hồi & bơ" },
    desc: {
      ua: "Рис, Лосось, Авокадо, Крем-сир, Тобіко, Норі",
      ru: "Рис, Лосось, Авокадо, Крем-сыр, Тобико, Нори",
      en: "Rice, Salmon, Avocado, Cream cheese, Tobiko, Nori",
      vn: "Cơm, Cá hồi, Bơ, Phô mai kem, Trứng cá tobiko, Rong biển"
    }
  },
  {
    id: 3, cat: "rolls", sub: "philadelphia", price: 189000,        // ФОТО: Філадельфія Гриль
    name: { ua: "Філадельфія Гриль", ru: "Филадельфия Гриль", en: "Philadelphia Grill", vn: "Philadelphia nướng" },
    desc: {
      ua: "Рис, Лосось, Огірок, Крем-сир, Норі",
      ru: "Рис, Лосось, Огурец, Крем-сыр, Нори",
      en: "Rice, Salmon, Cucumber, Cream cheese, Nori",
      vn: "Cơm, Cá hồi, Dưa leo, Phô mai kem, Rong biển"
    }
  },

  /* ---------- РОЛЛЫ · КАЛІФОРНІЯ ---------- */
  {
    id: 4, cat: "rolls", sub: "california", price: 159000, img: "img/menu/6.jpg", // ФОТО: Каліфорнія з лососем
    name: { ua: "Каліфорнія з лососем", ru: "Калифорния с лососем", en: "California with Salmon", vn: "California cá hồi" },
    desc: {
      ua: "Рис, Лосось, Авокадо, Огірок, Тобіко, Норі",
      ru: "Рис, Лосось, Авокадо, Огурец, Тобико, Нори",
      en: "Rice, Salmon, Avocado, Cucumber, Tobiko, Nori",
      vn: "Cơm, Cá hồi, Bơ, Dưa leo, Tobiko, Rong biển"
    }
  },
  {
    id: 5, cat: "rolls", sub: "california", price: 109000, img: "img/menu/4.jpg", // ФОТО: Каліфорнія з креветкою
    name: { ua: "Каліфорнія з креветкою", ru: "Калифорния с креветкой", en: "California with Shrimp", vn: "California tôm" },
    desc: {
      ua: "Рис, Креветка, Авокадо, Огірок, Тобіко, Норі",
      ru: "Рис, Креветка, Авокадо, Огурец, Тобико, Нори",
      en: "Rice, Shrimp, Avocado, Cucumber, Tobiko, Nori",
      vn: "Cơm, Tôm, Bơ, Dưa leo, Tobiko, Rong biển"
    }
  },
  {
    id: 6, cat: "rolls", sub: "california", price: 159000, img: "img/menu/5.jpg", // ФОТО: Каліфорнія з тунцем
    name: { ua: "Каліфорнія з тунцем", ru: "Калифорния с тунцом", en: "California with Tuna", vn: "California cá ngừ" },
    desc: {
      ua: "Рис, Тунець, Авокадо, Огірок, Тобіко, Норі",
      ru: "Рис, Тунец, Авокадо, Огурец, Тобико, Нори",
      en: "Rice, Tuna, Avocado, Cucumber, Tobiko, Nori",
      vn: "Cơm, Cá ngừ, Bơ, Dưa leo, Tobiko, Rong biển"
    }
  },

  /* ---------- РОЛЛЫ · МАКІ ---------- */
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
    id: 9, cat: "rolls", sub: "maki", price: 55000,                 // ФОТО: Макі Креветка
    name: { ua: "Макі Креветка", ru: "Маки Креветка", en: "Maki Shrimp", vn: "Maki tôm" },
    desc: {
      ua: "Рис, Креветка, Норі ½",
      ru: "Рис, Креветка, Нори ½",
      en: "Rice, Shrimp, Nori ½",
      vn: "Cơm, Tôm, Rong biển ½"
    }
  },
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
    id: 11, cat: "rolls", sub: "maki", price: 105000, img: "img/menu/33.png", // ФОТО: Макі Вугор
    name: { ua: "Макі Вугор", ru: "Маки с угрем", en: "Maki Eel", vn: "Maki lươn" },
    desc: {
      ua: "Рис, Вугор, Норі ½",
      ru: "Рис, Угорь, Нори ½",
      en: "Rice, Eel, Nori ½",
      vn: "Cơm, Lươn, Rong biển ½"
    }
  },

  /* ---------- РОЛЛЫ · ДРАКОНИ ---------- */
  {
    id: 12, cat: "rolls", sub: "dragon", price: 219000,             // ФОТО: Червоний Дракон
    name: { ua: "Червоний Дракон", ru: "Красный Дракон", en: "Red Dragon", vn: "Rồng đỏ" },
    desc: {
      ua: "Рис, Лосось, Вугор, Авокадо, Тобіко, Омлет, Норі",
      ru: "Рис, Лосось, Угорь, Авокадо, Тобико, Омлет, Нори",
      en: "Rice, Salmon, Eel, Avocado, Tobiko, Omelette, Nori",
      vn: "Cơm, Cá hồi, Lươn, Bơ, Tobiko, Trứng cuộn, Rong biển"
    }
  },
  {
    id: 13, cat: "rolls", sub: "dragon", price: 219000, img: "img/menu/11.jpg", // ФОТО: Золотий Дракон
    name: { ua: "Золотий Дракон", ru: "Золотой Дракон", en: "Golden Dragon", vn: "Rồng vàng" },
    desc: {
      ua: "Рис, Вугор, Лосось, Тунець, Авокадо, Тобіко, Омлет, Норі",
      ru: "Рис, Угорь, Лосось, Тунец, Авокадо, Тобико, Омлет, Нори",
      en: "Rice, Eel, Salmon, Tuna, Avocado, Tobiko, Omelette, Nori",
      vn: "Cơm, Lươn, Cá hồi, Cá ngừ, Bơ, Tobiko, Trứng cuộn, Rong biển"
    }
  },
  {
    id: 14, cat: "rolls", sub: "dragon", price: 189000, img: "img/menu/13.jpg", // ФОТО: Тигровий Дракон
    name: { ua: "Тигровий Дракон", ru: "Дракон Тигровый", en: "Tiger Dragon", vn: "Rồng hổ" },
    desc: {
      ua: "Рис, Креветка, Вугор, Краб, Крем-сир, Авокадо, Огірок, Соус унагі, Норі",
      ru: "Рис, Креветка, Угорь, Краб, Крем-сыр, Авокадо, Огурец, Соус унаги, Нори",
      en: "Rice, Shrimp, Eel, Crab, Cream cheese, Avocado, Cucumber, Unagi sauce, Nori",
      vn: "Cơm, Tôm, Lươn, Cua, Phô mai kem, Bơ, Dưa leo, Sốt unagi, Rong biển"
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

  /* ---------- ГОРЯЧИЕ · ЗАПЕЧЕНІ ---------- */
  {
    id: 16, cat: "hot", sub: "baked", price: 189000,                // ФОТО: Запечений лосось
    name: { ua: "Запечений лосось", ru: "Запечённый с лососем", en: "Baked Salmon", vn: "Cá hồi nướng" },
    desc: {
      ua: "Рис, Лосось, Крем-сир, Авокадо, Гауда, Йогурт, Норі",
      ru: "Рис, Лосось, Крем-сыр, Авокадо, Гауда, Йогурт, Нори",
      en: "Rice, Salmon, Cream cheese, Avocado, Gouda, Yogurt, Nori",
      vn: "Cơm, Cá hồi, Phô mai kem, Bơ, Phô mai Gouda, Sữa chua, Rong biển"
    }
  },
  {
    id: 17, cat: "hot", sub: "baked", price: 199000, spicy: true,   // ФОТО: Запечений тунець спайсі
    name: { ua: "Запечений тунець спайсі", ru: "Запечённый с тунцом спайси", en: "Baked Spicy Tuna", vn: "Cá ngừ nướng cay" },
    desc: {
      ua: "Рис, Тунець, Крем-сир, Авокадо, Гауда, Майонез + Шірача, Кунжут, Норі",
      ru: "Рис, Тунец, Крем-сыр, Авокадо, Гауда, Майонез + Ширача, Кунжут, Нори",
      en: "Rice, Tuna, Cream cheese, Avocado, Gouda, Mayo + Sriracha, Sesame, Nori",
      vn: "Cơm, Cá ngừ, Phô mai kem, Bơ, Gouda, Sốt mayo + Sriracha, Mè, Rong biển"
    }
  },
  {
    id: 18, cat: "hot", sub: "baked", price: 159000,                // ФОТО: Запечена креветка
    name: { ua: "Запечена креветка", ru: "Запечённый с креветкой", en: "Baked Shrimp", vn: "Tôm nướng" },
    desc: {
      ua: "Рис, Креветка, Крем-сир, Авокадо, Гауда, Йогурт, Норі",
      ru: "Рис, Креветка, Крем-сыр, Авокадо, Гауда, Йогурт, Нори",
      en: "Rice, Shrimp, Cream cheese, Avocado, Gouda, Yogurt, Nori",
      vn: "Cơm, Tôm, Phô mai kem, Bơ, Gouda, Sữa chua, Rong biển"
    }
  },

  /* ---------- ГОРЯЧИЕ · ФЕЛІКС (всі гострі) ---------- */
  {
    id: 19, cat: "hot", sub: "felix", price: 199000, spicy: true,   // ФОТО: Фелікс лосось
    name: { ua: "Фелікс лосось", ru: "Феликс с лососем", en: "Felix Salmon", vn: "Felix cá hồi" },
    desc: {
      ua: "Рис, Лосось, Крем-сир, Авокадо, Тобіко, Салат айсберг, Шірача + Майонез, Норі",
      ru: "Рис, Лосось, Крем-сыр, Авокадо, Тобико, Салат айсберг, Ширача + Майонез, Нори",
      en: "Rice, Salmon, Cream cheese, Avocado, Tobiko, Iceberg, Sriracha + Mayo, Nori",
      vn: "Cơm, Cá hồi, Phô mai kem, Bơ, Tobiko, Xà lách, Sriracha + Mayo, Rong biển"
    }
  },
  {
    id: 20, cat: "hot", sub: "felix", price: 199000, spicy: true,   // ФОТО: Фелікс тунець
    name: { ua: "Фелікс тунець", ru: "Феликс с тунцом", en: "Felix Tuna", vn: "Felix cá ngừ" },
    desc: {
      ua: "Рис, Тунець, Крем-сир, Авокадо, Тобіко, Салат айсберг, Шірача + Майонез, Норі",
      ru: "Рис, Тунец, Крем-сыр, Авокадо, Тобико, Салат айсберг, Ширача + Майонез, Нори",
      en: "Rice, Tuna, Cream cheese, Avocado, Tobiko, Iceberg, Sriracha + Mayo, Nori",
      vn: "Cơm, Cá ngừ, Phô mai kem, Bơ, Tobiko, Xà lách, Sriracha + Mayo, Rong biển"
    }
  },
  {
    id: 21, cat: "hot", sub: "felix", price: 159000, spicy: true,   // ФОТО: Фелікс креветка
    name: { ua: "Фелікс креветка", ru: "Феликс с креветкой", en: "Felix Shrimp", vn: "Felix tôm" },
    desc: {
      ua: "Рис, Креветка, Крем-сир, Авокадо, Тобіко, Салат айсберг, Шірача + Майонез, Норі",
      ru: "Рис, Креветка, Крем-сыр, Авокадо, Тобико, Салат айсберг, Ширача + Майонез, Нори",
      en: "Rice, Shrimp, Cream cheese, Avocado, Tobiko, Iceberg, Sriracha + Mayo, Nori",
      vn: "Cơm, Tôm, Phô mai kem, Bơ, Tobiko, Xà lách, Sriracha + Mayo, Rong biển"
    }
  },
  {
    id: 22, cat: "hot", sub: "felix", price: 229000, spicy: true,   // ФОТО: Фелікс вугор
    name: { ua: "Фелікс вугор", ru: "Феликс с угрем", en: "Felix Eel", vn: "Felix lươn" },
    desc: {
      ua: "Рис, Вугор, Крем-сир, Авокадо, Тобіко, Салат айсберг, Шірача + Майонез, Норі",
      ru: "Рис, Угорь, Крем-сыр, Авокадо, Тобико, Салат айсберг, Ширача + Майонез, Нори",
      en: "Rice, Eel, Cream cheese, Avocado, Tobiko, Iceberg, Sriracha + Mayo, Nori",
      vn: "Cơm, Lươn, Phô mai kem, Bơ, Tobiko, Xà lách, Sriracha + Mayo, Rong biển"
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
  }

  /* ---------- НАПИТКИ ---------- */
  ,{
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
  return d.cat === 'drinks' ? d.price : Math.round(d.price * (1 - SALE));
}
/* Есть ли скидка у блюда (для бейджа и зачёркнутой цены) */
function hasSale(d){ return !!d && d.cat !== 'drinks'; }

/* ===== ПЕРЕВОДЫ ИНТЕРФЕЙСА ===== */
const I18N = {
  ua: {
    nav_sushi: "Суші", nav_rolls: "Роли", nav_hot: "Гарячі роли", nav_drinks: "Напої",
    hero_tagline: "Свіжі суші з доставкою", hero_btn: "Переглянути меню",
    sub_philadelphia: "Філадельфія", sub_california: "Каліфорнія", sub_maki: "Макі",
    sub_dragon: "Дракони", sub_baked: "Запечені", sub_felix: "Фелікс",
    sub_nigiri: "Нігірі", sub_gunkan: "Гункан", sub_drinks: "Напої",
    add: "У кошик", spicy: "Гострі", veg: "Вегетаріанські",
    cart: "Кошик", cart_empty: "Кошик порожній", total: "Разом",
    checkout: "Оформити замовлення", drinks_soon: "Напої скоро з'являться",
    login: "Вхід", register: "Реєстрація", logout: "Вийти",
    order_name: "Ім'я", order_phone: "Телефон", order_address: "Адреса",
    order_pay: "Оплата", pay_cash: "Готівка кур'єру", pay_qr: "QR кур'єру",
    order_comment: "Коментар", order_send: "Підтвердити замовлення",
    email: "Email", password: "Пароль", my_orders: "Мої замовлення",
    map_geo: "📍 Моя геолокація", map_pick: "Вибрати на карті",
    map_hint: "Уточніть квартиру/поверх у коментарі нижче",
    success_title: "✅ Замовлення відправлено!",
    success_text: "Наш менеджер зв'яжеться з вами найближчим часом для підтвердження.",
    success_ok: "Добре",
    order_bar_cta: "Оформити", added_toast: "Товар додано до кошика",
    forgot_password: "Забули пароль?"
  },
  ru: {
    nav_sushi: "Суши", nav_rolls: "Роллы", nav_hot: "Горячие роллы", nav_drinks: "Напитки",
    hero_tagline: "Свежие суши с доставкой", hero_btn: "Смотреть меню",
    sub_philadelphia: "Филадельфия", sub_california: "Калифорния", sub_maki: "Маки",
    sub_dragon: "Драконы", sub_baked: "Запечённые", sub_felix: "Феликс",
    sub_nigiri: "Нигири", sub_gunkan: "Гункан", sub_drinks: "Напитки",
    add: "В корзину", spicy: "Острые", veg: "Вегетарианские",
    cart: "Корзина", cart_empty: "Корзина пуста", total: "Итого",
    checkout: "Оформить заказ", drinks_soon: "Напитки скоро появятся",
    login: "Вход", register: "Регистрация", logout: "Выйти",
    order_name: "Имя", order_phone: "Телефон", order_address: "Адрес",
    order_pay: "Оплата", pay_cash: "Наличные курьеру", pay_qr: "QR курьеру",
    order_comment: "Комментарий", order_send: "Подтвердить заказ",
    email: "Email", password: "Пароль", my_orders: "Мои заказы",
    map_geo: "📍 Моя геолокация", map_pick: "Выбрать на карте",
    map_hint: "Уточните квартиру/этаж в комментарии ниже",
    success_title: "✅ Заказ отправлен!",
    success_text: "Наш менеджер свяжется с вами в ближайшее время для подтверждения.",
    success_ok: "Хорошо",
    order_bar_cta: "Оформить", added_toast: "Товар добавлен в корзину",
    forgot_password: "Забыли пароль?"
  },
  en: {
    nav_sushi: "Sushi", nav_rolls: "Rolls", nav_hot: "Hot Rolls", nav_drinks: "Drinks",
    hero_tagline: "Fresh sushi delivered", hero_btn: "View menu",
    sub_philadelphia: "Philadelphia", sub_california: "California", sub_maki: "Maki",
    sub_dragon: "Dragons", sub_baked: "Baked", sub_felix: "Felix",
    sub_nigiri: "Nigiri", sub_gunkan: "Gunkan", sub_drinks: "Drinks",
    add: "Add to cart", spicy: "Spicy", veg: "Vegetarian",
    cart: "Cart", cart_empty: "Cart is empty", total: "Total",
    checkout: "Checkout", drinks_soon: "Drinks coming soon",
    login: "Log in", register: "Sign up", logout: "Log out",
    order_name: "Name", order_phone: "Phone", order_address: "Address",
    order_pay: "Payment", pay_cash: "Cash to courier", pay_qr: "QR to courier",
    order_comment: "Comment", order_send: "Confirm order",
    email: "Email", password: "Password", my_orders: "My orders",
    map_geo: "📍 My location", map_pick: "Pick on map",
    map_hint: "Add apartment/floor in the comment below",
    success_title: "✅ Order sent!",
    success_text: "Our manager will contact you shortly to confirm.",
    success_ok: "OK",
    order_bar_cta: "Checkout", added_toast: "Added to cart",
    forgot_password: "Forgot password?"
  },
  vn: {
    nav_sushi: "Sushi", nav_rolls: "Cuộn", nav_hot: "Cuộn nóng", nav_drinks: "Đồ uống",
    hero_tagline: "Sushi tươi giao tận nơi", hero_btn: "Xem thực đơn",
    sub_philadelphia: "Philadelphia", sub_california: "California", sub_maki: "Maki",
    sub_dragon: "Rồng", sub_baked: "Nướng", sub_felix: "Felix",
    sub_nigiri: "Nigiri", sub_gunkan: "Gunkan", sub_drinks: "Đồ uống",
    add: "Thêm vào giỏ", spicy: "Cay", veg: "Chay",
    cart: "Giỏ hàng", cart_empty: "Giỏ hàng trống", total: "Tổng cộng",
    checkout: "Đặt hàng", drinks_soon: "Đồ uống sắp có",
    login: "Đăng nhập", register: "Đăng ký", logout: "Đăng xuất",
    order_name: "Tên", order_phone: "Điện thoại", order_address: "Địa chỉ",
    order_pay: "Thanh toán", pay_cash: "Tiền mặt cho shipper", pay_qr: "QR cho shipper",
    order_comment: "Ghi chú", order_send: "Xác nhận đơn hàng",
    email: "Email", password: "Mật khẩu", my_orders: "Đơn hàng của tôi",
    map_geo: "📍 Vị trí của tôi", map_pick: "Chọn trên bản đồ",
    map_hint: "Ghi rõ căn hộ/tầng trong ghi chú bên dưới",
    success_title: "✅ Đã gửi đơn hàng!",
    success_text: "Quản lý của chúng tôi sẽ sớm liên hệ với bạn để xác nhận.",
    success_ok: "Đồng ý",
    order_bar_cta: "Đặt hàng", added_toast: "Đã thêm vào giỏ",
    forgot_password: "Quên mật khẩu?"
  }
};

/* Порядок категорий и подгрупп для рендера */
const CATEGORIES = ["sushi", "rolls", "hot", "drinks"];
const SUBGROUPS = {
  sushi: ["nigiri", "gunkan"],
  rolls: ["philadelphia", "california", "maki", "dragon"],
  hot: ["baked", "felix"],
  drinks: ["drinks"]
};
