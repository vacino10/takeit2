// givo – generátor screenshotů pro App Store a Google Play.
// Vše se skládá v prohlížeči (fotky z Unsplash uložené ve web/photos), stáhne se jako JPG v přesném rozměru (bez průhlednosti – App Store PNG s alfa kanálem odmítá).
(() => {
  const OV = window.OVERLAYS || {};
  const PHOTO_FILE = {"photo-1555041469-a586c61ea9bc": "sofa", "photo-1485965120184-e220f721d03e": "bike", "photo-1527443224154-c4a3942d3acf": "monitor", "photo-1517668808822-9ebb02f2a0e6": "coffee", "photo-1614594975525-e45190c55d0b": "plant", "photo-1507473885765-e6ed057f782c": "lamp", "photo-1512820790803-83ca734da794": "books", "photo-1551028719-00167b16eac5": "jacket", "photo-1559454403-b8fb88521f11": "teddy", "photo-1503602642458-232111445657": "chair", "photo-1505740420928-5e560c06d30e": "phones", "photo-1514228742587-6b1558fcca3d": "mugs"};
  const U = (id) => `/photos/${PHOTO_FILE[id]}.jpg`; // fotky z Unsplash uložené v repu (web/photos)
  const PH = {
    sofa: 'photo-1555041469-a586c61ea9bc',
    bike: 'photo-1485965120184-e220f721d03e',
    monitor: 'photo-1527443224154-c4a3942d3acf',
    coffee: 'photo-1517668808822-9ebb02f2a0e6',
    plant: 'photo-1614594975525-e45190c55d0b',
    lamp: 'photo-1507473885765-e6ed057f782c',
    books: 'photo-1512820790803-83ca734da794',
    jacket: 'photo-1551028719-00167b16eac5',
    teddy: 'photo-1559454403-b8fb88521f11',
    chair: 'photo-1503602642458-232111445657',
    phones: 'photo-1505740420928-5e560c06d30e',
    mugs: 'photo-1514228742587-6b1558fcca3d',
  };
  const ICON = {
    lock: '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  };
  const SPARK = (c) => `<svg viewBox="0 0 24 24"><path fill="${c}" d="M12 0c.7 6.6 5.4 11.3 12 12-6.6.7-11.3 5.4-12 12-.7-6.6-5.4-11.3-12-12C6.6 11.3 11.3 6.6 12 0z"/></svg>`;

  // ---------- stavební kameny ----------
  const phone = (name, { x = 50, top, w, rot = 0, z = 2 }) => {
    const ph = (OV[name] || [])
      .map((o) => {
        const [cx, cy, cw, ch] = o.c;
        const [ix, iy, iw, ih] = o.i;
        return `<span class="ph" style="left:${cx}%;top:${cy}%;width:${cw}%;height:${ch}%"><img src="${o.u}" alt="" style="left:${((ix - cx) / cw) * 100}%;top:${((iy - cy) / ch) * 100}%;width:${(iw / cw) * 100}%;height:${(ih / ch) * 100}%"></span>`;
      })
      .join('');
    return `<div class="p" style="--pw:${w}px;width:${w}px;top:${top}px;left:${x}%;z-index:${z};transform:translateX(-50%) rotate(${rot}deg)"><div class="scr">${ph}<img class="shotimg" src="/store/screen-${name}.webp" alt=""></div></div>`;
  };
  const head = (top, title, sub) => `<div class="head" style="top:${top}px"><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`;
  const spark = (x, y, s, c) => `<div class="spark" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px">${SPARK(c)}</div>`;
  const card = (x, y, w, inner, rot = 0) => `<div class="card" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg)">${inner}</div>`;
  const photoIc = (id) => `<div class="ic"><img src="${U(id, 300)}" alt=""></div>`;
  const svgIc = (k) => `<div class="ic">${ICON[k]}</div>`;
  const phoneH = (w) => w * (0.952 * (844 / 390)) + w * 0.048 + 12; // přibližná výška rámečku

  // ---------- jednotlivé obrázky ----------
  // L = layout platformy: { W, H, headTop, phoneTop, phoneW }
  const SHOTS = [
    {
      id: '1-uvod',
      html: (L) => {
        const u = L.W / 100;
        const icon = u * 22;
        const bubbles = [
          ['sofa', 50, 0.0, 30], ['teddy', 14, 0.12, 19], ['phones', 84, 0.1, 21], ['plant', 22, 0.42, 22],
          ['lamp', 80, 0.4, 18], ['books', 52, 0.55, 24], ['jacket', 13, 0.73, 15], ['chair', 84, 0.7, 17],
          ['mugs', 33, 0.86, 13], ['coffee', 68, 0.88, 14],
        ];
        const areaTop = L.H * (L.play ? 0.4 : 0.37);
        const areaH = L.H * (L.play ? 0.44 : 0.47);
        return (
          `<img class="icon-big" src="/img/icon-512.png" alt="" style="top:${L.headTop - u * 4}px;width:${icon}px;height:${icon}px">` +
          head(L.headTop + icon + u * 5, 'Věci <em>zdarma</em><br>od sousedů') +
          bubbles
            .map(([k, x, y, s]) => {
              const d = s * u;
              return `<div class="bub" style="width:${d}px;height:${d}px;left:${(x / 100) * L.W - d / 2}px;top:${areaTop + y * areaH}px"><img src="${U(PH[k], 600)}" alt=""></div>`;
            })
            .join('') +
          spark(8, 40, u * 6, '#7DE3B8') + spark(88, 31, u * 4.5, '#7028E8') + spark(60, 47, u * 3.5, '#B79CFF') + spark(6, 86, u * 5, '#7028E8') +
          `<div class="foot" style="bottom:${u * 6}px">Pošli radost dál.</div>`
        );
      },
    },
    {
      id: '2-v-okoli',
      html: (L) => {
        const u = L.W / 100;
        return (
          head(L.headTop, 'Najdi poklady<br><em>kousek od sebe</em>', 'Nábytek, oblečení, věci pro děti i elektronika – zdarma od sousedů.') +
          phone('home', { top: L.phoneTop, w: L.phoneW }) +
          card(u * 3, L.phoneTop + phoneH(L.phoneW) * 0.56, u * 50, `${photoIc(PH.sofa)}<div><b>Pohovka trojsed</b><span>Zdarma · 1,2 km</span></div>`, -4) +
          spark(88, (L.phoneTop / L.H) * 100 + 4, u * 5, '#7DE3B8')
        );
      },
    },
    {
      id: '3-mam-zajem',
      html: (L) => {
        const u = L.W / 100;
        return (
          head(L.headTop, 'Líbí se ti? Klepni<br>na <em>Mám zájem</em>', 'Napiš dárci pár slov a počkej, až tě potvrdí.') +
          phone('detail', { top: L.phoneTop, w: L.phoneW }) +
          spark(9, (L.phoneTop / L.H) * 100 + 10, u * 5.5, '#7028E8') + spark(90, (L.phoneTop / L.H) * 100 + 30, u * 4, '#7DE3B8')
        );
      },
    },
    {
      id: '4-vyber-komu',
      html: (L) => {
        const u = L.W / 100;
        return (
          head(L.headTop, 'Ty vybereš,<br><em>komu</em> věc dáš', 'Zájemci se ti představí a ty rozhodneš.') +
          phone('activity', { top: L.phoneTop, w: L.phoneW }) +
          card(u * 6, L.phoneTop + phoneH(L.phoneW) * 0.62, u * 88, `${photoIc(PH.lamp)}<div><div class="app"><i></i>givo · teď</div><b>Nová žádost o Stolní lampu</b><span>Veronika: Hodila by se nám do dětského pokoje.</span></div>`)
        );
      },
    },
    {
      id: '5-o-mne',
      html: (L) => {
        const u = L.W / 100;
        return (
          head(L.headTop, 'Řekni, <em>proč</em><br>věci hledáš', 'Dárci rádi vědí, komu dělají radost.') +
          phone('why', { top: L.phoneTop, w: L.phoneW }) +
          spark(10, (L.phoneTop / L.H) * 100 + 6, u * 5, '#7DE3B8') + spark(89, (L.phoneTop / L.H) * 100 + 24, u * 5.5, '#7028E8')
        );
      },
    },
    {
      id: '6-bezpeci',
      dark: true,
      html: (L) => {
        const u = L.W / 100;
        const ph = phoneH(L.phoneW);
        return (
          head(L.headTop, 'Kontakt jen<br>pro <em>potvrzené</em>', 'Telefon ani přesné místo nikdo jiný neuvidí.') +
          phone('mine', { top: L.phoneTop, w: L.phoneW }) +
          card(u * 4, L.phoneTop + ph * 0.42, u * 60, `${svgIc('lock')}<div><b>Kontakt až po potvrzení</b><span>Vidí ho jen ten, koho vybereš</span></div>`, -3) +
          card(u * 36, L.phoneTop + ph * 0.6, u * 60, `${svgIc('pin')}<div><b>Jen přibližná poloha</b><span>Zhruba na 500 metrů</span></div>`, 2)
        );
      },
    },
  ];

  const FEATURE = {
    id: 'feature-graphic',
    dark: true,
    html: () => {
      const L = { W: 1024 };
      const u = L.W / 100;
      return (
        `<div style="position:absolute;left:${u * 7}px;top:${u * 10}px;width:${u * 52}px">` +
        `<div style="display:flex;align-items:center;gap:${u * 2.4}px"><img src="/img/icon-512.png" alt="" style="width:${u * 9}px;height:${u * 9}px;border-radius:22%;box-shadow:0 8px 20px -8px rgba(0,0,0,.4)">` +
        `<img src="/img/logo.png" alt="" style="height:${u * 8}px;filter:brightness(0) invert(1)"></div>` +
        `<h2 style="text-align:left;font-size:${u * 5.8}px;margin-top:${u * 3}px">Věci zdarma<br>od sousedů</h2>` +
        `<p class="sub" style="text-align:left;margin-left:0;font-size:${u * 2.3}px">Pošli radost dál. Daruj, co nepotřebuješ, a najdi, co se ti hodí.</p></div>` +
        phone('detail', { x: 72, top: u * 9, w: u * 23, rot: 8, z: 1 }) +
        phone('home', { x: 86, top: u * 4, w: u * 23, rot: -6, z: 2 }) +
        spark(60, 12, u * 3.5, '#7DE3B8') + spark(56, 78, u * 2.6, '#ffffff')
      );
    },
  };


  // ---------- LinkedIn (1080×1350, 4:5) ----------
  const foot = (u, n, total) =>
    `<div class="brandfoot"><img class="i" src="/img/icon-512.png" alt=""><img class="l" src="/img/logo.png" alt=""></div>` +
    (n < total ? `<div class="swipe">Další →</div>` : `<div class="slideno">${n}/${total}</div>`);
  const LINKEDIN = [
    {
      id: 'li-1-parapet', left: true,
      html: (L) => {
        const u = L.W / 100;
        const items = [['teddy', 18, 0.05, 24], ['lamp', 50, 0.0, 30], ['books', 82, 0.08, 22], ['mugs', 30, 0.5, 20], ['plant', 70, 0.46, 26], ['jacket', 50, 0.82, 16], ['chair', 12, 0.86, 15], ['coffee', 88, 0.84, 15]];
        const top = L.H * 0.47, h = L.H * 0.33;
        return head(u * 11, 'Sousedi u nás dávají věci <em>na parapet.</em>', 'A čekají, až si je někdo vezme. Mám to rád – tak jsem tomu dal appku.') +
          items.map(([k, x, y, s]) => { const d = s * u; return `<div class="bub" style="width:${d}px;height:${d}px;left:${(x / 100) * L.W - d / 2}px;top:${top + y * h}px"><img src="${U(PH[k], 600)}" alt=""></div>`; }).join('') +
          spark(90, 40, u * 5, '#7DE3B8') + spark(6, 45, u * 4, '#7028E8') + foot(u, 1, 5);
      },
    },
    {
      id: 'li-2-kdo-potrebuje',
      html: (L) => {
        const u = L.W / 100;
        return head(u * 9, 'Ať to dostane, kdo to <em>potřebuje.</em>', 'Zájemci napíšou pár slov o sobě. Ty vybereš, komu věc dáš.') +
          phone('activity', { top: u * 51, w: u * 50 }) + `<div class="slideno" style="top:${u * 4.5}px;bottom:auto">2/5</div>`;
      },
    },
    {
      id: 'li-3-hotovo',
      html: (L) => {
        const u = L.W / 100;
        return head(u * 9, 'Vyfotit, přidat, <em>hotovo.</em>', 'Sousedé v okolí to hned uvidí. Žádné smlouvání ani posílání.') +
          phone('home', { top: u * 51, w: u * 50 }) +
          card(u * 4, u * 51 + phoneH(u * 50) * 0.5, u * 46, `${photoIc(PH.sofa)}<div><b>Pohovka trojsed</b><span>Zdarma · 1,2 km</span></div>`, -4) + `<div class="slideno" style="top:${u * 4.5}px;bottom:auto">3/5</div>`;
      },
    },
    {
      id: 'li-4-bezpeci',
      html: (L) => {
        const u = L.W / 100;
        const ph = phoneH(u * 50);
        return head(u * 9, 'Kontakt jen pro <em>potvrzené.</em>', 'Telefon ani přesné místo nikdo jiný neuvidí.') +
          phone('mine', { top: u * 51, w: u * 50 }) +
          card(u * 3, u * 51 + ph * 0.38, u * 56, `${svgIc('lock')}<div><b>Kontakt až po potvrzení</b><span>Vidí ho jen ten, koho vybereš</span></div>`, -3) +
          card(u * 41, u * 51 + ph * 0.56, u * 56, `${svgIc('pin')}<div><b>Jen přibližná poloha</b><span>Zhruba na 500 metrů</span></div>`, 2) + `<div class="slideno" style="top:${u * 4.5}px;bottom:auto">4/5</div>`;
      },
    },
    {
      id: 'li-5-givo', dark: true,
      html: (L) => {
        const u = L.W / 100;
        const ic = u * 24;
        return `<img class="icon-big" src="/img/icon-512.png" alt="" style="top:${u * 16}px;width:${ic}px;height:${ic}px">` +
          head(u * 46, 'Věci od sousedů <em>zdarma.</em>', 'givo – darování věcí, které by jinak skončily v popelnici. Brzy v App Store a na Google Play.') +
          `<div class="foot" style="bottom:${u * 14}px;color:#fff;font-size:${u * 4}px">getgivo.web.app</div>` +
          spark(14, 18, u * 5, '#7DE3B8') + spark(84, 30, u * 4, '#ffffff') +
          `<div class="slideno" style="color:rgba(255,255,255,.7)">5/5</div>`;
      },
    },
  ];

  const LAYOUT = {
    ios: { W: 1320, H: 2868, headTop: 230, phoneTop: 850, phoneW: 905 },
    play: { W: 1080, H: 1920, headTop: 120, phoneTop: 560, play: true, phoneW: 620 },
    feature: { W: 1024, H: 500 },
    linkedin: { W: 1080, H: 1350 },
  };

  const grid = document.getElementById('grid');
  let current = 'ios';
  function render(set) {
    current = set;
    grid.innerHTML = '';
    const L = LAYOUT[set];
    const list = set === 'feature' ? [FEATURE] : set === 'linkedin' ? LINKEDIN : SHOTS;
    const pw = Math.min(set === 'feature' ? 640 : set === 'linkedin' ? 380 : 330, window.innerWidth - 36);
    list.forEach((s) => {
      const scale = pw / L.W;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.innerHTML =
        `<div class="frame" style="width:${pw}px;height:${L.H * scale}px">` +
        `<div class="shot${s.dark ? ' dark' : ''}${s.left ? ' left' : ''}" style="--u:${L.W / 100}px;width:${L.W}px;height:${L.H}px;transform:scale(${scale})">${s.html(L)}</div></div>` +
        `<div class="meta"><span>${s.id} · ${L.W}×${L.H}</span><button class="dl">Stáhnout</button></div>`;
      cell.querySelector('.dl').onclick = () => download(cell.querySelector('.shot'), `givo-${set}-${s.id}.jpg`, L);
      grid.appendChild(cell);
    });
  }
  async function download(node, name, L) {
    const btn = node.closest('.cell').querySelector('.dl');
    const old = btn.textContent;
    btn.textContent = 'Generuju…';
    try {
      const url = await htmlToImage.toJpeg(node, { width: L.W, height: L.H, pixelRatio: 1, quality: 0.95, backgroundColor: '#ffffff', style: { transform: 'none' } });
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      btn.textContent = 'Staženo ✓';
    } catch (e) {
      console.error(e);
      btn.textContent = 'Chyba – zkus znovu';
    }
    setTimeout(() => (btn.textContent = old), 2500);
  }
  document.querySelectorAll('.tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
      render(b.dataset.set);
    })
  );
  // Vše najednou jako jeden ZIP (App Store + Google Play + feature graphic + ikona 512)
  const waitImgs = (el) => Promise.all([...el.querySelectorAll('img')].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = i.onerror = r; }))));
  const offscreen = document.createElement('div');
  offscreen.style.cssText = 'position:fixed;left:-20000px;top:0;pointer-events:none';
  document.body.appendChild(offscreen);
  document.getElementById('all').onclick = async () => {
    const btn = document.getElementById('all');
    const jobs = [
      ...SHOTS.map((s) => ['ios', s, 'App Store (1320x2868)']),
      ...SHOTS.map((s) => ['play', s, 'Google Play (1080x1920)']),
      ['feature', FEATURE, 'Google Play – feature graphic (1024x500)'],
      ...LINKEDIN.map((s) => ['linkedin', s, 'LinkedIn (1080x1350)']),
    ];
    const zip = new JSZip();
    btn.disabled = true;
    try {
      for (let k = 0; k < jobs.length; k++) {
        const [set, s, folder] = jobs[k];
        const L = LAYOUT[set];
        btn.textContent = `Generuju ${k + 1}/${jobs.length}…`;
        offscreen.innerHTML = `<div class="shot${s.dark ? ' dark' : ''}${s.left ? ' left' : ''}" style="--u:${L.W / 100}px;width:${L.W}px;height:${L.H}px">${s.html(L)}</div>`;
        const node = offscreen.firstChild;
        await waitImgs(node);
        const url = await htmlToImage.toJpeg(node, { width: L.W, height: L.H, pixelRatio: 1, quality: 0.95, backgroundColor: '#ffffff' });
        zip.folder(folder).file(`givo-${s.id}.jpg`, url.split(',')[1], { base64: true });
      }
      const icon = await fetch('/img/icon-512.png').then((r) => r.arrayBuffer());
      zip.folder('Google Play – ikona (512x512)').file('givo-ikona-512.png', icon);
      btn.textContent = 'Balím ZIP…';
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'givo-screenshoty.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      btn.textContent = 'Staženo ✓';
    } catch (e) {
      console.error(e);
      btn.textContent = 'Chyba – zkus znovu';
    }
    offscreen.innerHTML = '';
    btn.disabled = false;
    setTimeout(() => (btn.textContent = 'Stáhnout vše (ZIP)'), 4000);
  };
  window.__givoStore = { render, LAYOUT, SHOTS, FEATURE, LINKEDIN };
  render('ios');
})();
