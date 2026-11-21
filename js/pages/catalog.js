/* главная: сетка новелл, поиск, жанры, сортировка, полки */
NR.Pages = NR.Pages || {};
NR.Pages.catalog = (() => {
  const { qs, esc, bus } = NR.U;
  const I = NR.Icons.html;
  let query = '', genreSet = new Set(), sort = 'title', lastSig = null, savedScroll = 0;
  const SORTS = [
    { key: 'title', label: 'По названию А–Я' },
    { key: 'recent', label: 'Недавно читала' },
    { key: 'yearNew', label: 'Год: новые' },
    { key: 'yearOld', label: 'Год: старые' },
  ];
  const shelfTitle = k => ({ favorite: 'Избранное', reading: 'В процессе', planned: 'В планах', completed: 'Прочитано', dropped: 'Брошено' }[k] || 'Каталог');

  function coverHTML(n) {
    const prog = n.progress && n.progress.pages ? Math.round((n.progress.page + 1) / n.progress.pages * 100) : 0;
    const badge = n.progress ? `Глава ${(n.progress.ch || 0) + 1}` : (n.chapters ? `${n.chapters} ${NR.U.plural(n.chapters, ['глава', 'главы', 'глав'])}` : '');
    const sh = n.shelf ? `<span class="shelf-mark">${I(NR.UI.shelfInfo(n.shelf).icon)}</span>` : '';
    return `<span class="cover">
      <span class="ph"><b>${esc((n.title || '?').trim()[0] || '?')}</b>${I('book', 's20')}</span>
      ${n.cover ? `<img src="${esc(n.cover)}" alt="" draggable="false" onload="this.classList.add('ok')" onerror="this.remove()">` : ''}
      ${sh}${badge ? `<span class="ch-badge">${esc(badge)}</span>` : ''}
      ${prog ? `<span class="prog"><i style="width:${prog}%"></i></span>` : ''}
    </span>`;
  }
  function card(n, i) {
    const b = document.createElement('button');
    b.className = 'card'; b.style.setProperty('--i', Math.min(i, 14));
    b.innerHTML = coverHTML(n) + `<h3>${esc(n.title)}</h3><span class="sub">${esc(n.type || 'Новелла')}</span>`;
    b.onclick = () => NR.Router.go('#/novel/' + n.id);
    return b;
  }
  function rowCard(n, i) {
    const b = document.createElement('button');
    b.className = 'row-card'; b.style.setProperty('--i', Math.min(i, 14));
    const prog = n.progress && n.progress.pages ? Math.round((n.progress.page + 1) / n.progress.pages * 100) + '%' : '';
    b.innerHTML = coverHTML(n) + `<span class="info"><h3>${esc(n.title)}</h3>
      <p>${esc(n.author || 'Без автора')}${n.year ? ' · ' + esc(n.year) : ''}</p>
      <span class="st">${n.shelf ? esc(NR.UI.shelfInfo(n.shelf).label) : esc(n.type || '')}</span></span>
      ${prog ? `<span class="pct">${prog}</span>` : ''}`;
    b.onclick = () => NR.Router.go('#/novel/' + n.id);
    return b;
  }

  function filtered(shelf, author) {
    let list = NR.Data.all();
    if (shelf) list = list.filter(n => n.shelf === shelf);
    if (author) list = list.filter(n => (n.author || 'Без автора') === author);
    if (genreSet.size) list = list.filter(n => (n.genres || []).some(g => genreSet.has(g)));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(n => (n.title || '').toLowerCase().includes(q) || (n.author || '').toLowerCase().includes(q));
    }
    const by = {
      title: (a, b) => a.title.localeCompare(b.title, 'ru'),
      recent: (a, b) => (b.progress?.ts || 0) - (a.progress?.ts || 0),
      yearNew: (a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0),
      yearOld: (a, b) => (parseInt(a.year) || 9999) - (parseInt(b.year) || 9999),
    };
    return list.sort(by[sort] || by.title);
  }

  function render(el, params, q) {
    const shelf = params.shelf || null;
    const author = q.author || null;
    const sig = (shelf || '') + '|' + (author || '');
    if (sig !== lastSig) { query = ''; genreSet.clear(); savedScroll = 0; lastSig = sig; }
    const view = NR.Store.s.view;

    el.innerHTML = `
      <header class="app-header" id="cat-hd">
        <div class="hd-orn">
          <button class="hd-burger" id="burger" aria-label="Меню">${I('menu', 's28')}</button>
          ${NR.Icons.ornament()}
          <span class="hd-spark a">✦</span><span class="hd-spark b">✦</span>
        </div>
        <div class="hd-row">
          <div class="search-pill">
            ${I('search', 's20')}
            <input id="cat-q" type="search" placeholder="Найти новеллу…" value="${esc(query)}" autocomplete="off">
            <button class="search-clear ${query ? 'show' : ''}" id="cat-qx" aria-label="Очистить">${I('close', 's20')}</button>
          </div>
        </div>
      </header>
      <div class="page-in">
        <div class="cat-tools">
          <div class="cat-title">${esc(author ? 'Автор' : shelfTitle(shelf))}<small id="cat-count"></small></div>
          <button class="icon-btn" id="cat-sort" aria-label="Сортировка">${I('sort')}</button>
          <button class="icon-btn" id="cat-view" aria-label="Вид">${I(view === 'grid' ? 'list' : 'grid')}</button>
        </div>
        ${author ? `<div class="filter-note">${I('author', 's16')} ${esc(author)} <button class="chip" id="author-x">${I('close', 's16')} сбросить</button></div>` : ''}
        <div class="genre-row" id="genre-row"></div>
        <div id="cat-body"></div>
      </div>`;

    qs('#burger', el).onclick = () => NR.App.openDrawer();
    const inp = qs('#cat-q', el), qx = qs('#cat-qx', el);
    const doSearch = NR.U.debounce(() => { query = inp.value; qx.classList.toggle('show', !!query); drawBody(); }, 160);
    inp.oninput = doSearch;
    inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); };
    qx.onclick = () => { inp.value = ''; query = ''; qx.classList.remove('show'); drawBody(); inp.focus(); };
    qs('#cat-view', el).onclick = () => {
      NR.Store.s.view = view === 'grid' ? 'list' : 'grid'; NR.Store.save();
      render(el, params, q);
    };
    qs('#cat-sort', el).onclick = () => {
      const wrap = document.createElement('div'); wrap.className = 'md-list';
      const md = NR.UI.modal({ title: 'Сортировка', icon: 'sort', body: wrap });
      SORTS.forEach(s => {
        const b = document.createElement('button');
        b.className = 'md-opt' + (sort === s.key ? ' on' : '');
        b.innerHTML = `<span>${esc(s.label)}</span><span class="tick">${I('save', 's16')}</span>`;
        b.onclick = () => { sort = s.key; md.close(); drawBody(); };
        wrap.appendChild(b);
      });
    };
    const ax = qs('#author-x', el);
    if (ax) ax.onclick = () => NR.Router.go('#/');

    const gr = qs('#genre-row', el);
    const genres = NR.Data.genres();
    const allChip = document.createElement('button');
    allChip.className = 'chip' + (genreSet.size ? '' : ' on');
    allChip.textContent = 'Все';
    allChip.onclick = () => { genreSet.clear(); drawGenres(); drawBody(); };
    gr.appendChild(allChip);
    function drawGenres() {
      gr.innerHTML = ''; gr.appendChild(allChip);
      allChip.className = 'chip' + (genreSet.size ? '' : ' on');
      genres.forEach(g => {
        const c = document.createElement('button');
        c.className = 'chip' + (genreSet.has(g) ? ' on' : '');
        c.innerHTML = I('tag', 's16') + esc(g);
        c.onclick = () => { genreSet.has(g) ? genreSet.delete(g) : genreSet.add(g); drawGenres(); drawBody(); };
        gr.appendChild(c);
      });
    }
    drawGenres();

    function drawBody() {
      const list = filtered(shelf, author);
      qs('#cat-count', el).textContent = list.length + ' ' + NR.U.plural(list.length, ['новелла', 'новеллы', 'новелл']);
      const body = qs('#cat-body', el);
      body.innerHTML = '';
      if (!list.length) {
        body.innerHTML = query
          ? NR.UI.emptyState('Ничего не нашлось…', 'Попробуй другое название или сбрось фильтры ✿')
          : NR.UI.emptyState(shelf ? 'Тут пока пусто' : 'Каталог пуст',
              shelf ? 'Открой новеллу и нажми «В закладки», чтобы положить её сюда' : 'Загрузи новеллу через меню → Загрузка');
        return;
      }
      const wrap = document.createElement('div');
      wrap.className = NR.Store.s.view === 'grid' ? 'grid' : 'listview';
      list.forEach((n, i) => wrap.appendChild(NR.Store.s.view === 'grid' ? card(n, i) : rowCard(n, i)));
      body.appendChild(wrap);
    }
    drawBody();

    const hd = qs('#cat-hd', el);
    const onScroll = () => hd.classList.toggle('shrunk', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const offBus = bus.on('data', drawBody);
    requestAnimationFrame(() => window.scrollTo(0, savedScroll));
    this._dispose = () => { savedScroll = window.scrollY; window.removeEventListener('scroll', onScroll); offBus(); };
  }
  return { render, dispose() { this._dispose && this._dispose(); }, card, coverHTML };
})();
