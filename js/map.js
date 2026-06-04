/* ============================================================
   NiNi Sushi — ВЫБОР ТОЧКИ ДОСТАВКИ НА КАРТЕ (Leaflet + OSM)
   ------------------------------------------------------------
   - Карта инициализируется при ОТКРЫТИИ модалки заказа
     (Leaflet ломается, если контейнер был скрыт при создании).
   - Маркер draggable: клик по карте или перетаскивание маркера
     обновляет #ordLat, #ordLng и #ordAddress.
   - Обратный геокодинг через Nominatim (1 запрос/сек), ошибки — тихо.
   ============================================================ */

const DANANG = [16.0838, 108.2337];

let ordMap = null;
let ordMarker = null;
let lastGeocode = 0; // для лимита Nominatim (1 req/sec)

/* Записать координаты в скрытые поля + текст в адрес */
function setOrderPoint(lat, lng, doGeocode){
  const latEl = document.getElementById('ordLat');
  const lngEl = document.getElementById('ordLng');
  const addrEl = document.getElementById('ordAddress');
  if(!latEl || !lngEl || !addrEl) return;

  latEl.value = lat.toFixed(6);
  lngEl.value = lng.toFixed(6);
  addrEl.value = `Точка на карті — ${lat.toFixed(6)},${lng.toFixed(6)}`;

  if(doGeocode) reverseGeocode(lat, lng);
}

/* Поставить/переместить маркер */
function placeMarker(lat, lng){
  if(!ordMap) return;
  if(ordMarker){
    ordMarker.setLatLng([lat, lng]);
  } else {
    ordMarker = L.marker([lat, lng], { draggable: true }).addTo(ordMap);
    ordMarker.on('dragend', ()=>{
      const p = ordMarker.getLatLng();
      setOrderPoint(p.lat, p.lng, true);
    });
  }
}

/* Обратный геокодинг (тихая обработка ошибок, лимит 1 req/sec) */
function reverseGeocode(lat, lng){
  const now = Date.now();
  if(now - lastGeocode < 1000) return; // уважаем лимит Nominatim
  lastGeocode = now;

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  fetch(url, { headers: { 'Accept': 'application/json' } })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if(data && data.display_name){
        const addrEl = document.getElementById('ordAddress');
        if(addrEl) addrEl.value = data.display_name;
      }
    })
    .catch(()=>{ /* сеть недоступна — оставляем координаты */ });
}

/* Инициализация карты при открытии модалки заказа */
function initOrderMap(){
  // Карта уже создана — просто пересчитать размеры (контейнер стал видим)
  if(ordMap){
    setTimeout(()=> ordMap.invalidateSize(), 100);
    return;
  }

  const el = document.getElementById('ordMap');
  if(!el || typeof L === 'undefined') return;

  ordMap = L.map(el).setView(DANANG, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(ordMap);

  // Клик по карте — ставим точку
  ordMap.on('click', (e)=>{
    placeMarker(e.latlng.lat, e.latlng.lng);
    setOrderPoint(e.latlng.lat, e.latlng.lng, true);
  });

  // Контейнер только что показан — пересчитать размеры
  setTimeout(()=> ordMap.invalidateSize(), 100);

  // Кнопка "Моя геолокація"
  const btnGeo = document.getElementById('btnGeo');
  if(btnGeo){
    btnGeo.addEventListener('click', ()=>{
      if(!navigator.geolocation){ return; }
      btnGeo.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos)=>{
          const { latitude: lat, longitude: lng } = pos.coords;
          ordMap.setView([lat, lng], 16);
          placeMarker(lat, lng);
          setOrderPoint(lat, lng, true);
          btnGeo.disabled = false;
        },
        ()=>{ btnGeo.disabled = false; }, // отказ/ошибка — тихо
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // Кнопка "Вибрати на карті" — проскроллить/сфокусировать карту
  const btnPick = document.getElementById('btnPickMap');
  if(btnPick){
    btnPick.addEventListener('click', ()=>{
      ordMap.invalidateSize();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
