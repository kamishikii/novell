/* коллекции, авторы, профиль, настройки приложения, «о приложении» */
NR.Pages = NR.Pages || {};
(() => {
  const { qs, esc, bus } = NR.U;
  const I = NR.Icons.html;
  const header = t => NR.Pages.upload.header(t);

  /* ── коллекции ── */
  NR.Pages.collections = {
    _off: null,
    render(el) {
      const draw = () => {
        const cols = NR.Store.s.collections;
        el.innerHTML = header('Коллекции') + `
          <div class="pg-wrap page-in">
            <button class="btn pink block" id="col-new">${I('plus', 's20')} Новая коллекция</button>
            <div id="col-list" style="display:flex;flex-direction:column;gap:10px"></div>
          </div>`;
        qs('#col-new', el).onclick = async () => {
          const name = await NR.UI.prompt({ title: 'Новая коллекция', label: 'Название', placeholder: 'Например: На дождливый вечер' });
          if (!name) return;
          NR.Store.s.collections.push({ id: 'c' + NR.U.uid(), name, ids: [] });
          NR.Store.save(); draw();
          NR.UI.toast('Коллекция создана ✦', { icon: 'collection' });
        };
        const list = qs('#col-list', el);
        if (!cols.length) { list.innerHTML = NR.UI.emptyState('Коллекций пока нет', 'Собери свои подборки новелл'); return; }
        cols.forEach((c, i) => {
          const b = document.createElement('button');
          b.className = 'coll-card'; b.style.setProperty('--i', i);
          const covers = c.ids.slice(0, 3).map(id => NR.Data.get(id)).filter(Boolean);
          b.innerHTML = `<span class="coll-stack">${[0, 1, 2].map(k =>
            `<i>${covers[k] && covers[k].cover ? `<img src="${esc(covers[k].cover)}">` : ''}</i>`).join('')}</span>
            <span class="t"><b>${esc(c.name)}</b><span>${c.ids.length} ${NR.U.plural(c.ids.length, ['новелла', 'новеллы', 'новелл'])}</span></span>
            ${I('chevR')}`;
          b.onclick = () => NR.Router.go('#/collection/' + c.id);
          list.appendChild(b);
        });
      };
      draw();
      this._off = bus.on('data', draw);
    },
    dispose() { this._off && this._off(); }
  };

  NR.Pages.collection = {
    _off: null,
    render(el, params) {
      const col = () => NR.Store.s.collections.find(c => c.id === params.id);
      const draw = () => {
        const c = col();
        if (!c) { NR.Router.go('#/collections'); return; }
        const novels = c.ids.map(id => NR.Data.get(id)).filter(Boolean);
        el.innerHTML = header(c.name) + `
          <div class="coll-manage">
            <button class="btn small gold" id="cm-add">${I('plus', 's16')} Добавить новеллы</button>
            <button class="btn small" id="cm-ren">${I('edit', 's16')} Название</button>
            <button class="btn small danger" id="cm-del">${I('trash', 's16')} Удалить</button>
          </div>
          <div class="${novels.length ? 'grid' : ''}" id="cm-grid"></div>`;
        const grid = qs('#cm-grid', el);
        if (!novels.length) grid.innerHTML = NR.UI.emptyState('Пусто', 'Добавь новеллы в эту коллекцию');
        novels.forEach((n, i) => grid.appendChild(NR.Pages.catalog.card(n, i)));
        qs('#cm-add', el).onclick = () => {
          const body = document.createElement('div');
          NR.Data.all().forEach(n => {
            const l = document.createElement('label');
            l.className = 'md-check';
            l.innerHTML = `<input type="checkbox" ${c.ids.includes(n.id) ? 'checked' : ''} value="${esc(n.id)}"><span>${esc(n.title)}</span>`;
            body.appendChild(l);
          });
          NR.UI.modal({
            title: 'Что положим?', icon: 'collection', body,
            actions: [{ icon: 'save', label: 'Готово', cls: 'gold', onClick: close => {
              c.ids = NR.U.qsa('input:checked', body).map(i => i.value);
              NR.Store.save(); close(); draw();
            } }]
          });
        };
        qs('#cm-ren', el).onclick = async () => {
          const name = await NR.UI.prompt({ title: 'Название', label: 'Как назовём?', value: c.name });
          if (name) { c.name = name; NR.Store.save(); draw(); }
        };
        qs('#cm-del', el).onclick = async () => {
          if (!await NR.UI.confirm(`Удалить коллекцию «${c.name}»? Сами новеллы останутся.`, { danger: true, yes: 'Удалить' })) return;
          NR.Store.s.collections = NR.Store.s.collections.filter(x => x.id !== c.id);
          NR.Store.save(); NR.Router.go('#/collections');
        };
      };
      draw();
      this._off = bus.on('data', draw);
    },
    dispose() { this._off && this._off(); }
  };

  /* ── авторы ── */
  NR.Pages.authors = {
    render(el) {
      const authors = NR.Data.authors();
      el.innerHTML = header('Авторы') + `<div class="pg-wrap page-in" id="au"></div>`;
      const wrap = qs('#au', el);
      if (!authors.length) { wrap.innerHTML = NR.UI.emptyState('Пока никого', 'Авторы появятся вместе с новеллами'); return; }
      authors.forEach(([name, novels], i) => {
        const b = document.createElement('button');
        b.className = 'author-card'; b.style.setProperty('--i', i);
        const initials = name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
        b.innerHTML = `<span class="avatar">${esc(initials)}</span>
          <span class="t"><b>${esc(name)}</b><span>${novels.length} ${NR.U.plural(novels.length, ['новелла', 'новеллы', 'новелл'])}</span></span>${I('chevR')}`;
        b.onclick = () => NR.Router.go('#/?author=' + encodeURIComponent(name));
        wrap.appendChild(b);
      });
    }
  };

  /* ── профиль ── */
  NR.Pages.profile = {
    render(el) {
      const p = NR.Store.s.profile;
      const all = NR.Data.all();
      const pages = all.reduce((s, n) => s + (n.progress ? n.progress.page + 1 : 0), 0);
      const bm = all.reduce((s, n) => s + NR.Store.bookmarks(n.id).length, 0);
      const qt = all.reduce((s, n) => s + NR.Store.quotes(n.id).length, 0);
      const gcount = {};
      all.forEach(n => (n.genres || []).forEach(g => gcount[g] = (gcount[g] || 0) + 1));
      const topG = Object.entries(gcount).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const emojis = ['🌸', '📚', '🦊', '🌙', '⭐', '🍡', '🐰', '☕'];
      const stat = (v, l, i) => `<div class="stat" style="--i:${i}"><b>${v}</b><span>${l}</span></div>`;
      el.innerHTML = header('Профиль') + `
        <div class="pg-wrap page-in">
          <div class="pg-card" style="--i:0">
            <div class="prof-head">
              <div class="prof-ava" id="pf-ava">${p.emoji}</div>
              <div class="emoji-row" id="pf-emoji">${emojis.map(e => `<button class="${e === p.emoji ? 'on' : ''}">${e}</button>`).join('')}</div>
              <div class="prof-name"><input class="inp" id="pf-name" value="${esc(p.name)}" maxlength="24"></div>
            </div>
          </div>
          <div class="stats">
            ${stat(all.length, 'новелл', 0)}
            ${stat(NR.Data.countShelf('completed'), 'прочитано', 1)}
            ${stat(NR.Data.countShelf('reading'), 'читаю', 2)}
            ${stat(pages, 'страниц', 3)}
            ${stat(bm, 'закладок', 4)}
            ${stat(qt, 'цитат', 5)}
          </div>
          <div class="pg-card" style="--i:1">
            <h3>${I('tag')} Любимые жанры</h3>
            <div style="display:flex;flex-wrap:wrap;gap:7px">
              ${topG.length ? topG.map(g => `<span class="chip on">${esc(g[0])} · ${g[1]}</span>`).join('') : '<span class="hint-p">Появятся, когда добавишь жанры новеллам</span>'}
            </div>
          </div>
        </div>`;
      qs('#pf-name', el).onchange = function () {
        NR.Store.s.profile.name = this.value.trim() || 'Читательница';
        NR.Store.save(); NR.UI.toast('Имя сохранено ✓', { icon: 'save' });
      };
      NR.U.qsa('#pf-emoji button', el).forEach(b => b.onclick = () => {
        NR.Store.s.profile.emoji = b.textContent; NR.Store.save();
        qs('#pf-ava', el).textContent = b.textContent;
        NR.U.qsa('#pf-emoji button', el).forEach(x => x.classList.toggle('on', x === b));
      });
    }
  };

  /* ── настройки приложения ── */
  NR.Pages.settings = {
    render(el) {
      const s = NR.Store.s;
      const line = (icon, title, sub, ctl) => `
        <div class="set-line">${I(icon, 's28')}<div class="t"><b>${title}</b><span>${sub}</span></div>${ctl}</div>`;
      el.innerHTML = header('Настройки') + `
        <div class="pg-wrap page-in">
          <div class="pg-card" style="--i:0">
            <h3>${I('sun')} Оформление</h3>
            ${line('moon', 'Ночная тема', 'Сливовая темнота вместо розы', `<label class="switch"><input type="checkbox" id="st-theme" ${s.theme === 'night' ? 'checked' : ''}><i></i></label>`)}
            ${line('star', 'Анимации', 'Перелистывания и появления', `<label class="switch"><input type="checkbox" id="st-anim" ${s.anim ? 'checked' : ''}><i></i></label>`)}
          </div>
          <div class="pg-card" style="--i:1">
            <h3>${I('warn')} Поведение</h3>
            ${line('trash', 'Подтверждать удаление', 'Спрашивать перед удалением', `<label class="switch"><input type="checkbox" id="st-del" ${s.confirmDel ? 'checked' : ''}><i></i></label>`)}
            ${line('gear', 'Настройки чтения', 'Шрифт, размер, листание — открываются шестерёнкой внутри читалки', '')}
          </div>
          <div class="pg-card" style="--i:2">
            <h3>${I('layers')} Данные</h3>
            <p class="hint-p" style="margin-bottom:12px">Всё хранится только на этом устройстве. Сделай резервную копию, чтобы не потерять полки, заметки и цитаты.</p>
            <div style="display:flex;flex-direction:column;gap:9px">
              <button class="btn block" id="st-exp">${I('export', 's20')} Экспорт данных</button>
              <button class="btn block" id="st-imp">${I('import', 's20')} Импорт данных</button>
              <button class="btn danger block" id="st-reset">${I('reset', 's20')} Сбросить всё</button>
            </div>
          </div>
        </div>`;
      qs('#st-theme', el).onchange = function () { NR.App.setTheme(this.checked ? 'night' : 'rose'); };
      qs('#st-anim', el).onchange = function () { s.anim = this.checked; NR.Store.save(); document.documentElement.dataset.anim = this.checked ? 'on' : 'off'; };
      qs('#st-del', el).onchange = function () { s.confirmDel = this.checked; NR.Store.save(); };
      qs('#st-exp', el).onclick = () => {
        const json = NR.Store.exportJSON();
        NR.U.download('hanami-backup.json', json);
        const body = document.createElement('div');
        body.innerHTML = `<p class="hint-p" style="margin-bottom:9px">Если скачивание не сработало — скопируй текст и сохрани его в файл:</p>
          <textarea class="inp" rows="7" readonly>${esc(json)}</textarea>`;
        NR.UI.modal({ title: 'Резервная копия', icon: 'export', dark: true, body,
          actions: [{ icon: 'copy', label: 'Копировать', cls: 'gold', onClick: async () => { await NR.U.copyText(json); NR.UI.toast('Скопировано ✓', { icon: 'copy' }); } },
                    { icon: 'close', label: 'Закрыть', onClick: c => c() }] });
      };
      qs('#st-imp', el).onclick = async () => {
        const f = await NR.U.pickFile('.json,application/json');
        if (!f) return;
        try {
          const obj = JSON.parse(await f.text());
          NR.Store.importState(obj);
          NR.UI.toast('Данные восстановлены ✦ перезапускаю…', { icon: 'save' });
          setTimeout(() => location.reload(), 900);
        } catch (e) { NR.UI.toast(e.message || 'Не тот файл 😿', { icon: 'warn' }); }
      };
      qs('#st-reset', el).onclick = async () => {
        if (!await NR.UI.confirm('Стереть все полки, заметки, цитаты, прогресс и загруженные книги?', { danger: true, yes: 'Стереть всё' })) return;
        NR.Store.resetAll();
        await NR.Data.clearIDB();
        location.reload();
      };
    }
  };
})();
