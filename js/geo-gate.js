/* ============================================================
   NiNi Sushi — МЯГКАЯ ГЕО-ЗАГЛУШКА
   ------------------------------------------------------------
   Если посетитель НЕ из Вьетнама — показываем заглушку поверх сайта.
   ⚠️ Это «ширма» (обходится VPN / отключённым JS). Настоящая
   блокировка по стране — только через Cloudflare перед сайтом.
   fail-open: если страну определить не удалось — сайт показываем.
   ============================================================ */
(function(){
  const ALLOWED = 'VN';
  const norm = c => (typeof c === 'string' && /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : null);

  /* Часовой пояс устройства указывает на Вьетнам — сильный сигнал «я тут».
     Если да, сайт открываем всегда (защита от ложных срабатываний IP-гео). */
  function tzLooksVN(){
    try{
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      return tz === 'Asia/Ho_Chi_Minh' || tz === 'Asia/Saigon';
    }catch(e){ return false; }
  }

  async function fromCountryIs(){
    try{
      const r = await fetch('https://api.country.is', { signal: AbortSignal.timeout(4000) });
      if(r.ok){ const d = await r.json(); return norm(d && d.country); }
    }catch(e){}
    return null;
  }
  async function fromIpWho(){
    try{
      const r = await fetch('https://ipwho.is/?fields=country_code,success', { signal: AbortSignal.timeout(4000) });
      if(r.ok){ const d = await r.json(); if(d && d.success) return norm(d.country_code); }
    }catch(e){}
    return null;
  }

  /* Блокируем ТОЛЬКО при уверенности: оба сервиса ответили и оба говорят «не VN».
     Если хоть один вернул VN, не ответил, или сервисы расходятся — показываем сайт
     (fail-open, чтобы не отсекать реальных гостей из Вьетнама из-за кривого IP-гео). */
  async function isOutsideVN(){
    const known = (await Promise.all([fromCountryIs(), fromIpWho()])).filter(Boolean);
    if(known.length < 2) return false;
    return known.every(c => c !== ALLOWED);
  }

  function showBlock(){
    const o = document.createElement('div');
    o.id = 'geoBlock';
    o.setAttribute('style', [
      'position:fixed','inset:0','z-index:99999',
      'background:#1F1B18','color:#fff',
      'display:flex','align-items:center','justify-content:center',
      'text-align:center','padding:24px',
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif'
    ].join(';'));
    o.innerHTML =
      '<div style="max-width:420px">' +
        '<div style="font-size:54px;margin-bottom:14px">🍣</div>' +
        '<h1 style="font-size:22px;margin:0 0 10px;font-weight:800">NiNi Sushi</h1>' +
        '<p style="font-size:16px;line-height:1.5;opacity:.9;margin:0">' +
          'Доступно лише у В\'єтнамі<br>' +
          'Available only in Vietnam<br>' +
          'Chỉ khả dụng tại Việt Nam' +
        '</p>' +
      '</div>';
    document.body.appendChild(o);
    document.body.style.overflow = 'hidden';
  }

  if(!tzLooksVN()){
    isOutsideVN().then(outside => { if(outside) showBlock(); });
  }
})();
