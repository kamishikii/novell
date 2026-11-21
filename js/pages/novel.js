/* страница новеллы: инфа, полка, заметка, жанры, редактирование, кнопка «Читать» */
NR.Pages.novel = (() => {
  const { qs, esc } = NR.U;
  const I = NR.Icons.html;
  const TRANS = ['Продолжается', 'Завершён', 'Заморожен'];
  const REL = ['Онгоинг', 'Завершён', 'Анонс'];
  const dotColor = v => ({ 'Продолжается': 'var(--blue)', 'Онгоинг': 'var(--blue)', 'Завершён': 'var(--green)', 'Заморожен': 'var(--amber)', 'Анонс': 'var(--amber)' }[v] || 'var(--muted)');
  let editing = false, nid = null, offBus = null;

  function noteModal(n) {
    const existing = NR.Store.note(n.id);
    const body = document.createElement('div');
    const ta = document.createElement('textarea');
    ta.value = existing; ta.placeholder = 'Напиши тут что-нибудь о новелле…';
    ta.readOnly = !!existing;
    body.appendChild(ta);
    let dirty = false;
    ta.oninput = () => dirty = true;
    const md = NR.UI.modal({
      title: 'Заметка', icon: 'note', dark: true, light: true, body,
      actions: [
        { icon: 'edit', label: 'Править', cls: 'rose', onClick: () => { ta.readOnly = false; ta.focus(); } },
        { icon: 'save', label: 'Сохранить', cls: 'gold', onClick: close => { NR.Store.setNote(n.id, ta.value); NR.UI.toast('Заметка сохранена ✦', { icon: 'note' }); close(); } },
        { icon: 'close', label: 'Закрыть', onClick: close => close() },
      ],
      onClose: () => { if (dirty && ta.value.trim() !== existing) NR.Store.setNote(n.id, ta.value); NR.Router.go('#/novel/' + n.id); }
    });
    if (!existing) setTimeout(() => ta.focus(), 80);
  }

  async function pickBook() {
    const f = await NR.U.pickFile('*/*');
    if (!f) return null;
    try {
      const text = await NR.U.readFileSmart(f);
      if (!text.trim()) { NR.UI.toast('Файл пустой 😿', { icon: 'warn' }); return null; }
      return text;
    } catch (e) { NR.UI.toast(e.message || 'Не тот формат 😿', { icon: 'warn', dur: 4500 }); return null; }
  }

  function view(el, n) {
    document.body.classList.remove('editing');
    const prog = n.progress;
    const shelf = NR.UI.shelfInfo(n.shelf);
    const line = (k, v, big) => `<div class="nv-line"><span class="k">${k}</span><span class="v ${big ? 'big' : ''}">${v || '<span style="color:var(--muted)">—</span>'}</span></div>`;
    el.innerHTML = `
      <header class="app-header">
        <div class="hd-orn">${NR.Icons.ornament()}<span class="hd-spark a">✦</span></div>
        <div class="hd-row">
          <button class="icon-btn" id="nv-back" aria-label="На главную">${I('back', 's28')}</button>
          <div class="hd-title">${esc(n.title)}</div>
          <button class="icon-btn red" id="nv-edit" aria-label="Редактировать">${I('edit', 's28')}</button>
        </div>
      </header>
      <div class="novel-wrap page-in">
        <div class="nv-top">
          <div class="nv-cover">${NR.Pages.catalog.coverHTML(n)}</div>
          <div class="nv-info">
            ${line('Название', esc(n.title), true)}
            ${line('Год выхода', esc(n.year))}
            ${line('Страна выхода', esc(n.country))}
            ${line('Глав', n.chapters ? esc(n.chapters) : '')}
            ${line('Автор', esc(n.author))}
          </div>
        </div>
        <div class="nv-side">
          <div class="nv-line"><span class="k">Статус перевода</span>
            <span class="v"><i class="nv-dot" style="background:${dotColor(n.translation)}"></i>${esc(n.translation || '—')}</span></div>
          <div class="nv-line"><span class="k">Статус выпуска</span>
            <span class="v"><i class="nv-dot" style="background:${dotColor(n.release)}"></i>${esc(n.release || '—')}</span></div>
          <button class="nv-pill pink" id="nv-shelf">${I(shelf.icon, 's20')}<span>${n.shelf ? esc(shelf.label) : 'В закладки'}</span>${I('chevD', 's20')}</button>
          <button class="nv-pill" id="nv-note">${I('note', 's20')}<span>Заметка</span>${NR.Store.note(n.id) ? '<span class="has-note"></span>' : ''}${I('chevR', 's20')}</button>
        </div>
        <div class="nv-genres">
          <div class="k">Жанры</div>
          <div class="chips" id="nv-chips">${(n.genres || []).length
            ? n.genres.map(g => `<button class="chip" data-g="${esc(g)}">${I('tag', 's16')}${esc(g)}</button>`).join('')
            : '<span style="font-size:13px;color:var(--muted)">Не указаны — добавь карандашиком ✎</span>'}</div>
        </div>
        <div class="nv-desc">
          <div class="k">Описание</div>
          <div class="desc-text ${n.description ? '' : 'empty-d'}">${esc(n.description || 'Описания пока нет… нажми красный карандаш сверху, чтобы добавить.')}</div>
        </div>
        ${!n.hasText ? `
        <div class="warn-card">${I('warn')}
          <div><b>Файл текста не найден</b>
            Положи файл сюда: <div class="mono">${esc(n.file || 'novels/' + n.id + '.txt')}</div>
            или выбери файл прямо с телефона (${esc(NR.Books.supported)}):
            <div style="margin-top:8px"><button class="btn small gold" id="nv-attach">${I('upload', 's16')} Выбрать файл</button></div>
          </div>
        </div>` : ''}
      </div>
      <button class="read-fab" id="nv-read">${I('reading', 's20')}
        <span>${prog ? 'Продолжить' : 'Читать'}</span>${prog ? `<small>гл. ${(prog.ch || 0) + 1}</small>` : ''}
      </button>`;

    qs('#nv-back', el).onclick = () => NR.Router.go('#/');
    qs('#nv-edit', el).onclick = () => { editing = true; edit(el, n); };
    qs('#nv-shelf', el).onclick = () => NR.UI.shelfPicker(n, s => {
      NR.UI.toast(s.key ? `Положено: ${s.label}` : 'Убрано с полки', { icon: s.icon });
      view(el, NR.Data.get(n.id));
    });
    qs('#nv-note', el).onclick = () => noteModal(n);
    qs('#nv-read', el).onclick = () => NR.Router.go('#/read/' + n.id);
    NR.U.qsa('#nv-chips .chip', el).forEach(c => c.onclick = () => NR.Router.go('#/'));
    const att = qs('#nv-attach', el);
    if (att) att.onclick = async () => {
      const text = await pickBook();
      if (!text) return;
      await NR.Data.attachText(n.id, text);
      NR.UI.toast('Текст привязан ✦ можно читать!', { icon: 'save' });
      view(el, NR.Data.get(n.id));
    };
  }

  function edit(el, n) {
    document.body.classList.add('editing');
    let coverData = null, coverCleared = false;
    const ge = NR.UI.genreEditor(n.genres || []);
    el.innerHTML = `
      <header class="app-header">
        <div class="hd-orn">${NR.Icons.ornament()}</div>
        <div class="hd-row">
          <button class="icon-btn" id="ed-cancel" aria-label="Отмена">${I('close', 's28')}</button>
          <div class="hd-title">Редактирование</div>
          <button class="icon-btn green" id="ed-save" aria-label="Сохранить">${I('save', 's28')}</button>
        </div>
      </header>
      <div class="novel-wrap page-in nv-edit">
        <div class="field"><label>Название</label><input class="inp" id="f-title" value="${esc(n.title)}"></div>
        <div class="two">
          <div class="field"><label>Год выхода</label><input class="inp" id="f-year" inputmode="numeric" placeholder="1986" value="${esc(n.year)}"></div>
          <div class="field"><label>Глав</label><input class="inp" id="f-ch" inputmode="numeric" placeholder="100" value="${esc(n.chapters)}"></div>
        </div>
        <div class="two">
          <div class="field"><label>Страна</label><input class="inp" id="f-country" placeholder="Япония" value="${esc(n.country)}"></div>
          <div class="field"><label>Автор</label><input class="inp" id="f-author" value="${esc(n.author)}"></div>
        </div>
        <div class="two">
          <div class="field"><label>Тип</label><select class="inp" id="f-type">
            ${['Новелла', 'Ранобэ', 'Манга', 'Книга'].map(t => `<option ${n.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="field"><label>Статус перевода</label><select class="inp" id="f-trans">
            ${TRANS.map(t => `<option ${n.translation === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Статус выпуска</label><select class="inp" id="f-rel">
          ${REL.map(t => `<option ${n.release === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Жанры</label><div id="f-genres"></div></div>
        <div class="field"><label>Обложка</label>
          <div class="up-cover">
            <div class="cov-prev" id="f-cov-prev"></div>
            <div style="flex:1;display:flex;flex-direction:column;gap:7px;min-width:0">
              <input class="inp" id="f-cover" placeholder="путь: assets/covers/моя.jpg" value="${n.cover && !n.cover.startsWith('data:') ? esc(n.cover) : ''}">
              <div style="display:flex;gap:7px;flex-wrap:wrap">
                <button class="btn small" id="f-cov-btn">${I('upload', 's16')} С телефона</button>
                <button class="btn small ghost" id="f-cov-clear">${I('trash', 's16')} Убрать</button>
              </div>
              <span class="hint-p" id="f-cov-state"></span>
            </div>
          </div>
        </div>
        <div class="field"><label>Текст книги</label>
          <button class="btn small gold" id="f-text-btn">${I('book', 's16')} Выбрать файл (${esc(NR.Books.supported)})</button>
          <span class="hint-p" id="f-text-state">${n.hasText ? 'Текст уже есть — новый файл заменит его' : 'Текста пока нет — выбери файл'}</span>
        </div>
        <div class="field"><label>Описание</label><textarea class="inp" id="f-desc" rows="6">${esc(n.description)}</textarea></div>
        ${n.uploaded ? `<div class="edit-zone">
          <button class="btn danger block" id="f-del">${I('trash', 's20')} Удалить новеллу</button>
        </div>` : ''}
      </div>`;
    qs('#f-genres', el).appendChild(ge.el);

    /* превью обложки */
    const prev = qs('#f-cov-prev', el), covState = qs('#f-cov-state', el);
    const letter = ((n.title || '?').trim()[0] || '?');
    const drawPrev = src => {
      prev.innerHTML = '';
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.onerror = () => { prev.innerHTML = `<span class="ph-l">${esc(letter)}</span>`; };
        prev.appendChild(img);
      } else prev.innerHTML = `<span class="ph-l">${esc(letter)}</span>`;
      covState.textContent = src ? (src.startsWith('data:') ? 'Сейчас: картинка с телефона ✓' : 'Сейчас: ' + src) : 'Сейчас: серая заглушка';
    };
    drawPrev(n.cover);

    const exit = () => { editing = false; view(el, NR.Data.get(nid)); };
    qs('#ed-cancel', el).onclick = exit;
    NR.Router.pushBack(exit);
    qs('#f-cov-btn', el).onclick = async () => {
      const f = await NR.U.pickFile('image/*');
      if (!f) return;
      try {
        coverData = await NR.U.readImageDataURL(f);
        coverCleared = false;
        qs('#f-cover', el).value = '';
        drawPrev(coverData);
      } catch (e) { NR.UI.toast(e.message, { icon: 'warn' }); }
    };
    qs('#f-cov-clear', el).onclick = () => {
      coverData = null; coverCleared = true;
      qs('#f-cover', el).value = '';
      drawPrev(null);
    };
    qs('#f-text-btn', el).onclick = async () => {
      const text = await pickBook();
      if (!text) return;
      await NR.Data.attachText(n.id, text);
      qs('#f-text-state', el).textContent = 'Новый текст загружен ✓';
      NR.UI.toast('Текст книги обновлён ✦', { icon: 'save' });
    };
    qs('#ed-save', el).onclick = async () => {
      const patch = {
        title: qs('#f-title', el).value.trim() || n.title,
        year: qs('#f-year', el).value.trim(),
        chapters: parseInt(qs('#f-ch', el).value) || 0,
        country: qs('#f-country', el).value.trim(),
        author: qs('#f-author', el).value.trim(),
        type: qs('#f-type', el).value,
        translation: qs('#f-trans', el).value,
        release: qs('#f-rel', el).value,
        genres: ge.get(),
        description: qs('#f-desc', el).value.trim(),
      };
      const covPath = qs('#f-cover', el).value.trim();
      if (coverData) await NR.Data.setCover(n.id, coverData);
      else if (coverCleared) { await NR.Data.removeCover(n.id); patch.cover = ''; }
      else if (covPath) { await NR.Data.removeCover(n.id); patch.cover = covPath; }
      NR.Store.setOverride(n.id, patch);
      NR.UI.toast('Сохранено ✓', { icon: 'save' });
      exit();
    };
    const del = qs('#f-del', el);
    if (del) del.onclick = async () => {
      const ok = !NR.Store.s.confirmDel || await NR.UI.confirm(`Удалить «${n.title}» вместе с текстом?`, { danger: true, yes: 'Удалить' });
      if (!ok) return;
      const snap = await NR.Data.removeUpload(n.id);
      NR.Router.go('#/');
      NR.UI.toast('Новелла удалена', { icon: 'trash', action: 'Вернуть', onAction: () => NR.Data.restoreUpload(snap) });
    };
  }

  function render(el, params) {
    nid = params.id; editing = false;
    const n = NR.Data.get(params.id);
    if (!n) {
      el.innerHTML = NR.UI.emptyState('Новелла не найдена', 'Возможно, она была удалена');
      const b = document.createElement('div');
      b.style.cssText = 'text-align:center;padding-bottom:30px';
      b.innerHTML = '<button class="btn pink">На главную</button>';
      b.firstChild.onclick = () => NR.Router.go('#/');
      el.appendChild(b);
      return;
    }
    view(el, n);
    NR.Router.pushBack(() => { if (editing) { editing = false; view(el, NR.Data.get(nid)); } else NR.Router.go('#/'); });
    offBus = NR.U.bus.on('data', () => { if (!editing && NR.Router.name === 'novel') view(el, NR.Data.get(nid)); });
  }
  return { render, dispose() { offBus && offBus(); document.body.classList.remove('editing'); } };
})();
