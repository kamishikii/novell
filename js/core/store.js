/* память приложения: полки, заметки, прогресс, закладки, цитаты, настройки */
NR.Store = (() => {
  const KEY = 'hanami.v1';
  const DEF_READER = { size: 19, font: 'serif', weight: 400, lh: 1.6, align: 'justify',
    margins: true, mode: 'book', rtheme: 'light', text: '', bg: '', bright: 100 };
  const DEF = () => ({
    v: 1, theme: 'rose', anim: true, confirmDel: true, view: 'grid',
    reader: { ...DEF_READER },
    shelves: {}, notes: {}, meta: {}, progress: {},
    bookmarks: {}, quotes: {},
    collections: [{ id: 'c1', name: 'Уютное на вечер', ids: ['demo'] }],
    profile: { name: 'Читательница', emoji: '🌸' },
    flags: {}
  });
  let s = DEF();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); s = { ...DEF(), ...p, reader: { ...DEF_READER, ...(p.reader || {}) } }; }
  } catch (e) { console.warn('store load', e); }

  const flush = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { NR.UI && NR.UI.toast('Память переполнена 😿', { icon: 'warn' }); } };
  const save = NR.U.debounce(flush, 250);

  const api = {
    get s() { return s; }, save, flush,
    shelf: id => s.shelves[id] || null,
    setShelf(id, v) { if (v) s.shelves[id] = v; else delete s.shelves[id]; save(); NR.U.bus.emit('data'); },
    note: id => s.notes[id] || '',
    setNote(id, t) { if (t.trim()) s.notes[id] = t; else delete s.notes[id]; save(); NR.U.bus.emit('data'); },
    override: id => s.meta[id] || {},
    setOverride(id, obj) { s.meta[id] = { ...(s.meta[id] || {}), ...obj }; save(); NR.U.bus.emit('data'); },
    progress: id => s.progress[id] || null,
    setProgress(id, p) { s.progress[id] = { ...(s.progress[id] || {}), ...p }; save(); },
    bookmarks: id => s.bookmarks[id] || [],
    addBookmark(id, b) { (s.bookmarks[id] = s.bookmarks[id] || []).push(b); save(); },
    removeBookmark(id, ts) { s.bookmarks[id] = (s.bookmarks[id] || []).filter(b => b.ts !== ts); save(); },
    quotes: id => s.quotes[id] || [],
    addQuote(id, q) { (s.quotes[id] = s.quotes[id] || []).unshift(q); save(); },
    removeQuote(id, ts) { s.quotes[id] = (s.quotes[id] || []).filter(q => q.ts !== ts); save(); },
    reader: () => s.reader,
    rset(patch) { s.reader = { ...s.reader, ...patch }; save(); },
    rreset() { s.reader = { ...DEF_READER }; save(); },
    flag(k, v) { if (v === undefined) return s.flags[k]; s.flags[k] = v; save(); },
    exportJSON() { return JSON.stringify({ app: 'hanami', v: 1, state: s }); },
    importState(obj) {
      if (!obj || obj.app !== 'hanami' || !obj.state) throw new Error('Это не файл Ханами');
      s = { ...DEF(), ...obj.state, reader: { ...DEF_READER, ...(obj.state.reader || {}) } };
      flush();
    },
    resetAll() { s = DEF(); try { localStorage.removeItem(KEY); } catch (e) {} }
  };
  return api;
})();
