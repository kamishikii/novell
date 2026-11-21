/* старт приложения: компактное меню, темы, сплэш, Capacitor */
NR.App = (() => {
  const { qs, esc } = NR.U;
  const I = NR.Icons.html;
  let drawerEl = null;

  function setTheme(t) {
    NR.Store.s.theme = t; NR.Store.save();
    document.documentElement.dataset.theme = t;
    const meta = qs('meta[name="theme-color"]');
    if (meta) meta.content = t === 'night' ? '#4a2a40' : '#f6bfd4';
  }
  const drawerOpen = () => drawerEl && drawerEl.classList.contains('open');
  function closeDrawer() {
    if (!drawerEl) return;
    drawerEl.classList.remove('open');
    setTimeout(() => { if (!drawerOpen()) { drawerEl.innerHTML = ''; document.body.style.overflow = ''; } }, 330);
  }
  function openDrawer() {
    const root = qs('#drawer-root');
    root.classList.add('drawer-root');
    const route = NR.Router.parse();
    const items = [
      { icon: 'books', label: 'Каталог', hash: '#/', on: route.path === '' && !route.query.author },
      { icon: 'heart', label: 'Избранное', hash: '#/shelf/favorite' },
      { icon: 'plane', label: 'Прочитано', hash: '#/shelf/completed' },
      { icon: 'reading', label: 'В процессе', hash: '#/shelf/reading' },
      { icon: 'plan', label: 'В планах', hash: '#/shelf/planned' },
      { icon: 'drop', label: 'Брошено', hash: '#/shelf/dropped' },
      { icon: 'collection', label: 'Коллекции', hash: '#/collections' },
      { icon: 'author', label: 'Авторы', hash: '#/authors' },
      { icon: 'profile', label: 'Профиль', hash: '#/profile' },
      { icon: 'upload', label: 'Загрузка', hash: '#/upload' },
      { icon: 'coin', label: 'Все новеллы', hash: '#/', view: 'list' },
    ];
    const night = NR.Store.s.theme === 'night';
    root.innerHTML = `
      <div class="drawer-scrim" data-x></div>
      <nav class="drawer">
        <div class="dw-head">${NR.Icons.corner('tl')}${NR.Icons.corner('tr')}</div>
        <div class="dw-list" id="dw-list"></div>
        <div class="dw-foot">
          <button class="dw-item" data-h="#/settings" style="--i:11">${I('settings', 's28')}<span>Настройки</span></button>
          <button class="dw-item" data-theme style="--i:12">${I(night ? 'sun' : 'moon', 's28')}<span>${night ? 'Розовая тема' : 'Ночная тема'}</span></button>
          <span class="dw-corner-br">${NR.Icons.corner('')}</span>
        </div>
      </nav>`;
    drawerEl = root;
    const list = qs('#dw-list', root);
    items.forEach((it, i) => {
      const b = document.createElement('button');
      const on = it.on || (route.path === it.hash.slice(2));
      b.className = 'dw-item' + (on ? ' on' : '');
      b.style.setProperty('--i', i);
      b.innerHTML = I(it.icon, 's28') + `<span>${esc(it.label)}</span>`;
      b.onclick = () => {
        closeDrawer();
        if (it.view) { NR.Store.s.view = it.view; NR.Store.save(); }
        NR.Router.go(it.hash);
      };
      list.appendChild(b);
    });
    NR.U.qsa('[data-h]', root).forEach(b => b.onclick = () => { closeDrawer(); NR.Router.go(b.dataset.h); });
    qs('[data-theme]', root).onclick = function () {
      const to = NR.Store.s.theme === 'night' ? 'rose' : 'night';
      setTheme(to);
      this.innerHTML = I(to === 'night' ? 'sun' : 'moon', 's28') + `<span>${to === 'night' ? 'Розовая тема' : 'Ночная тема'}</span>`;
      NR.UI.toast(to === 'night' ? 'Ночная тема 🌙' : 'Розовая тема 🌸', { icon: to === 'night' ? 'moon' : 'sun' });
    };
    qs('[data-x]', root).onclick = closeDrawer;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
    const nav = qs('.drawer', root);
    let sx = null;
    nav.addEventListener('pointerdown', e => { sx = e.clientX; });
    nav.addEventListener('pointermove', e => {
      if (sx == null) return;
      const dx = Math.min(0, e.clientX - sx);
      if (dx < -6) nav.style.transform = `translateX(${dx}px)`;
    });
    const end = e => {
      if (sx == null) return;
      const dx = e.clientX - sx; sx = null;
      nav.style.transform = '';
      if (dx < -70) closeDrawer();
    };
    nav.addEventListener('pointerup', end);
    nav.addEventListener('pointercancel', () => { sx = null; nav.style.transform = ''; });
  }

  async function boot() {
    document.documentElement.dataset.theme = NR.Store.s.theme;
    document.documentElement.dataset.anim = NR.Store.s.anim ? 'on' : 'off';
    NR.Icons.probe();
    NR.UI.initThemedSelects();
    await NR.Data.init();
    NR.Router.register('catalog', NR.Pages.catalog);
    NR.Router.register('novel', NR.Pages.novel);
    NR.Router.register('reader', NR.Pages.reader);
    NR.Router.register('upload', NR.Pages.upload);
    NR.Router.register('collections', NR.Pages.collections);
    NR.Router.register('collection', NR.Pages.collection);
    NR.Router.register('authors', NR.Pages.authors);
    NR.Router.register('profile', NR.Pages.profile);
    NR.Router.register('settings', NR.Pages.settings);
    NR.Router.start();
    setTimeout(() => { const sp = qs('#splash'); sp.classList.add('done'); setTimeout(() => sp.remove(), 500); }, 350);

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (NR.UI.closeTopModal()) return;
      if (drawerOpen()) closeDrawer();
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') NR.Store.flush(); });
    window.addEventListener('pagehide', () => NR.Store.flush());
    document.addEventListener('contextmenu', e => {
      if (e.target.closest('.r-strip, input, textarea')) return;
      e.preventDefault();
    });

    const cap = window.Capacitor;
    if (cap && cap.Plugins) {
      const SB = cap.Plugins.StatusBar, App = cap.Plugins.App;
      const hide = () => { try { SB.setOverlaysWebView({ overlay: true }); SB.hide(); } catch (e) {} };
      if (SB) hide();
      if (App) {
        App.addListener('backButton', () => NR.Router.androidBack());
        App.addListener('appStateChange', ({ isActive }) => { if (isActive && SB) hide(); });
        App.addListener('resume', () => { if (SB) hide(); });
      }
    }
  }
  document.addEventListener('DOMContentLoaded', boot);
  return { openDrawer, closeDrawer, drawerOpen, setTheme };
})();
