/* мелкие помощники */
window.NR = window.NR || {};
NR.U = (() => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const plural = (n, f) => { n = Math.abs(n) % 100; const d = n % 10;
    if (n > 10 && n < 20) return f[2]; if (d > 1 && d < 5) return f[1]; if (d === 1) return f[0]; return f[2]; };
  const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ';
  const fmtDate = ts => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove(); return ok;
    }
  }
  function download(name, text) {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      return true;
    } catch (e) { return false; }
  }
  function pickFile(accept) {
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept || ''; inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.onchange = () => { res(inp.files[0] || null); inp.remove(); };
      inp.addEventListener('cancel', () => { res(null); inp.remove(); });
      inp.click();
    });
  }
  /* умное чтение: UTF-8, иначе windows-1251 (частая кодировка русских txt) */
  async function readFileSmart(file) {
    const buf = await file.arrayBuffer();
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch (e) { try { text = new TextDecoder('windows-1251').decode(buf); } catch (e2) { text = new TextDecoder().decode(buf); } }
    text = text.replace(/^\uFEFF/, '');
    if (/\.fb2$/i.test(file.name) || text.trimStart().startsWith('<?xml')) {
      const conv = fb2ToText(text); if (conv) text = conv;
    }
    return text;
  }
  function fb2ToText(xml) {
    try {
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      if (doc.querySelector('parsererror')) return null;
      const out = [];
      const walk = n => {
        const tag = n.tagName;
        if (tag === 'section' || tag === 'body' || tag === 'epigraph') [...n.children].forEach(walk);
        else if (tag === 'title') { [...n.querySelectorAll('p')].forEach(p => out.push(p.textContent.trim())); out.push(''); }
        else if (tag === 'p') out.push(n.textContent.trim());
        else if (tag === 'poem') { [...n.querySelectorAll('v')].forEach(v => out.push(v.textContent.trim())); out.push(''); }
        else if (tag === 'empty-line') out.push('');
      };
      [...doc.querySelectorAll('body')].filter(b => b.getAttribute('name') !== 'notes').forEach(walk);
      const t = out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
      return t || null;
    } catch (e) { return null; }
  }
  function readImageDataURL(file, maxMB = 3) {
    return new Promise((res, rej) => {
      if (file.size > maxMB * 1048576) return rej(new Error('Картинка больше ' + maxMB + ' МБ'));
      const r = new FileReader();
      r.onload = () => res(r.result); r.onerror = () => rej(new Error('Не读 файла'));
      r.readAsDataURL(file);
    });
  }
  /* простая шина событий */
  const subs = {};
  const bus = {
    on(ev, fn) { (subs[ev] = subs[ev] || []).push(fn); return () => { subs[ev] = subs[ev].filter(f => f !== fn); }; },
    emit(ev, d) { (subs[ev] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } }); }
  };
  return { qs, qsa, esc, clamp, debounce, uid, plural, fmtSize, fmtDate, copyText, download, pickFile, readFileSmart, readImageDataURL, bus };
})();
