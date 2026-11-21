/* читалка: страницы, жесты, панель, настройки, поиск, оглавление, закладки, цитаты */
NR.Pages.reader = (() => {
  const { qs, qsa, esc, clamp, debounce } = NR.U;
  const I = NR.Icons.html;
  let R = null; // текущее состояние читалки

  const FONTS = [['serif', 'Georgia'], ['sans', 'Системный'], ['palatino', 'Palatino'], ['mono', 'Моно'], ['custom', 'Свой ✦']];
  const RTHEMES = [['light', 'Свет', '#fbf7ef'], ['pink', 'Роза', '#fbe4ec'], ['sepia', 'Сепия', '#f3e7d3'], ['dark', 'Сумерки', '#2e2430'], ['night', 'Ночь', '#17121b']];

  function render(el, params) {
    const n = NR.Data.get(params.id);
    if (!n) { NR.Router.go('#/'); return; }
    const s = { ...NR.Store.reader() };
    el.innerHTML = `
      <div class="reader-root" id="rr">
        <div class="reader-viewport" id="rv">
          <div class="r-page" id="rpage"><div class="r-strip" id="rstrip"></div></div>
          <div class="r-bright" id="rbright"></div>
        </div>
        <button class="r-corner" id="rcorner" aria-label="Закладка"></button>
        <div class="r-top" id="rtop">
          <div class="orn-strip">${NR.Icons.ornament()}</div>
          <div class="r-bar">
            <button class="icon-btn" id="r-back" aria-label="К новелле">${I('back')}</button>
            <div class="titles"><b>${esc(n.title)}</b><span id="r-ch">…</span></div>
            <button class="icon-btn" id="r-fav" aria-label="В избранное">${I(n.shelf === 'favorite' ? 'heartFill' : 'heart')}</button>
          </div>
        </div>
        <div class="r-bottom" id="rbot">
          <div class="r-progress">
            <div class="r-meta"><span class="ch" id="r-ch2"></span><span class="count" id="r-count">1 / 1</span><span class="pct" id="r-pct">0%</span></div>
            <input type="range" class="r-wave" id="r-wave" min="1" max="1" value="1" aria-label="Страница">
          </div>
          <div class="r-icons">
            <button class="r-ibtn" id="ri-quotes">${I('quotes')}<span>Цитаты</span><span class="badge" hidden></span></button>
            <button class="r-ibtn" id="ri-bm">${I('bookmark')}<span>Закладки</span><span class="badge" hidden></span></button>
            <button class="r-ibtn" id="ri-toc">${I('toc')}<span>Главы</span></button>
            <button class="r-ibtn" id="ri-search">${I('search')}<span>Поиск</span></button>
            <button class="r-ibtn" id="ri-set">${I('gear')}<span>Настройки</span></button>
          </div>
        </div>
        <div class="r-scrim" id="rscrim" hidden></div>
        <div class="r-sheet" id="rsheet"></div>
        <div class="r-loading" id="rload"><div class="dots"><i></i><i></i><i></i></div><span>Раскладываем страницы…</span></div>
      </div>`;

    const root = qs('#rr', el), vp = qs('#rv', el), strip = qs('#rstrip', el);
    const engine = new NR.ReaderEngine(vp, qs('#rpage', el), strip);
    R = { n, engine, root, vp, strip, s, sheetType: null, searchOpen: false, lastSel: null,
      activeQuery: '', disposers: [], destroyed: false };
    const rr = R;
    engine.applySettings(s);
    applyBright();

    /* ── загрузка текста ── */
    NR.Data.getText(n.id).then(text => {
      if (rr.destroyed) return;
      if (!text || !text.trim()) { showMissing(); return; }
      engine.setText(text);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (rr.destroyed) return;
        const prog = NR.Store.progress(n.id);
        engine.layout(prog ? prog.off : 0);
        qs('#rload', el).remove();
        updateUI();
        if (!NR.Store.flag('cornerHint')) {
          const c = qs('#rcorner', el); c.classList.add('hint');
          setTimeout(() => { c.classList.remove('hint'); NR.Store.flag('cornerHint', true); }, 4000);
          NR.UI.toast('Коснись правого верхнего уголка текста — это закладка ✦', { icon: 'bookmark', dur: 4200 });
        }
      }));
    });

    function showMissing() {
      qs('#rload', el) && qs('#rload', el).remove();
      const d = document.createElement('div');
      d.className = 'r-missing';
      d.innerHTML = `<div class="box">${I('warn')}<h3>Текст не найден</h3>
        <p>Положи файл по пути <b>${esc(n.file || 'novels/' + n.id + '.txt')}</b> или выбери файл с телефона:</p>
        <button class="btn pink" id="rm-pick">${I('upload', 's20')} Выбрать файл</button>
        <button class="btn ghost" id="rm-back">К новелле</button></div>`;
      root.appendChild(d);
      qs('#rm-back', d).onclick = () => NR.Router.go('#/novel/' + n.id);
      qs('#rm-pick', d).onclick = async () => {
        const f = await NR.U.pickFile('.txt,.fb2,text/plain');
        if (!f) return;
        const text = await NR.U.readFileSmart(f);
        await NR.Data.attachText(n.id, text);
        NR.Router.go('#/read/' + n.id + '?t=' + Date.now());
      };
    }

    /* ── сохранение прогресса ── */
    const saveProg = () => {
      if (!engine.paras.length) return;
      const off = engine.offsetOfPage(engine.current);
      NR.Store.setProgress(n.id, { off, page: engine.current, pages: engine.pages, ch: engine.chapterOf(off), ts: Date.now() });
    };
    const saveSoon = debounce(saveProg, 400);
    engine.onPage = () => { updateUI(); saveSoon(); paintHighlights(); };

    /* ── интерфейс ── */
    function updateUI() {
      const pg = engine.current, total = engine.pages;
      const off = engine.offsetOfPage(pg);
      const chIdx = engine.chapterOf(off);
      const ch = engine.chapters[chIdx];
      qs('#r-count', el).textContent = `${pg + 1} / ${total}`;
      qs('#r-pct', el).textContent = Math.round((pg + 1) / total * 100) + '%';
      const chLabel = ch ? ch.title : '';
      qs('#r-ch', el).textContent = chLabel;
      qs('#r-ch2', el).textContent = chLabel;
      const wave = qs('#r-wave', el);
      wave.max = total; wave.value = pg + 1;
      drawRibbon();
      badge('#ri-bm', NR.Store.bookmarks(n.id).length);
      badge('#ri-quotes', NR.Store.quotes(n.id).length);
    }
    function badge(sel, cnt) {
      const b = qs(sel + ' .badge', el);
      if (!b) return;
      b.hidden = !cnt; b.textContent = cnt;
    }
    function drawRibbon() {
      const c = qs('#rcorner', el);
      const off = engine.offsetOfPage(engine.current);
      const marked = NR.Store.bookmarks(n.id).some(b => engine.pageOfOffset(b.off) === engine.current);
      c.innerHTML = marked
        ? `<span class="r-ribbon"><svg viewBox="0 0 30 52"><path d="M3 2h24v46l-12-9-12 9V2z" fill="currentColor" stroke="#33202c" stroke-width="2"/><path d="M15 12l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.6-4.5 2.6 1-5-3.7-3.4 5-.6z" fill="#fff" opacity=".85"/></svg></span>`
        : '';
      void off;
    }
    function applyBright() { qs('#rbright', el).style.opacity = (100 - rr.s.bright) / 100 * 0.82; }

    /* волна-слайдер */
    const wave = qs('#r-wave', el);
    wave.oninput = () => { engine.goPage(parseInt(wave.value) - 1, false); };

    /* ── жесты: свайп, тап ── */
    let px = 0, py = 0, pt = 0, dragging = false, moved = false;
    const onDown = e => {
      if (rr.sheetType || rr.searchOpen) return;
      px = e.clientX; py = e.clientY; pt = Date.now(); dragging = false; moved = false;
    };
    const onMove = e => {
      if (!pt) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
      if (engine.mode !== 'scroll' && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        dragging = true; engine.dragTo(dx);
      }
    };
    const onUp = e => {
      if (!pt) return;
      const dx = e.clientX - px, dy = e.clientY - py, dt = Date.now() - pt;
      pt = 0;
      if (dragging) { dragging = false; engine.endDrag(dx, dt); return; }
      const sel = window.getSelection();
      if (!moved && dt < 400 && (!sel || sel.isCollapsed)) toggleChrome();
    };
    vp.addEventListener('pointerdown', onDown);
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onUp);
    vp.addEventListener('pointercancel', () => { if (dragging) engine.goPage(engine.current, true); pt = 0; dragging = false; });
    vp.addEventListener('scroll', () => engine.syncScroll(), { passive: true });
    let wheelLock = 0;
    const onWheel = e => {
      if (engine.mode === 'scroll' || rr.sheetType || rr.searchOpen) return;
      const now = Date.now();
      if (now - wheelLock < 320 || Math.abs(e.deltaY) < 18) return;
      wheelLock = now;
      engine.goPage(engine.current + (e.deltaY > 0 ? 1 : -1), true);
    };
    vp.addEventListener('wheel', onWheel, { passive: true });

    function toggleChrome() {
      root.classList.toggle('nochrome');
      hideSelTb();
    }

    /* закладка по уголку */
    qs('#rcorner', el).addEventListener('pointerdown', e => e.stopPropagation());
    qs('#rcorner', el).onclick = e => {
      e.stopPropagation();
      toggleBookmark();
    };
    function toggleBookmark() {
      const pg = engine.current;
      const list = NR.Store.bookmarks(n.id);
      const exist = list.find(b => engine.pageOfOffset(b.off) === pg);
      if (exist) {
        NR.Store.removeBookmark(n.id, exist.ts);
        NR.UI.toast('Закладка убрана', { icon: 'bookmark' });
      } else {
        const off = engine.offsetOfPage(pg);
        const snippet = engine.text.slice(off, off + 70).replace(/^\S*\s/, '').trim();
        NR.Store.addBookmark(n.id, { off, page: pg, snippet, ch: engine.chapterOf(off), ts: Date.now() });
        NR.UI.toast(`Закладка ★ страница ${pg + 1}`, { icon: 'bookmarkFill' });
      }
      drawRibbon(); updateUI();
      if (rr.sheetType === 'bm') openSheet('bm');
    }

    /* ── шторки ── */
    const scrim = qs('#rscrim', el), sheet = qs('#rsheet', el);
    scrim.onclick = () => closeSheet();
    function closeSheet() {
      rr.sheetType = null;
      sheet.classList.remove('show'); scrim.classList.remove('show');
      setTimeout(() => { if (!rr.sheetType) { scrim.hidden = true; sheet.innerHTML = ''; } }, 300);
    }
    function openSheet(type) {
      rr.sheetType = type;
      scrim.hidden = false;
      requestAnimationFrame(() => { scrim.classList.add('show'); sheet.classList.add('show'); });
      const head = (icon, title, cnt, extra = '') =>
        `<div class="rs-head">${I(icon)}<b>${title}</b>${cnt != null ? `<span class="cnt">${cnt}</span>` : ''}${extra}
         <button class="icon-btn" data-close>${I('close')}</button></div>`;
      if (type === 'toc') {
        sheet.innerHTML = head('toc', 'Оглавление', engine.chapters.length) + '<div class="rs-body" id="rs-b"></div>';
        const body = qs('#rs-b', sheet);
        const curOff = engine.offsetOfPage(engine.current);
        const curCh = engine.chapterOf(curOff);
        engine.chapters.forEach((c, i) => {
          const b = document.createElement('button');
          b.className = 'toc-item' + (i === curCh ? ' cur' : '');
          b.innerHTML = `<span class="n">${esc(c.title)}</span><span class="p">стр. ${engine.pageOfOffset(c.off) + 1}</span>`;
          b.onclick = () => { closeSheet(); engine.goPage(engine.pageOfOffset(c.off), true); };
          body.appendChild(b);
        });
        setTimeout(() => { const cur = body.querySelector('.cur'); cur && cur.scrollIntoView({ block: 'center' }); }, 320);
      }
      if (type === 'bm') {
        const list = NR.Store.bookmarks(n.id);
        sheet.innerHTML = head('bookmark', 'Закладки', list.length,
          `<button class="btn small gold" data-add>${I('plus', 's16')} эту стр.</button>`) + '<div class="rs-body" id="rs-b"></div>';
        qs('[data-add]', sheet).onclick = () => { toggleBookmark(); };
        const body = qs('#rs-b', sheet);
        if (!list.length) body.innerHTML = `<div class="rs-empty">${I('bookmark')}<br>Пока пусто.<br>Коснись правого верхнего уголка текста, чтобы добавить закладку ✦</div>`;
        [...list].sort((a, b) => a.off - b.off).forEach(b => {
          const pg = engine.pageOfOffset(b.off);
          const d = document.createElement('div');
          d.className = 'bm-item';
          d.innerHTML = `<button class="t"><b>Страница ${pg + 1} · ${esc(engine.chapters[b.ch]?.title || '')}</b>
            <span>…${esc(b.snippet || '')}</span></button>
            <button class="q-act" data-go>${I('target', 's20')}</button>
            <button class="q-act del" data-del>${I('trash', 's20')}</button>`;
          const go = () => { closeSheet(); engine.goPage(pg, true); };
          d.querySelector('.t').onclick = go;
          d.querySelector('[data-go]').onclick = go;
          d.querySelector('[data-del]').onclick = () => { NR.Store.removeBookmark(n.id, b.ts); drawRibbon(); updateUI(); openSheet('bm'); };
          body.appendChild(d);
        });
      }
      if (type === 'quotes') {
        const list = NR.Store.quotes(n.id);
        const addBtn = rr.lastSel ? `<button class="btn small gold" data-add>${I('plus', 's16')} выделенное</button>` : '';
        sheet.innerHTML = head('quotes', 'Цитаты', list.length, addBtn) + '<div class="rs-body" id="rs-b"></div>';
        const ab = qs('[data-add]', sheet);
        if (ab) ab.onclick = () => { addQuote(rr.lastSel); rr.lastSel = null; openSheet('quotes'); };
        const body = qs('#rs-b', sheet);
        if (!list.length) body.innerHTML = `<div class="rs-empty">${I('quotes')}<br>Пока пусто.<br>Выдели кусочек текста в книге — и нажми «❝ Цитата»</div>`;
        list.forEach(q => {
          const d = document.createElement('div');
          d.className = 'q-item';
          d.innerHTML = `<div class="quote-text">${esc(q.text)}</div>
            <div class="q-meta"><span>стр. ${engine.pageOfOffset(q.off) + 1} · ${NR.U.fmtDate(q.ts)}</span><span class="sp"></span>
            <button class="q-act" data-go>${I('target', 's20')}</button>
            <button class="q-act" data-copy>${I('copy', 's20')}</button>
            <button class="q-act del" data-del>${I('trash', 's20')}</button></div>`;
          d.querySelector('.quote-text').onclick = () => d.classList.toggle('open');
          d.querySelector('[data-go]').onclick = () => { closeSheet(); engine.goPage(engine.pageOfOffset(q.off), true); };
          d.querySelector('[data-copy]').onclick = async () => { await NR.U.copyText(q.text); NR.UI.toast('Скопировано ✓', { icon: 'copy' }); };
          d.querySelector('[data-del]').onclick = () => { NR.Store.removeQuote(n.id, q.ts); updateUI(); openSheet('quotes'); };
          body.appendChild(d);
        });
      }
      if (type === 'set') buildSettings(sheet, head);
      qs('[data-close]', sheet).onclick = closeSheet;
    }

    /* ── настройки чтения ── */
    function buildSettings(sheet, head) {
      sheet.innerHTML = head('gear', 'Настройки чтения', null) + '<div class="rs-body" id="rs-b"></div>';
      const b = qs('#rs-b', sheet);
      const row = (label, ctlHTML) => {
        const d = document.createElement('div');
        d.className = 'set-row';
        d.innerHTML = `<span class="lb">${label}</span><div class="ctl">${ctlHTML}</div>`;
        b.appendChild(d); return d;
      };
      const apply = (patch, relayout = true) => {
        Object.assign(rr.s, patch);
        NR.Store.rset(patch);
        engine.applySettings(rr.s);
        if (relayout) {
          const off = engine.offsetOfPage(engine.current);
          engine.layout(off);
        }
        applyBright(); updateUI();
      };
      const r1 = row('Размер', `<input type="range" min="14" max="30" step="1" value="${rr.s.size}"><span class="val">${rr.s.size}px</span>`);
      r1.querySelector('input').oninput = function () { r1.querySelector('.val').textContent = this.value + 'px'; apply({ size: +this.value }); };
      const r2 = row('Шрифт', `<select class="inp">${FONTS.map(f => `<option value="${f[0]}" ${rr.s.font === f[0] ? 'selected' : ''}>${f[1]}</option>`).join('')}</select>`);
      r2.querySelector('select').onchange = function () { apply({ font: this.value }); };
      const r3 = row('Жирность', `<select class="inp">${[300, 400, 500, 600, 700].map(w => `<option ${rr.s.weight === w ? 'selected' : ''}>${w}</option>`).join('')}</select>`);
      r3.querySelector('select').onchange = function () { apply({ weight: +this.value }); };
      const r4 = row('Интервал', `<input type="range" min="1.2" max="2.1" step="0.05" value="${rr.s.lh}"><span class="val">${rr.s.lh}</span>`);
      r4.querySelector('input').oninput = function () { r4.querySelector('.val').textContent = (+this.value).toFixed(2); apply({ lh: +this.value }); };
      const r5 = row('Выравнивание', `<div class="seg align-seg">${[['left', 'alignL'], ['center', 'alignC'], ['right', 'alignR'], ['justify', 'alignJ']].map(a =>
        `<button data-a="${a[0]}" class="${rr.s.align === a[0] ? 'on' : ''}">${I(a[1], 's20')}</button>`).join('')}</div>`);
      qsa('[data-a]', r5).forEach(btn => btn.onclick = () => { qsa('[data-a]', r5).forEach(x => x.classList.remove('on')); btn.classList.add('on'); apply({ align: btn.dataset.a }); });
      const r6 = row('Листание', `<div class="seg">${[['scroll', 'Свиток'], ['slide', 'Страницы'], ['book', 'Книга']].map(m =>
        `<button data-m="${m[0]}" class="${rr.s.mode === m[0] ? 'on' : ''}">${m[1]}</button>`).join('')}</div>`);
      qsa('[data-m]', r6).forEach(btn => btn.onclick = () => {
        qsa('[data-m]', r6).forEach(x => x.classList.remove('on')); btn.classList.add('on');
        const off = engine.offsetOfPage(engine.current);
        apply({ mode: btn.dataset.m }, false);
        engine.layout(off); updateUI();
      });
      const r7 = row('Тема', `<div class="swatches">${RTHEMES.map(t =>
        `<button class="swatch ${rr.s.rtheme === t[0] && !rr.s.bg ? 'on' : ''}" data-t="${t[0]}" title="${t[1]}" style="background:${t[2]}"></button>`).join('')}</div>`);
      qsa('[data-t]', r7).forEach(btn => btn.onclick = () => {
        qsa('[data-t]', r7).forEach(x => x.classList.remove('on')); btn.classList.add('on');
        apply({ rtheme: btn.dataset.t, bg: '', text: '' }, false);
        engine.applySettings(rr.s); updateUI();
      });
      const r8 = row('Свои цвета', `<label style="font-size:12px;font-weight:700;color:var(--muted)">текст</label>
        <input type="color" id="c-text" value="${rr.s.text || '#3a2f2a'}">
        <label style="font-size:12px;font-weight:700;color:var(--muted)">фон</label>
        <input type="color" id="c-bg" value="${rr.s.bg || '#fbf7ef'}">`);
      r8.querySelector('#c-text').oninput = function () { apply({ text: this.value }, false); engine.applySettings(rr.s); };
      r8.querySelector('#c-bg').oninput = function () { apply({ bg: this.value }, false); engine.applySettings(rr.s); };
      const r9 = row('Поля страниц', `<label class="switch"><input type="checkbox" ${rr.s.margins ? 'checked' : ''}><i></i></label>`);
      r9.querySelector('input').onchange = function () { apply({ margins: this.checked }); };
      const r10 = row('Яркость', `<input type="range" min="30" max="100" step="1" value="${rr.s.bright}"><span class="val">${rr.s.bright}%</span>`);
      r10.querySelector('input').oninput = function () { r10.querySelector('.val').textContent = this.value + '%'; apply({ bright: +this.value }, false); };
      const foot = document.createElement('div');
      foot.style.cssText = 'display:flex;gap:10px;margin-top:16px';
      foot.innerHTML = `<button class="btn danger" style="flex:1" data-reset>${I('reset', 's20')} По умолчанию</button>
        <button class="btn pink" style="flex:1" data-done>${I('save', 's20')} Готово</button>`;
      b.appendChild(foot);
      foot.querySelector('[data-reset]').onclick = () => {
        NR.Store.rreset();
        rr.s = { ...NR.Store.reader() };
        const off = engine.offsetOfPage(engine.current);
        engine.applySettings(rr.s); engine.layout(off); applyBright(); updateUI();
        buildSettings(sheet, head);
        qs('[data-close]', sheet).onclick = closeSheet;
        NR.UI.toast('Настройки сброшены ✦', { icon: 'reset' });
      };
      foot.querySelector('[data-done]').onclick = closeSheet;
    }

    /* ── выделение → ц
