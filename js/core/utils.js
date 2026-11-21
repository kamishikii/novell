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
    /* для книг показываем ВСЕ файлы: андроид прячет .fb2/.epub при строгом фильтре */
    if (accept && (accept.includes('.fb2') || accept.includes('.txt'))) accept = '*/*';
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept || ''; inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.onchange = () => { res(inp.files[0] || null); inp.remove(); };
      inp.addEventListener('cancel', () => { res(null); inp.remove(); });
      inp.click();
    });
  }
  /* чтение книги: любой поддерживаемый формат → текст (главы запоминаются в NR.Books) */
  async function readFileSmart(file) {
    try { return await NR.Books.parse(file); }
    catch (e) { throw new Error((e && e.message) || 'Не смогла прочитать файл'); }
  }
  function readImageDataURL(file, maxMB = 3) {
    return new Promise((res, rej) => {
      if (file.size > maxMB * 1048576) return rej(new Error('Картинка больше ' + maxMB + ' МБ'));
      const r = new FileReader();
      r.onload = () => res(r.result); r.onerror = () => rej(new Error('Не прочиталась картинка'));
      r.readAsDataURL(file);
    });
  }
  const subs = {};
  const bus = {
    on(ev, fn) { (subs[ev] = subs[ev] || []).push(fn); return () => { subs[ev] = subs[ev].filter(f => f !== fn); }; },
    emit(ev, d) { (subs[ev] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } }); }
  };
  return { qs, qsa, esc, clamp, debounce, uid, plural, fmtSize, fmtDate, copyText, download, pickFile, readFileSmart, readImageDataURL, bus };
})();
