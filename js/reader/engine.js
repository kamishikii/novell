/* движок страниц: раскладывает текст по страницам и умеет
   находить страницу любого места в тексте (для поиска, закладок, оглавления) */
NR.ReaderEngine = class {
  constructor(vp, pageBox, strip) {
    this.vp = vp; this.box = pageBox; this.strip = strip;
    this.paras = []; this.chapters = []; this.text = '';
    this.pages = 1; this.current = 0;
    this.W = 0; this.H = 0; this.G = 48;
    this.onPage = null; this.mode = 'book';
    this._flip = null;
  }
  /* разбор текста на абзацы и главы */
  setText(raw) {
    const t = raw.replace(/\r\n?/g, '\n').replace(/\u00A0/g, ' ').trim();
    const lines = t.split('\n');
    const blanks = lines.filter(l => !l.trim()).length;
    let blocks = blanks > lines.length * 0.12 ? t.split(/\n\s*\n+/) : lines;
    blocks = blocks.map(b => b.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    const CH = /^(глава|chapter|часть|пролог|эпилог|том|книга|арка|интерлюдия)\b|^\d{1,4}[.)]?\s*$|^\d{1,4}[.)]\s+\S|^[IVXLC]{1,7}[.)]\s/i;
    this.paras = []; this.chapters = [];
    let off = 0;
    const frag = document.createDocumentFragment();
    blocks.forEach(b => {
      const isCh = b.length <= 90 && CH.test(b);
      const p = document.createElement('p');
      if (isCh) p.className = 'r-ch';
      p.textContent = b;
      p.dataset.off = off;
      this.paras.push({ off, len: b.length, el: p, ch: isCh });
      if (isCh) this.chapters.push({ title: b, off });
      frag.appendChild(p);
      off += b.length + 2;
    });
    if (!this.chapters.length && this.paras.length) this.chapters.push({ title: 'Начало', off: 0 });
    this.text = blocks.join('\n\n');
    this.strip.innerHTML = '';
    this.strip.appendChild(frag);
  }
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
    this.vp.dataset.mode = s.mode;
    this.vp.dataset.rt = s.rtheme;
    st.setProperty('--rff', fonts[s.font] || fonts.serif);
    st.setProperty('--rfs', s.size + 'px');
    st.setProperty('--rfw', s.weight);
    st.setProperty('--rlh', s.lh);
    st.setProperty('--ral', s.align);
    st.setProperty('--rt-bg', s.bg || '');
    st.setProperty('--rt-text', s.text || '');
    if (!s.bg) st.removeProperty('--rt-bg');
    if (!s.text) st.removeProperty('--rt-text');
  }
  pads() {
    const cs = getComputedStyle(this.vp);
    return {
      top: parseInt(cs.getPropertyValue('--pad-top')) || 78,
      bot: parseInt(cs.getPropertyValue('--pad-bot')) || 150,
      side: this.settings.margins ? Math.max(18, Math.round(this.vp.clientWidth * 0.055)) : 10
    };
  }
  layout(keepOff) {
    if (!this.paras.length) return;
    const p = this.pads();
    this.vp.style.setProperty('--pad-side', p.side + 'px');
    this.W = Math.max(120, this.vp.clientWidth - p.side * 2);
    this.H = Math.max(120, this.vp.clientHeight - p.top - p.bot);
    const strip = this.strip, box = this.box;
    strip.style.transition = 'none';
    strip.style.width = this.W + 'px';
    if (this.mode === 'scroll') {
      strip.style.height = 'auto';
      strip.style.columnWidth = 'auto'; strip.style.columnGap = 'normal';
      strip.style.transform = 'none';
      box.style.left = ''; box.style.top = '';
      box.style.margin = `${p.top}px ${p.side}px ${p.bot}px`;
      this.pages = Math.max(1, Math.ceil(strip.scrollHeight / this.H));
    } else {
      box.style.margin = '0';
      box.style.left = p.side + 'px'; box.style.top = p.top + 'px';
      strip.style.height = this.H + 'px';
      strip.style.columnWidth = this.W + 'px';
      strip.style.columnGap = this.G + 'px';
      this.pages = Math.max(1, Math.round((strip.scrollWidth + this.G) / (this.W + this.G)));
    }
    const off = keepOff != null ? keepOff : this.offsetOfPage(this.current);
    this.goPage(this.pageOfOffset(off), false);
    return p;
  }
  /* где начинается абзац с этим смещением */
  locate(off) {
    off = NR.U.clamp(off, 0, Math.max(0, this.text.length - 1));
    let lo = 0, hi = this.paras.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.paras[mid].off <= off) lo = mid; else hi = mid - 1;
    }
    const p = this.paras[lo];
    const local = NR.U.clamp(off - p.off, 0, Math.max(0, p.len - 1));
    return { para: p, node: p.el.firstChild, local };
  }
  rangeFor(off, len = 1) {
    const a = this.locate(off), b = this.locate(off + Math.max(1, len) - 1);
    const r = document.createRange();
    try {
      r.setStart(a.node, a.local);
      r.setEnd(b.node, Math.min(b.local + 1, b.node.length));
    } catch (e) { return null; }
    return r;
  }
  pageOfOffset(off) {
    if (!this.paras.length) return 0;
    const r = this.rangeFor(off, 1);
    if (!r) return 0;
    const rect = r.getBoundingClientRect();
    const base = this.strip.getBoundingClientRect();
    let pg;
    if (this.mode === 'scroll') pg = Math.floor((rect.top - base.top) / this.H);
    else pg = Math.floor((rect.left - base.left + this.G / 2) / (this.W + this.G));
    return NR.U.clamp(pg, 0, this.pages - 1);
  }
  offsetOfPage(pg) {
    if (pg <= 0) return 0;
    if (pg >= this.pages) return this.text.length;
    let lo = 0, hi = this.text.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.pageOfOffset(mid) >= pg) hi = mid; else lo = mid + 1;
    }
    return lo;
  }
  chapterOf(off) {
    let idx = 0;
    this.chapters.forEach((c, i) => { if (c.off <= off) idx = i; });
    return idx;
  }
  x(pg) { return -(pg * (this.W + this.G)); }
  goPage(pg, anim = true, dir = 0) {
    pg = NR.U.clamp(pg, 0, this.pages - 1);
    const changed = pg !== this.current;
    if (this.mode === 'scroll') {
      this.vp.scrollTo({ top: pg * this.H, behavior: anim ? 'smooth' : 'auto' });
    } else {
      if (anim && this.mode === 'book' && changed && this.canFlip()) this.flip(pg, dir || (pg > this.current ? 1 : -1));
      else {
        this.strip.style.transition = anim && changed ? 'transform .28s cubic-bezier(.22,.8,.3,1)' : 'none';
        this.strip.style.transform = `translateX(${this.x(pg)}px)`;
      }
    }
    this.current = pg;
    this.onPage && this.onPage(pg, changed);
  }
  canFlip() {
    return NR.Store.s.anim && this.paras.length <= 2500 &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  /* перелистывание «как в книге» */
  flip(pg, dir) {
    if (this._flip) { this._flip.finish(); }
    const old = this.current;
    const p = this.pads();
    const layer = document.createElement('div');
    layer.className = 'r-flip';
    layer.style.cssText = `left:${p.side}px;top:${p.top}px;width:${this.W}px;height:${this.H}px;perspective:1200px;`;
    const clone = this.strip.cloneNode(true);
    clone.style.transition = 'none';
    const shade = document.createElement('div'); shade.className = 'shade';
    const inner = document.createElement('div');
    inner.style.cssText = 'position:absolute;inset:0;overflow:hidden;backface-visibility:hidden;transform-style:preserve-3d;';
    inner.appendChild(clone); inner.appendChild(shade);
    layer.appendChild(inner);
    const next = dir > 0;
    if (next) {
      clone.style.transform = `translateX(${this.x(old)}px)`;
      this.strip.style.transition = 'none';
      this.strip.style.transform = `translateX(${this.x(pg)}px)`;
      inner.style.transformOrigin = 'left center';
    } else {
      clone.style.transform = `translateX(${this.x(pg)}px)`;
      inner.style.transformOrigin = 'right center';
    }
    this.vp.appendChild(layer);
    const kf = next
      ? [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-108deg)' }]
      : [{ transform: 'rotateY(108deg)' }, { transform: 'rotateY(0deg)' }];
    const anim = inner.animate(kf, { duration: 420, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
    shade.animate([{ opacity: next ? 0 : .5 }, { opacity: next ? .5 : 0 }], { duration: 420, fill: 'forwards' });
    const done = () => {
      layer.remove(); this._flip = null;
      if (!next) { this.strip.style.transition = 'none'; this.strip.style.transform = `translateX(${this.x(pg)}px)`; }
    };
    anim.onfinish = done; anim.oncancel = done;
    this._flip = { finish: () => { try { anim.finish(); } catch (e) { done(); } } };
  }
  dragTo(dx) {
    if (this.mode === 'scroll') return;
    let d = dx;
    if ((this.current === 0 && dx > 0) || (this.current === this.pages - 1 && dx < 0)) d = dx * 0.3;
    this.strip.style.transition = 'none';
    this.strip.style.transform = `translateX(${this.x(this.current) + d}px)`;
  }
  endDrag(dx, dt) {
    const th = this.W * 0.18;
    const fast = Math.abs(dx) / Math.max(1, dt) > 0.5 && Math.abs(dx) > 24;
    if (dx < -th || (fast && dx < 0)) this.goPage(this.current + 1, true, 1);
    else if (dx > th || (fast && dx > 0)) this.goPage(this.current - 1, true, -1);
    else this.goPage(this.current, true);
  }
  syncScroll() {
    if (this.mode !== 'scroll') return;
    const pg = NR.U.clamp(Math.floor((this.vp.scrollTop + 2) / this.H), 0, this.pages - 1);
    if (pg !== this.current) { this.current = pg; this.onPage && this.onPage(pg, true); }
  }
  destroy() { if (this._flip) this._flip.finish(); this.paras = []; this.strip.innerHTML = ''; }
};
