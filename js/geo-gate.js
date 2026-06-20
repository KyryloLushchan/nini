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

  async function getCountry(){
    const norm = c => (typeof c === 'string' && /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : null);
    try{
      const r = await fetch('https://api.country.is', { signal: AbortSignal.timeout(4000) });
      if(r.ok){ const d = await r.json(); const c = norm(d && d.country); if(c) return c; }
    }catch(e){}
    try{
      const r = await fetch('https://ipwho.is/?fields=country_code,success', { signal: AbortSignal.timeout(4000) });
      if(r.ok){ const d = await r.json(); if(d && d.success) return norm(d.country_code); }
    }catch(e){}
    return null;
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

  getCountry().then(c => { if(c && c !== ALLOWED) showBlock(); });
})();
