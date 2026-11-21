/* лёгкий движок: строит только текущую страницу, книгу целиком не рендерит */
NR.ReaderEngine = class {
  constructor(vp, box, strip) {
    this.vp = vp; this.box = box; this.strip = strip;
    this.paras = []; this.paraOff = []; this.chapters = []; this.text = '';
    this.mode = 'book'; this.index = 0; this.total = 1;
    this.avg = 0; this.calibN = 0; this.calibSum = 0;
    this.cur = null; this.cache = new Map(); this.hidden = false;
    this.W = 0; this.H = 0; this.pads = { top: 78, bot: 150, side: 20 };
    this.onUpdate = null; this.query = ''; this._flip = null;
    this.m = document.createElement('div');
    this.m.className = 'r-strip r-measure';
    this.vp.appendChild(this.m);
    this._tops = []; this._chunkEnd = 0; this._chunkStart = 0; this._scrollOff = 0; this._raf = 0;
  }
  setText(raw) {
    const t = raw.replace(/\r\n?/g, '\n').replace(/\u00A0/g, ' ').trim();
    const lines = t.split('\n');
    const blanks = lines.filter(l => !l.trim()).length;
    let blocks = blanks > lines.length * 0.12 ? t.split(/\n\s*\n+/) : lines;
    blocks = blocks.map(b => b.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    const CH = /^(глава|chapter|часть|пролог|эпилог|том|книга|арка|интерлюдия)\b|^\d{1,4}[.)]?\s*$|^\d{1,4}[.)]\s+\S|^[IVXLC]{1,7}[.)]\s/i;
    this.paras = []; this.paraOff = []; this.chapters = [];
    let off = 0;
    blocks.forEach(b => {
      const isCh = b.length <= 90 && CH.test(b);
      this.paras.push({ t: b, ch: isCh });
      this.paraOff.push(off);
      if (isCh) this.chapters.push({ title: b, off });
      off += b.length + 2;
    });
    this.text = blocks.join('\n\n');
    if (!this.chapters.length && this.paras.length) this.chapters.push({ title: 'Начало', off: 0 });
    const marks = NR.Data && NR.Data.chaptersForText ? NR.Data.chaptersForText(raw) : null;
    if (marks && marks.length) {
      this.chapters = [];
      marks.forEach(m => {
        const p = this.paras[m.para];
        if (!p) return;
        p.ch = true;
        this.chapters.push({ title: m.title || p.t, off: this.paraOff[m.para] });
      });
      if (!this.chapters.length && this.paras.length) this.chapters.push({ title: 'Начало', off: 0 });
    }
    this.invalidate(); this.index = 0; this.cur = null; this._scrollOff = 0;
  }
  invalidate() { this.cache.clear(); this.avg = 0; this.calibN = 0; this.calibSum = 0; }
  applySettings(s) {
    this.settings = s; this.mode = s.mode;
    const fonts = {
      serif: "Georgia,'Times New Roman',serif",
      sans: "-apple-system,'Segoe UI',Roboto,Arial,sans-serif",
      palatino: "'Palatino Linotype','Book Antiqua',Georgia,serif",
      mono: "'Courier New',monospace",
      custom: "'HanamiCustom',Georgia,serif"
    };
    const st = this.vp.style;
    this.vp.dataset.mode = s.mode; this.vp.dataset.rt = s.rtheme;
    st.setProperty('--rff', fonts[s.font] || fonts.serif);
    st.setProperty('--rfs', s.size + 'px');
    st.setProperty('--rfw', s.weight);
    st.setProperty('--rlh', s.lh);
    st.setProperty('--ral', s.align);
    if (s.bg) st.setProperty('--rt-bg', s.bg); else st.removeProperty('--rt-bg');
    if (s.text) st.setProperty('--rt-text', s.text); else st.removeProperty('--rt-text');
  }
  measurePads() {
    const cs = getComputedStyle(this.vp);
    return {
      top: this.hidden ? 0 : (parseInt(cs.getPropertyValue('--pad-top')) || 78),
      bot: this.hidden ? 0 : (parseInt(cs.getPropertyValue('--pad-bot')) || 150),
      side: this.settings.margins ? Math.max(18, Math.round(this.vp.clientWidth * 0.055)) : 10
    };
  }
  layout(off) {
    if (!this.paras.length) return;
    this.pads = this.measurePads();
    this.W = Math.max(120, this.vp.clientWidth - this.pads.side * 2);
    this.H = Math.max(120, this.vp.clientHeight - this.pads.top - this.pads.bot);
    this.m.style.width = this.W + 'px';
    if (this.mode === 'scroll') this.layoutScroll(off != null ? off : this._scrollOff);
    else this.layoutPaged(off != null ? off : (this.cur ? this.cur.start : 0));
  }
  /* ── постраничный режим ── */
  layoutPaged(start) {
    this.vp.style.overflowY = 'hidden';
    this.box.style.margin = '0';
    this.box.style.left = this.pads.side + 'px';
    this.box.style.top = this.pads.top + 'px';
    this.strip.style.width = this.W + 'px';
    this.strip.style.height = this.H + 'px';
    this.strip.style.transform = 'none';
    this.strip.style.transition = 'none';
    this.vp.scrollTop = 0;
    const rec = this.buildPage(start);
    this.cur = rec;
    this.renderPage(rec);
    this.calibrate(rec);
    this.recomputeTotal();
    this.emit();
  }
  makeP(pi, a, b, plain) {
    const p = this.paras[pi];
    const el = document.createElement('p');
    if (p.ch && a === 0) el.className = 'r-ch';
    el.dataset.p = pi; el.dataset.a = a;
    const txt = p.t.slice(a, b);
    if (!plain && this.query) this.marked(el, txt);
    else el.textContent = txt;
    return el;
  }
  marked(el, txt) {
    const q = this.query.toLowerCase();
    let i = 0, low = txt.toLowerCase();
    while (true) {
      const k = low.indexOf(q, i);
      if (k === -1) { el.appendChild(document.createTextNode(txt.slice(i))); break; }
      if (k > i) el.appendChild(document.createTextNode(txt.slice(i, k)));
      const mk = document.createElement('mark');
      mk.className = 'r-hit'; mk.textContent = txt.slice(k, k + q.length);
      el.appendChild(mk);
      i = k + q.length;
    }
  }
  buildPage(start) {
    start = NR.U.clamp(start, 0, Math.max(0, this.text.length - 1));
    let pi = this.paraAt(start), local = start - this.paraOff[pi];
    const items = [];
    this.m.innerHTML = '';
    let guard = 0, end = start;
    while (pi < this.paras.length && guard++ < 500) {
      const p = this.paras[pi];
      const el = this.makeP(pi, local, p.t.length, true);
      this.m.appendChild(el);
      if (this.m.scrollHeight <= this.H + 1) {
        items.push({ p: pi, a: local, b: p.t.length });
        end = Math.min(this.text.length, this.paraOff[pi] + p.t.length + 2);
        pi++; local = 0;
      } else {
        this.m.removeChild(el);
        if (items.length) break;
        const fit = this.fitSlice(pi, local);
        items.push({ p: pi, a: local, b: local + fit });
        end = this.paraOff[pi] + local + fit;
        break;
      }
    }
    if (!items.length) {
      const p = this.paras[pi];
      const b = Math.min(p.t.length, local + 60);
      items.push({ p: pi, a: local, b });
      end = this.paraOff[pi] + b;
    }
    this.m.innerHTML = '';
    return { start, end, items };
  }
  fitSlice(pi, local) {
    const t = this.paras[pi].t;
    let lo = 1, hi = t.length - local;
    const fits = n => {
      this.m.innerHTML = '';
      this.m.appendChild(this.makeP(pi, local, local + n, true));
      return this.m.scrollHeight <= this.H + 1;
    };
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (fits(mid)) lo = mid; else hi = mid - 1; }
    let n = lo;
    const sp = t.lastIndexOf(' ', local + n);
    if (sp > local + 10) n = sp - local;
    return Math.max(1, n);
  }
  renderInto(el, rec) {
    el.innerHTML = '';
    rec.items.forEach(it => el.appendChild(this.makeP(it.p, it.a, it.b, false)));
  }
  renderPage(rec) { this.renderInto(this.strip, rec); }
  rerender() { if (this.cur && this.mode !== 'scroll') this.renderPage(this.cur); }
  calibrate(rec) {
    if (this.calibN < 5) {
      this.calibSum += Math.max(1, rec.end - rec.start);
      this.calibN++;
      this.avg = Math.max(200, Math.round(this.calibSum / this.calibN));
    }
  }
  recomputeTotal() {
    const a = this.avg || 1200;
    this.total = Math.max(this.index + 1, Math.ceil(this.text.length / a));
  }
  goOffset(off, index, anim = false, dir = 0) {
    off = NR.U.clamp(off, 0, Math.max(0, this.text.length - 1));
    if (this.mode === 'scroll') { this.scrollToOffset(off); return; }
    const old = this.cur;
    const rec = this.buildPage(off);
    const ni = index != null ? index : this.index;
    const doFlip = anim && this.mode === 'book' && old && NR.Store.s.anim &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doFlip) this.flip(rec, dir || (ni > this.index ? 1 : -1));
    else this.renderPage(rec);
    this.cur = rec; this.index = ni;
    this.cache.set(ni, rec);
    if (this.cache.size > 400) this.cache.delete(this.cache.keys().next().value);
    this.calibrate(rec); this.recomputeTotal(); this.emit();
  }
  next() {
    if (this.mode === 'scroll') { this.vp.scrollBy({ top: this.H * 0.9, behavior: 'smooth' }); return; }
    if (this.cur.end >= this.text.length) { this.emit(); return; }
    this.goOffset(this.cur.end, this.index + 1, true, 1);
  }
  prev() {
    if (this.mode === 'scroll') { this.vp.scrollBy({ top: -this.H * 0.9, behavior: 'smooth' }); return; }
    if (this.index <= 0 && this.cur.start <= 0) { this.emit(); return; }
    const c = this.cache.get(this.index - 1);
    if (c) this.goOffset(c.start, this.index - 1, true, -1);
    else this.goOffset(Math.max(0, this.cur.start - (this.avg || 1200)), this.index - 1, true, -1);
  }
  flip(rec, dir) {
    if (this._flip) this._flip.finish();
    const layer = document.createElement('div');
    layer.className = 'r-flip';
    layer.style.cssText = `left:${this.pads.side}px;top:${this.pads.top}px;width:${this.W}px;height:${this.H}px;`;
    const inner = document.createElement('div');
    inner.style.cssText = 'position:absolute;inset:0;overflow:hidden;backface-visibility:hidden;transform-style:preserve-3d;';
    const clone = this.strip.cloneNode(true);
    clone.style.width = this.W + 'px'; clone.style.height = this.H + 'px';
    const shade = document.createElement('div'); shade.className = 'shade';
    const next = dir > 0;
    if (next) {
      inner.appendChild(clone); inner.appendChild(shade);
      layer.appendChild(inner); this.vp.appendChild(layer);
      this.renderPage(rec);
      inner.style.transformOrigin = 'left center';
    } else {
      this.renderInto(clone, rec);
      inner.appendChild(clone); inner.appendChild(shade);
      layer.appendChild(inner); this.vp.appendChild(layer);
      inner.style.transformOrigin = 'right center';
    }
    const kf = next
      ? [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-108deg)' }]
      : [{ transform: 'rotateY(108deg)' }, { transform: 'rotateY(0deg)' }];
    const anim = inner.animate(kf, { duration: 380, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
    shade.animate([{ opacity: next ? 0 : .5 }, { opacity: next ? .5 : 0 }], { duration: 380, fill: 'forwards' });
    const done = () => {
      layer.remove(); this._flip = null;
      if (!next) this.renderPage(rec);
    };
    anim.onfinish = done; anim.oncancel = done;
    this._flip = { finish: () => { try { anim.finish(); } catch (e) { done(); } } };
  }
  drag(dx) {
    if (this.mode === 'scroll' || !this.cur) return;
    let d = dx;
    if ((this.cur.start <= 0 && dx > 0) || (this.cur.end >= this.text.length && dx < 0)) d = dx * 0.3;
    this.strip.style.transition = 'none';
    this.strip.style.transform = `translateX(${d}px)`;
  }
  endDrag(dx, dt) {
    if (this.mode === 'scroll') return;
    this.strip.style.transform = 'none';
    const th = this.W * 0.18;
    const fast = Math.abs(dx) / Math.max(1, dt) > 0.5 && Math.abs(dx) > 24;
    if (dx < -th || (fast && dx < 0)) this.next();
    else if (dx > th || (fast && dx > 0)) this.prev();
  }
  /* ── режим «свиток»: обычный скролл, порциями ── */
  layoutScroll(off) {
    this.vp.style.overflowY = 'auto';
    this.box.style.left = ''; this.box.style.top = '';
    this.box.style.margin = `${this.pads.top}px ${this.pads.side}px ${this.pads.bot}px`;
    this.strip.style.width = 'auto'; this.strip.style.height = 'auto';
    this.strip.style.transform = 'none';
    this._tops = []; this._chunkStart = 0; this._chunkEnd = 0;
    this.strip.innerHTML = '';
    const pi = this.paraAt(off);
    this.appendChunk(Math.max(0, pi - 6), 90);
    const target = this.strip.querySelector(`[data-p="${pi}"]`);
    this.vp.scrollTop = target ? Math.max(0, target.offsetTop - 4) : 0;
    this.syncScroll(true);
  }
  appendChunk(from, count) {
    const frag = document.createDocumentFragment();
    const end = Math.min(this.paras.length, from + count);
    for (let i = from; i < end; i++) {
      const el = this.makeP(i, 0, this.paras[i].t.length, false);
      frag.appendChild(el);
      this._tops.push({ top: 0, off: this.paraOff[i], el });
    }
    this.strip.appendChild(frag);
    this._chunkStart = this._chunkStart || from;
    this._chunkEnd = end;
    this._tops.forEach(t => { t.top = t.el.offsetTop; });
  }
  syncScroll(force) {
    if (this.mode !== 'scroll') return;
    if (this._raf && !force) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      const st = this.vp.scrollTop;
      if (st + this.vp.clientHeight > this.strip.scrollHeight - 700 && this._chunkEnd < this.paras.length) {
        this.appendChunk(this._chunkEnd, 90);
      }
      let lo = 0, hi = this._tops.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this._tops[mid].top <= st + 2) lo = mid; else hi = mid - 1; }
      this._scrollOff = this._tops.length ? this._tops[lo].off : 0;
      this.index = Math.floor(st / Math.max(1, this.H));
      this.total = Math.max(1, Math.ceil(this.strip.scrollHeight / Math.max(1, this.H)));
      this.emit();
    });
  }
  scrollToOffset(off) {
    const pi = this.paraAt(off);
    if (pi < this._chunkStart || pi > this._chunkEnd + 400) {
      this._tops = []; this._chunkStart = 0; this._chunkEnd = 0;
      this.strip.innerHTML = '';
      this.appendChunk(Math.max(0, pi - 6), 90);
    } else {
      while (pi >= this._chunkEnd && this._chunkEnd < this.paras.length) this.appendChunk(this._chunkEnd, 90);
    }
    const el = this.strip.querySelector(`[data-p="${pi}"]`);
    this.vp.scrollTop = el ? Math.max(0, el.offsetTop - 4) : 0;
    this.syncScroll(true);
  }
  /* ── общее ── */
  paraAt(off) {
    let lo = 0, hi = this.paras.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this.paraOff[mid] <= off) lo = mid; else hi = mid - 1; }
    return lo;
  }
  get offset() { return this.mode === 'scroll' ? this._scrollOff : (this.cur ? this.cur.start : 0); }
  viewRange() {
    if (this.mode === 'scroll') return [this._scrollOff, this._scrollOff + 600];
    return this.cur ? [this.cur.start, this.cur.end] : [0, 0];
  }
  pageIndexOfOffset(off) {
    for (const [i, r] of this.cache) if (off >= r.start && off < r.end) return i;
    return Math.floor(off / Math.max(200, this.avg || 1200));
  }
  offsetOfIndex(i) {
    const c = this.cache.get(i);
    if (c) return c.start;
    return NR.U.clamp(i * (this.avg || 1200), 0, Math.max(0, this.text.length - 1));
  }
  chapterOf(off) {
    let idx = 0;
    this.chapters.forEach((c, i) => { if (c.off <= off) idx = i; });
    return idx;
  }
  offsetFromNode(node, local) {
    let el = node;
    while (el && el.tagName !== 'P') el = el.parentElement;
    if (!el || el.dataset.p === undefined) return this.offset;
    return this.paraOff[+el.dataset.p] + (+el.dataset.a || 0) + local;
  }
  setQuery(q) { this.query = q || ''; this.rerender(); }
  emit() { this.onUpdate && this.onUpdate(); }
  destroy() {
    if (this._flip) this._flip.finish();
    if (this._raf) cancelAnimationFrame(this._raf);
    this.m.remove();
    this.paras = []; this.cache.clear(); this.strip.innerHTML = '';
  }
};
