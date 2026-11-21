/* навигация по страницам через #/адрес */
NR.Router = (() => {
  const pages = {};
  let current = null, currentName = null, stack = [];
  const backHandlers = [];
  const routes = [
    { re: /^$/, name: 'catalog', map: () => ({}) },
    { re: /^shelf\/(\w+)$/, name: 'catalog', map: m => ({ shelf: m[1] }) },
    { re: /^novel\/([\w-]+)$/, name: 'novel', map: m => ({ id: m[1] }) },
    { re: /^read\/([\w-]+)$/, name: 'reader', map: m => ({ id: m[1] }) },
    { re: /^collections$/, name: 'collections', map: () => ({}) },
    { re: /^collection\/([\w-]+)$/, name: 'collection', map: m => ({ id: m[1] }) },
    { re: /^authors$/, name: 'authors', map: () => ({}) },
    { re: /^profile$/, name: 'profile', map: () => ({}) },
    { re: /^upload$/, name: 'upload', map: () => ({}) },
    { re: /^settings$/, name: 'settings', map: () => ({}) },
  ];
  const register = (name, page) => { pages[name] = page; };
  const parse = () => {
    const h = (location.hash || '#/').slice(1).replace(/^\//, '');
    const [path, q] = h.split('?');
    return { path, query: Object.fromEntries(new URLSearchParams(q || '')) };
  };
  function mount() {
    const { path, query } = parse();
    const route = routes.find(r => r.re.test(path)) || routes[0];
    const m = path.match(route.re) || [''];
    const params = route.map(m);
    if (current && current.dispose) { try { current.dispose(); } catch (e) { console.error(e); } }
    backHandlers.length = 0;
    current = pages[route.name]; currentName = route.name;
    document.body.dataset.page = route.name === 'reader' ? 'read' : route.name;
    document.body.classList.remove('editing');
    const el = NR.U.qs('#page');
    el.innerHTML = '';
    window.scrollTo(0, 0);
    if (current) current.render(el, params, query);
    NR.U.bus.emit('route', { name: route.name, params, query });
  }
  function onHash() {
    const h = location.hash || '#/';
    if (stack.length > 1 && stack[stack.length - 2] === h) stack.pop();
    else stack.push(h);
    mount();
  }
  const go = h => { if (location.hash === h) mount(); else location.hash = h; };
  const start = () => { window.addEventListener('hashchange', onHash); stack = [location.hash || '#/']; mount(); };
  const pushBack = fn => backHandlers.push(fn);
  function androidBack() {
    if (NR.UI.closeTopModal()) return;
    if (NR.App.drawerOpen && NR.App.drawerOpen()) { NR.App.closeDrawer(); return; }
    if (backHandlers.length) { backHandlers[backHandlers.length - 1](); return; }
    if (stack.length > 1) history.back();
    else {
      const cap = window.Capacitor;
      if (cap && cap.Plugins && cap.Plugins.App) cap.Plugins.App.exitApp();
      else go('#/');
    }
  }
  return { register, start, go, parse, pushBack, androidBack, get name() { return currentName; }, get depth() { return stack.length; } };
})();
