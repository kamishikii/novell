/* каталог: data/novels.json + загруженные с телефона файлы (IndexedDB) */
NR.Data = (() => {
  const { bus } = NR.U;
  let base = [];            // из novels.json
  let uploads = [];         // загруженные через приложение
  let covers = {};          // id -> dataURL (свои обложки)
  let textKeys = new Set(); // у каких id есть текст в IndexedDB
  const textCache = new Map();
  let db = null, dbBroken = false;

  function openDB() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no idb'));
      const rq = indexedDB.open('hanami-db', 1);
      rq.onupgradeneeded = () => {
        const d = rq.result;
        ['texts', 'uploads', 'covers'].forEach(st => { if (!d.objectStoreNames.contains(st)) d.createObjectStore(st, { keyPath: 'id' }); });
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
  }
  const tx = (st, mode) => db.transaction(st, mode).objectStore(st);
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const idbGet = (st, id) => db ? req(tx(st, 'readonly').get(id)) : Promise.resolve(null);
  const idbPut = (st, val) => db ? req(tx(st, 'readwrite').put(val)) : Promise.resolve();
  const idbDel = (st, id) => db ? req(tx(st, 'readwrite').delete(id)) : Promise.resolve();
  const idbAll = st => db ? req(tx(st, 'readonly').getAll()) : Promise.resolve([]);
  const idbKeys = st => db ? req(tx(st, 'readonly').getAllKeys()) : Promise.resolve([]);

  async function init() {
    try {
      const r = await fetch('data/novels.json');
      base = await r.json();
      if (!Array.isArray(base)) base = [];
    } catch (e) { console.warn('novels.json', e); base = []; }
    try {
      db = await openDB();
      uploads = (await idbAll('uploads')).map(r => r.meta);
      (await idbAll('covers')).forEach(r => covers[r.id] = r.data);
      textKeys = new Set(await idbKeys('texts'));
    } catch (e) { dbBroken = true; console.warn('idb', e); }
  }
  const raw = id => base.find(n => n.id === id) || uploads.find(n => n.id === id) || null;
  function get(id) {
    const b = raw(id); if (!b) return null;
    const o = NR.Store.override(id);
    return { ...b, ...o,
      cover: covers[id] || o.cover || b.cover || null,
      shelf: NR.Store.shelf(id), progress: NR.Store.progress(id),
      uploaded: uploads.some(u => u.id === id), hasText: textKeys.has(id) || !!b.file };
  }
  const all = () => [...base.map(b => b.id), ...uploads.map(u => u.id)].map(get).filter(Boolean);
  const genres = () => [...new Set(all().flatMap(n => n.genres || []))].sort((a, b) => a.localeCompare(b, 'ru'));
  const authors = () => {
    const m = new Map();
    all().forEach(n => { const a = n.author || 'Без автора'; if (!m.has(a)) m.set(a, []); m.get(a).push(n); });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
  };
  const countShelf = key => all().filter(n => n.shelf === key).length;

  async function getText(id) {
    if (textCache.has(id)) return textCache.get(id);
    if (textKeys.has(id)) {
      const rec = await idbGet('texts', id);
      if (rec && rec.text) { textCache.set(id, rec.text); return rec.text; }
    }
    const b = raw(id);
    if (b && b.file) {
      try {
        const r = await fetch(b.file);
        if (!r.ok) return null;
        const t = await r.text();
        textCache.set(id, t); return t;
      } catch (e) { return null; }
    }
    return null;
  }
  async function attachText(id, text) {
    await idbPut('texts', { id, text });
    textKeys.add(id); textCache.set(id, text); bus.emit('data');
  }
  async function setCover(id, dataURL) {
    covers[id] = dataURL; await idbPut('covers', { id, data: dataURL }); bus.emit('data');
  }
  async function addUpload(meta, text, coverData) {
    const id = 'u' + NR.U.uid();
    const m = { id, type: 'Новелла', genres: [], chapters: 0, year: '', country: '', author: '',
      description: '', translation: 'Продолжается', release: 'Онгоинг', ...meta, cover: null, file: null };
    uploads.push(m);
    await idbPut('uploads', { id, meta: m });
    if (text != null) await attachText(id, text);
    if (coverData) await setCover(id, coverData);
    bus.emit('data'); return id;
  }
  async function removeUpload(id) {
    const meta = uploads.find(u => u.id === id);
    const textRec = await idbGet('texts', id);
    const coverData = covers[id] || null;
    uploads = uploads.filter(u => u.id !== id);
    textKeys.delete(id); textCache.delete(id); delete covers[id];
    await idbDel('uploads', id); await idbDel('texts', id); await idbDel('covers', id);
    bus.emit('data');
    return { meta, text: textRec ? textRec.text : null, cover: coverData };
  }
  async function restoreUpload(snap) {
    if (!snap || !snap.meta) return;
    uploads.push(snap.meta);
    await idbPut('uploads', { id: snap.meta.id, meta: snap.meta });
    if (snap.text != null) await attachText(snap.meta.id, snap.text);
    if (snap.cover) await setCover(snap.meta.id, snap.cover);
    bus.emit('data');
  }
  async function clearIDB() {
    if (!db) return;
    for (const st of ['texts', 'uploads', 'covers']) await req(tx(st, 'readwrite').clear());
    uploads = []; covers = {}; textKeys = new Set(); textCache.clear();
  }
  const isBroken = () => dbBroken;
  const uploadsList = () => uploads.map(u => get(u.id));
  const jsonNoText = () => base.filter(b => !textKeys.has(b.id)).map(b => get(b.id));
  return { init, get, all, genres, authors, countShelf, getText, attachText, setCover,
    addUpload, removeUpload, restoreUpload, clearIDB, isBroken, uploadsList, jsonNoText };
})();
