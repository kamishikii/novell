/* тосты, модалки, выбор полки, редактор жанров, розовые выпадающие списки */
NR.UI = (() => {
  const { qs, esc, bus } = NR.U;
  const I = NR.Icons.html;
  let modalStack = [];

  function toast(msg, opt = {}) {
    const root = qs('#toast-root');
    [...root.children].slice(0, Math.max(0, root.children.length - 1)).forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = (opt.icon ? I(opt.icon) : '') + `<span>${esc(msg)}</span>` + (opt.action ? `<button>${esc(opt.action)}</button>` : '');
    if (opt.action) t.querySelector('button').onclick = () => { kill(); opt.onAction && opt.onAction(); };
    root.appendChild(t);
    const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 260); };
    setTimeout(kill, opt.dur || (opt.action ? 6000 : 2800));
    return kill;
  }

  function modal({ title, icon, dark, light, body, actions = [], onClose }) {
    const root = qs('#modal-root');
    const scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    const m = document.createElement('div');
    m.className = 'modal';
    const head = document.createElement('div');
    head.className = 'md-head' + (dark ? ' dark' : '');
    head.innerHTML = `<div class="md-title">${icon ? I(icon, 's20') : ''}<span>${esc(title || '')}</span></div>`;
    const bodyEl = document.createElement('div');
    bodyEl.className = 'md-body' + (light ? ' light' : '');
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    const close = () => {
      scrim.remove();
      modalStack = modalStack.filter(x => x !== close);
      onClose && onClose();
    };
    actions.forEach(a => {
      const b = document.createElement('button');
      b.className = 'md-act ' + (a.cls || '');
      b.innerHTML = (a.icon ? I(a.icon, 's16') : '') + `<span>${esc(a.label)}</span>`;
      b.onclick = () => a.onClick ? a.onClick(close, bodyEl) : close();
      head.appendChild(b);
    });
    if (!actions.length) {
      const x = document.createElement('button');
      x.className = 'md-act'; x.innerHTML = I('close', 's16'); x.onclick = close;
      head.appendChild(x);
    }
    m.appendChild(head); m.appendChild(bodyEl); scrim.appendChild(m);
    scrim.addEventListener('pointerdown', e => { if (e.target === scrim) close(); });
    root.appendChild(scrim);
    modalStack.push(close);
    return { close, body: bodyEl, el: m };
  }
  const closeTopModal = () => { if (modalStack.length) { modalStack[modalStack.length - 1](); return true; } return false; };

  function confirm(text, opt = {}) {
    return new Promise(res => {
      let done = false;
      modal({
        title: opt.title || 'Точно?', icon: opt.danger ? 'warn' : 'info',
        body: `<p style="line-height:1.6">${esc(text)}</p>
          <div class="md-row"><button class="btn ghost small" data-x="no">Отмена</button>
          <button class="btn ${opt.danger ? 'danger' : 'pink'} small" data-x="yes">${esc(opt.yes || 'Да')}</button></div>`,
        onClose: () => { if (!done) res(false); }
      }).body.querySelectorAll('[data-x]').forEach(b => b.onclick = function () {
        done = true; res(this.dataset.x === 'yes');
        modalStack[modalStack.length - 1]();
      });
    });
  }

  function prompt({ title, label, value = '', placeholder = '' }) {
    return new Promise(res => {
      let done = false;
      const md = modal({
        title, icon: 'edit',
        body: `<div class="field"><label>${esc(label || '')}</label>
          <input class="inp" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>
          <div class="md-row"><button class="btn ghost small" data-x="no">Отмена</button>
          <button class="btn pink small" data-x="ok">Сохранить</button></div>`,
        onClose: () => { if (!done) res(null); }
      });
      const inp = md.body.querySelector('input');
      setTimeout(() => inp.focus(), 60);
      const ok = () => { done = true; res(inp.value.trim()); modalStack[modalStack.length - 1](); };
      md.body.querySelector('[data-x="ok"]').onclick = ok;
      md.body.querySelector('[data-x="no"]').onclick = () => { done = true; res(null); modalStack[modalStack.length - 1](); };
      inp.onkeydown = e => { if (e.key === 'Enter') ok(); };
    });
  }

  const SHELVES = [
    { key: null, label: 'Без полки', icon: 'book' },
    { key: 'favorite', label: 'Избранное', icon: 'heartFill' },
    { key: 'reading', label: 'Читаю', icon: 'reading' },
    { key: 'planned', label: 'В планах', icon: 'plan' },
    { key: 'completed', label: 'Прочитано', icon: 'plane' },
    { key: 'dropped', label: 'Брошено', icon: 'drop' },
  ];
  const shelfInfo = key => SHELVES.find(s => s.key === key) || SHELVES[0];
  function shelfPicker(novel, onPick) {
    const cur = NR.Store.shelf(novel.id);
    const wrap = document.createElement('div');
    wrap.className = 'md-list';
    const md = modal({ title: 'Куда положить?', icon: 'bookmark', body: wrap });
    SHELVES.forEach(s => {
      const b = document.createElement('button');
      b.className = 'md-opt' + (cur === s.key ? ' on' : '');
      b.innerHTML = I(s.icon, 's20') + `<span>${esc(s.label)}</span><span class="tick">${I('save', 's16')}</span>`;
      b.onclick = () => { NR.Store.setShelf(novel.id, s.key); md.close(); onPick && onPick(s); };
      wrap.appendChild(b);
    });
  }

  /* все <select> открываются нашей розовой модалкой, а не системным списком */
  function initThemedSelects() {
    const openFor = sel => {
      if (sel.disabled) return;
      const wrap = document.createElement('div');
      wrap.className = 'md-list';
      const label =
        (sel.closest('.field') && sel.closest('.field').querySelector('label')) ||
        (sel.closest('.set-row') && sel.closest('.set-row').querySelector('.lb'));
      const md = modal({ title: label ? label.textContent.trim() : 'Выбери вариант', icon: 'chevD', body: wrap });
      [...sel.options].forEach(o => {
        const b = document.createElement('button');
        b.className = 'md-opt' + (o.value === sel.value ? ' on' : '');
        b.innerHTML = `<span>${esc(o.textContent)}</span><span class="tick">${I('save', 's16')}</span>`;
        b.onclick = () => {
          sel.value = o.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          md.close();
        };
        wrap.appendChild(b);
      });
    };
    document.addEventListener('click', e => {
      const sel = e.target.closest && e.target.closest('select');
      if (!sel) return;
      e.preventDefault(); e.stopPropagation();
      openFor(sel);
    }, true);
    document.addEventListener('mousedown', e => {
      if (e.target.closest && e.target.closest('select')) e.preventDefault();
    }, true);
    document.addEventListener('keydown', e => {
      const sel = e.target.closest && e.target.closest('select');
      if (sel && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); openFor(sel); }
    }, true);
  }

  /* редактор жанров: чипы + подсказки вместо системного списка */
  function genreEditor(initial = []) {
    let list = [...initial];
    const el = document.createElement('div');
    const chips = document.createElement('div'); chips.className = 'genre-ed';
    const addRow = document.createElement('div'); addRow.className = 'genre-add';
    addRow.innerHTML = `<input class="inp" placeholder="Новый жанр…" maxlength="24">
      <button class="btn small gold" type="button">${I('plus', 's16')}</button>`;
    const sugg = document.createElement('div');
    sugg.className = 'genre-ed'; sugg.style.marginTop = '8px';
    const inp = addRow.querySelector('input');
    const draw = () => {
      chips.innerHTML = list.length ? '' : '<span style="font-size:13px;color:var(--muted)">Пока пусто</span>';
      list.forEach(g => {
        const c = document.createElement('span'); c.className = 'chip on';
        c.innerHTML = esc(g) + `<span class="x">${I('close', 's16')}</span>`;
        c.querySelector('.x').onclick = () => { list = list.filter(x => x !== g); draw(); };
        chips.appendChild(c);
      });
      sugg.innerHTML = '';
      NR.Data.genres().filter(g => !list.includes(g)).slice(0, 12).forEach(g => {
        const c = document.createElement('button');
        c.type = 'button'; c.className = 'chip';
        c.innerHTML = I('plus', 's16') + esc(g);
        c.onclick = () => { list.push(g); draw(); };
        sugg.appendChild(c);
      });
    };
    const add = () => {
      const v = inp.value.trim();
      if (v && !list.includes(v)) { list.push(v); draw(); }
      inp.value = ''; inp.focus();
    };
    addRow.querySelector('button').onclick = add;
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
    el.appendChild(chips); el.appendChild(addRow); el.appendChild(sugg);
    draw();
    return { el, get: () => [...list] };
  }

  const emptyState = (title, sub) => `
    <div class="empty">
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M25 88h70M32 88V50a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v38" fill="var(--surface2)"/>
        <path d="M48 88V42a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v46" fill="var(--header2)"/>
        <path d="m66 88 12-42 10 3-11 39" fill="var(--surface2)"/>
        <path d="M60 24c3-6 12-4 12 2 0 5-12 12-12 12s-12-7-12-12c0-6 9-8 12-2z" fill="var(--rose)" stroke="var(--rose-deep)"/>
        <path d="M92 30l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="var(--gold2)" stroke="var(--gold-deep)" stroke-width="1.5"/>
      </svg>
      <h3>${esc(title)}</h3><p>${esc(sub)}</p>
    </div>`;

  return { toast, modal, confirm, prompt, closeTopModal, shelfPicker, shelfInfo, SHELVES, genreEditor, emptyState, initThemedSelects };
})();
