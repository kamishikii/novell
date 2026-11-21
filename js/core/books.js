/* разбор книг: txt, fb2, fb2.zip, epub, html → текст + главы */
NR.Books = (() => {
  let pending = null;
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
  const supported = 'txt, fb2, fb2.zip, epub, html';

  function decode(buf) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch (e) { try { return new TextDecoder('windows-1251').decode(buf); } catch (e2) { return new TextDecoder().decode(buf); } }
  }

  /* мини-распаковщик zip (без внешних библиотек) */
  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65558); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Архив повреждён 😿');
    const count = dv.getUint16(eocd + 10, true);
    let ptr = dv.getUint32(eocd + 16, true);
    const entries = new Map();
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(ptr, true) !== 0x02014b50) break;
      const method = dv.getUint16(ptr + 10, true);
      const csize = dv.getUint32(ptr + 20, true);
      const nlen = dv.getUint16(ptr + 28, true), elen = dv.getUint16(ptr + 30, true), clen = dv.getUint16(ptr + 32, true);
      const off = dv.getUint32(ptr + 42, true);
      const name = new TextDecoder().decode(u8.subarray(ptr + 46, ptr + 46 + nlen));
      entries.set(name, { method, csize, off });
      ptr += 46 + nlen + elen + clen;
    }
    const cache = new Map();
    return {
      has: k => entries.has(k),
      keys: () => entries.keys(),
      async get(k) {
        if (cache.has(k)) return cache.get(k);
        const e = entries.get(k); if (!e) return null;
        const nl = dv.getUint16(e.off + 26, true), el = dv.getUint16(e.off + 28, true);
        const data = u8.subarray(e.off + 30 + nl + el, e.off + 30 + nl + el + e.csize);
        let out;
        if (e.method === 0) out = data;
        else if (e.method === 8) {
          if (!window.DecompressionStream) throw new Error('Обнови Android System WebView — он слишком старый для epub');
          const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          out = new Uint8Array(await new Response(stream).arrayBuffer());
        } else throw new Error('Неизвестное сжатие в архиве');
        cache.set(k, out); return out;
      }
    };
  }

  /* общий сборщик текста из html-документа */
  function extractDoc(doc, blocks, chapters) {
    doc.querySelectorAll('script,style,rt,rp,nav[epub\\:type="toc"]').forEach(n => n.remove());
    const walk = node => {
      for (const el of node.children) {
        const tag = el.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag)) {
          const t = norm(el.textContent);
          if (t) { chapters.push({ title: t, para: blocks.length }); blocks.push(t); }
        } else if (['p', 'li', 'blockquote', 'dd', 'dt', 'pre'].includes(tag)) {
          const t = norm(el.textContent); if (t) blocks.push(t);
        } else if (['div', 'section', 'article', 'main', 'body', 'figure', 'aside', 'header', 'footer', 'ul', 'ol', 'table', 'tbody', 'tr', 'td'].includes(tag)) {
          if (el.querySelector('p,h1,h2,h3,h4,h5,h6,div,section,li,blockquote')) walk(el);
          else { const t = norm(el.textContent); if (t) blocks.push(t); }
        } else if (tag === 'img' || tag === 'image' || tag === 'br' || tag === 'hr') {
          /* пропускаем */
        } else {
          const t = norm(el.textContent); if (t) blocks.push(t);
        }
      }
    };
    walk(doc.body || doc.documentElement);
  }

  async function epub(zip) {
    const dec = new TextDecoder();
    let opfPath = null;
    if (zip.has('META-INF/container.xml')) {
      const d = new DOMParser().parseFromString(dec.decode(await zip.get('META-INF/container.xml')), 'text/xml');
      const rf = d.querySelector('rootfile');
      opfPath = rf && rf.getAttribute('full-path');
    }
    if (!opfPath) opfPath = [...zip.keys()].find(k => k.toLowerCase().endsWith('.opf'));
    if (!opfPath) throw new Error('Не нашла структуру epub 😿');
    const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
    const opf = new DOMParser().parseFromString(dec.decode(await zip.get(opfPath)), 'text/xml');
    const manifest = {};
    opf.querySelectorAll('manifest > item').forEach(it => manifest[it.getAttribute('id')] = it.getAttribute('href'));
    const spine = [...opf.querySelectorAll('spine > itemref')].map(r => r.getAttribute('idref')).filter(id => manifest[id]);
    const resolve = href => {
      const parts = [];
      (opfDir + href).split('/').forEach(s => { if (!s || s === '.') return; if (s === '..') parts.pop(); else parts.push(s); });
      return parts.join('/');
    };
    const blocks = [], chapters = [];
    for (const id of spine) {
      const path = resolve(decodeURIComponent(manifest[id].split('#')[0]));
      const raw = await zip.get(path);
      if (!raw) continue;
      extractDoc(new DOMParser().parseFromString(dec.decode(raw), 'text/html'), blocks, chapters);
    }
    if (!blocks.length) throw new Error('В epub только картинки — текстовых глав нет 😿');
    return { text: blocks.join('\n\n'), chapters: chapters.length ? chapters : null };
  }

  function fb2(xml) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('fb2 повреждён 😿');
    const blocks = [], chapters = [];
    const push = t => { t = norm(t); if (t) blocks.push(t); };
    const walk = n => {
      const tag = (n.tagName || '').toLowerCase();
      if (tag === 'title') {
        const t = [...n.querySelectorAll('p')].map(p => norm(p.textContent)).filter(Boolean).join(' — ');
        if (t) { chapters.push({ title: t, para: blocks.length }); blocks.push(t); }
      } else if (tag === 'p' || tag === 'v') push(n.textContent);
      else if (tag === 'image' || tag === 'empty-line' || tag === 'annotation') { /* пропуск */ }
      else [...n.children].forEach(walk);
    };
    [...doc.querySelectorAll('body')].forEach(b => {
      if ((b.getAttribute('name') || '') === 'notes') return;
      [...b.children].forEach(walk);
    });
    if (!blocks.length) throw new Error('В fb2 не нашла текста 😿');
    return { text: blocks.join('\n\n'), chapters: chapters.length ? chapters : null };
  }

  function html(text) {
    const blocks = [], chapters = [];
    extractDoc(new DOMParser().parseFromString(text, 'text/html'), blocks, chapters);
    return { text: blocks.join('\n\n'), chapters: chapters.length ? chapters : null };
  }

  async function parse(file) {
    const buf = await file.arrayBuffer();
    const name = (file.name || '').toLowerCase();
    const bytes = new Uint8Array(buf);
    let result;
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
      const zip = await unzip(buf);
      const isEpub = zip.has('META-INF/container.xml') || [...zip.keys()].some(k => k.toLowerCase().endsWith('.opf'));
      if (isEpub) result = await epub(zip);
      else {
        const key = [...zip.keys()].find(k => k.toLowerCase().endsWith('.fb2')) || [...zip.keys()].find(k => k.toLowerCase().endsWith('.txt'));
        if (!key) throw new Error('В архиве не нашла книгу 😿');
        const t = decode(await zip.get(key));
        result = key.toLowerCase().endsWith('.fb2') ? fb2(t) : { text: t, chapters: null };
      }
    } else {
      const text = decode(buf).replace(/^\uFEFF/, '');
      const head = text.trimStart().slice(0, 800).toLowerCase();
      if (head.includes('<fictionbook') || name.endsWith('.fb2')) result = fb2(text);
      else if (head.includes('<!doctype html') || head.includes('<html') || /\.(html?|xhtml)$/.test(name)) result = html(text);
      else result = { text: text.replace(/\r\n?/g, '\n'), chapters: null };
    }
    if (!result.text || !result.text.trim()) throw new Error('Файл пустой или не читается 😿');
    pending = result.chapters;
    return result.text;
  }
  return { parse, takePending: () => { const p = pending; pending = null; return p; }, supported };
})();
