/* Все значки нарисованы тут (SVG).
   Если положить assets/icons/ИМЯ.png — он автоматически заменит значок.
   Список имён — в assets/icons/README.md */
NR.Icons = (() => {
  const S = (inner, vb = '0 0 24 24') =>
    `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const reg = {
    menu: S('<path d="M4 6.5h16M4 12h16M4 17.5h16"/>'),
    search: S('<circle cx="10.5" cy="10.5" r="6.2"/><path d="m15.3 15.3 5 5"/>'),
    close: S('<path d="M6 6l12 12M18 6 6 18"/>'),
    back: S('<path d="M20 12H5m0 0 6-6m-6 6 6 6"/>'),
    edit: S('<path d="m14.5 5.5 4 4L8 20l-4.6.6L4 16 14.5 5.5z"/><path d="m12.5 7.5 4 4"/>'),
    save: S('<path d="m4.5 12.5 5 5 10-11"/>'),
    note: S('<path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M15 3.5v4h4M8.5 12h7M8.5 16h5"/>'),
    book: S('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16.5H6.7A1.7 1.7 0 0 0 5 21V4.5z"/><path d="M5 18.2A1.7 1.7 0 0 1 6.7 16.5H19"/><path d="M9 7.5h6"/>'),
    books: S('<path d="M4 19.5h16" /><path d="M6 19.5V6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v13.5" fill="#fbd7e4"/><path d="M10 19.5V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v15" fill="#f2d06b"/><path d="m14.5 19.5 3.6-14.4 2.4.6-3.5 13.8" fill="#bcd3f2"/>'),
    heart: S('<path d="M12 20.3S4 15 4 9.6C4 6.9 6 5 8.4 5c1.6 0 3 .9 3.6 2.2C12.6 5.9 14 5 15.6 5 18 5 20 6.9 20 9.6c0 5.4-8 10.7-8 10.7z"/>'),
    heartFill: S('<path d="M12 20.3S4 15 4 9.6C4 6.9 6 5 8.4 5c1.6 0 3 .9 3.6 2.2C12.6 5.9 14 5 15.6 5 18 5 20 6.9 20 9.6c0 5.4-8 10.7-8 10.7z" fill="#ee7fae"/>'),
    check: S('<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.3 2.6 2.6 5-5.4"/>'),
    plane: S('<path d="M21 4 3.5 11l5.5 2 2 5.5L21 4z"/><path d="M9 13 21 4"/><path d="M3.5 17.5c1 .5 2 .5 3 0M5 20.5c.8.4 1.6.4 2.4 0" stroke-dasharray="1.5 2.4"/>'),
    reading: S('<path d="M12 6.5C10 4.8 7 4.3 3.5 4.5v13c3.5-.2 6.5.3 8.5 2 2-1.7 5-2.2 8.5-2v-13C17 4.3 14 4.8 12 6.5z"/><path d="M12 6.5v13"/><path d="M16 4.7v5l1.6-1.2 1.6 1.2V4.9" fill="#f2d06b"/>'),
    plan: S('<path d="M4 15c2.5-2 5-2 7.5 0M12.5 9c2.5-2 5-2 7.5 0M6.5 5.5c1.6-1.3 3.2-1.3 4.8 0" stroke="#a87b12"/><path d="M15 17.5c1.6-1.3 3.2-1.3 4.8 0" stroke="#a87b12"/>'),
    drop: S('<path d="M4.5 8.5h15V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V8.5z" fill="#fbd7e4"/><path d="M3.5 5.5h17v3h-17z"/><path d="M12 12.2c.8-1.4 3-1 3 .7 0 1.3-3 3.1-3 3.1s-3-1.8-3-3.1c0-1.7 2.2-2.1 3-.7z" fill="#d94f8e" stroke="#d94f8e"/>'),
    collection: S('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2" fill="#f2d06b"/><rect x="4" y="13" width="7" height="7" rx="2" fill="#fbd7e4"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
    author: S('<path d="M12 3.5c3 3.5 5.5 6.8 5.5 10a5.5 5.5 0 0 1-11 0c0-3.2 2.5-6.5 5.5-10z"/><circle cx="12" cy="13.5" r="1.6"/><path d="M12 15v5.5"/>'),
    profile: S('<circle cx="12" cy="12" r="8.5" fill="#fbd7e4"/><circle cx="12" cy="9.8" r="2.8"/><path d="M6.5 18.5c1-3 3-4.3 5.5-4.3s4.5 1.3 5.5 4.3"/>'),
    upload: S('<path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4.5 15.5v3A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-3"/>'),
    coin: S('<circle cx="12" cy="12" r="8.5" fill="#f2d06b"/><circle cx="12" cy="12" r="5" stroke="#a87b12"/><path d="M12 9.5v5M9.8 11h4.4" stroke="#a87b12"/>'),
    settings: S('<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/><path d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.36.95a7 7 0 0 0-2.42-1.4L13.7 2.6h-3.4l-.38 2.54a7 7 0 0 0-2.42 1.4l-2.36-.95-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .48.05.94.14 1.4l-2 1.55 2 3.46 2.36-.95a7 7 0 0 0 2.42 1.4l.38 2.54h3.4l.38-2.54a7 7 0 0 0 2.42-1.4l2.36.95 2-3.46-2-1.55c.09-.46.14-.92.14-1.4z"/>'),
    gear: S('<circle cx="12" cy="12" r="3.2" fill="#f2d06b"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/>'),
    quotes: S('<path d="M9.5 7.5c-2.8.8-4.5 2.7-4.5 5.6V17h5v-5H7.2c.1-1.6 1-2.7 2.8-3.3l-.5-1.2zM19 7.5c-2.8.8-4.5 2.7-4.5 5.6V17h5v-5h-2.8c.1-1.6 1-2.7 2.8-3.3L19 7.5z" fill="currentColor" stroke="none"/>'),
    bookmark: S('<path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1z"/>'),
    bookmarkFill: S('<path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1z" fill="currentColor"/>'),
    toc: S('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none"/>'),
    chevD: S('<path d="m6 9.5 6 6 6-6"/>'),
    chevL: S('<path d="M14.5 6 8.5 12l6 6"/>'),
    chevR: S('<path d="m9.5 6 6 6-6 6"/>'),
    plus: S('<path d="M12 5v14M5 12h14"/>'),
    minus: S('<path d="M5 12h14"/>'),
    trash: S('<path d="M4.5 6.5h15M9.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6M6.5 6.5 7.4 20a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9l.9-13.5"/><path d="M10 10.5v6M14 10.5v6"/>'),
    copy: S('<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>'),
    target: S('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
    sort: S('<path d="M7 4.5v15m0 0-3-3m3 3 3-3M17 19.5v-15m0 0-3 3m3-3 3 3"/>'),
    grid: S('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
    list: S('<path d="M9 6h11M9 12h11M9 18h11M4 6h.5M4 12h.5M4 18h.5"/>'),
    sun: S('<circle cx="12" cy="12" r="4.2" fill="#f2d06b"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>'),
    moon: S('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="#fbd7e4"/>'),
    text: S('<path d="M5 6V4.5h14V6M12 4.5v15m-2.5 0h5"/>'),
    alignL: S('<path d="M4 6h16M4 10.5h10M4 15h16M4 19.5h10"/>'),
    alignC: S('<path d="M4 6h16M7 10.5h10M4 15h16M7 19.5h10"/>'),
    alignR: S('<path d="M4 6h16M10 10.5h10M4 15h16M10 19.5h10"/>'),
    alignJ: S('<path d="M4 6h16M4 10.5h16M4 15h16M4 19.5h16"/>'),
    reset: S('<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4.5h4.5"/>'),
    export: S('<path d="M12 4v11m0-11L7.5 8.5M12 4l4.5 4.5"/><path d="M4.5 15.5v3A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-3"/>'),
    import: S('<path d="M12 15V4m0 11-4.5-4.5M12 15l4.5-4.5"/><path d="M4.5 15.5v3A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-3"/>'),
    info: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none"/>'),
    calendar: S('<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
    globe: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5z"/>'),
    tag: S('<path d="m4 11.5 8.7 8.7a1.5 1.5 0 0 0 2.1 0l5.4-5.4a1.5 1.5 0 0 0 0-2.1L11.5 4H5.5A1.5 1.5 0 0 0 4 5.5v6z"/><circle cx="8.6" cy="8.6" r="1.4"/>'),
    layers: S('<path d="m12 3.5 9 4.5-9 4.5L3 8l9-4.5z"/><path d="m4 12.5 8 4 8-4M4 16.5l8 4 8-4"/>'),
    star: S('<path d="m12 3.5 2.5 5.4 5.9.7-4.4 4 1.2 5.9-5.2-3-5.2 3 1.2-5.9-4.4-4 5.9-.7L12 3.5z" fill="#f2d06b"/>'),
    eye: S('<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    flower: S('<circle cx="12" cy="12" r="2.4" fill="#f2d06b"/><path d="M12 9.6c-1.8-3.6 1.8-6.4 0-6.4s1.8 2.8 0 6.4zM14.4 12c3.6-1.8 6.4 1.8 6.4 0s-2.8 1.8-6.4 0zM12 14.4c1.8 3.6-1.8 6.4 0 6.4s-1.8-2.8 0-6.4zM9.6 12c-3.6 1.8-6.4-1.8-6.4 0s2.8-1.8 6.4 0z" fill="#ee7fae" stroke="#d94f8e" stroke-width="1.2"/>'),
    warn: S('<path d="M12 3.5 22 20H2L12 3.5z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/>'),
  };
  /* золотой узор шапки и уголок меню */
  const ornArm = `<path d="M14 27 C 40 12, 66 12, 88 24 C 104 33, 122 33, 138 25" stroke="url(#og)" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M40 19 C 46 8, 60 6, 64 13 C 66 18, 60 22, 55 19" stroke="url(#og)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M88 24 C 92 34, 104 38, 110 32 C 113 28, 109 24, 105 26" stroke="url(#og)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M120 30 C 128 38, 140 36, 142 29" stroke="url(#og)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="141" cy="24" r="2.6" fill="url(#og)"/><circle cx="66" cy="10" r="2" fill="url(#og)"/>`;
  reg.ornament = `<svg viewBox="0 0 320 54" aria-hidden="true">
    <defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6e27a"/><stop offset=".55" stop-color="#d9a72e"/><stop offset="1" stop-color="#a87b12"/>
    </linearGradient></defs>
    <g transform="translate(160,0)">${ornArm}</g>
    <g transform="translate(160,0) scale(-1,1)">${ornArm}</g>
    <path d="M160 6 L166 20 L160 34 L154 20 Z" fill="url(#og)" stroke="#a87b12" stroke-width="1"/>
    <path d="M160 34 C 156 40, 156 46, 160 50 C 164 46, 164 40, 160 34Z" fill="url(#og)"/>
    <path d="M160 6 C 157 3, 157 1, 160 0 C 163 1, 163 3, 160 6Z" fill="url(#og)"/>
    <circle cx="160" cy="20" r="2.4" fill="#fff4f7"/>
    <path d="M147 22 C 151 26, 151 30, 147 33 M173 22 C 169 26, 169 30, 173 33" stroke="url(#og)" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
  reg.corner = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <path d="M6 40 C 6 18, 18 6, 40 6"/><path d="M10 52 C 10 26, 26 10, 52 10" opacity=".6"/>
    <path d="M40 6 C 48 6, 52 12, 48 17 C 45 20, 40 18, 41 14"/><path d="M6 40 C 6 48, 12 52, 17 48 C 20 45, 18 40, 14 41"/>
    <circle cx="55" cy="13" r="2" fill="currentColor"/><circle cx="13" cy="55" r="2" fill="currentColor"/>
    <path d="M24 24 c 6-2 10 2 8 8" opacity=".7"/></svg>`;

  const overrides = {}; // имя -> true, если найден png
  const html = (name, cls = '') => {
    const inner = overrides[name]
      ? `<img src="assets/icons/${name}.png" alt="">`
      : (reg[name] || reg.info);
    return `<span class="ic ${cls}" data-ic="${name}">${inner}</span>`;
  };
  /* при старте проверяем, есть ли твои картинки */
  function probe() {
    Object.keys(reg).forEach(name => {
      const img = new Image();
      img.onload = () => {
        overrides[name] = true;
        NR.U.qsa(`[data-ic="${name}"]`).forEach(el => { el.innerHTML = `<img src="assets/icons/${name}.png" alt="">`; });
      };
      img.src = (name === 'ornament' || name === 'corner' ? 'assets/img/' : 'assets/icons/') + name + '.png';
    });
  }
  const ornament = () => `<span class="orn-wrap" data-ic="ornament">${overrides.ornament ? '<img src="assets/img/ornament.png" alt="">' : reg.ornament}</span>`;
  const corner = cls => `<span class="dw-corner ${cls}" data-ic="corner">${overrides.corner ? '<img src="assets/img/corner.png" alt="">' : reg.corner}</span>`;
  return { html, probe, ornament, corner, names: Object.keys(reg) };
})();
