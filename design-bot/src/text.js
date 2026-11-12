const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const cfg = require('./config');
GlobalFonts.registerFromPath(cfg.fonts.arabic, 'GEAr');
GlobalFonts.registerFromPath(cfg.fonts.latin, 'TJ');

const toLatinDigits = s => s
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const LATIN = /([A-Za-z0-9]+(?:[.,:\/\-][A-Za-z0-9]+)*%?)/;

const probe = createCanvas(10, 10).getContext('2d');

// كلمة -> مقاطع (عربي بخط GE، أرقام/لاتيني بخط Tajawal)
const segs = w => w.split(LATIN).filter(Boolean).map(t => ({ t, latin: LATIN.test(t) && /^[A-Za-z0-9]/.test(t) }));
const fontOf = (s, size) => `${size}px ${s.latin ? 'TJ' : 'GEAr'}`;

function measure(words, size) {
  probe.font = `${size}px GEAr`;
  const space = probe.measureText(' ').width || size * 0.28;
  return {
    space,
    words: words.map(w => {
      const parts = segs(w).map(s => { probe.font = fontOf(s, size); probe.direction = s.latin ? 'ltr' : 'rtl'; return { ...s, w: probe.measureText(s.t).width }; });
      return { parts, w: parts.reduce((a, p) => a + p.w, 0) };
    }),
  };
}

function wrap(m, maxW) {
  const lines = []; let cur = [], curW = 0;
  for (const w of m.words) {
    const add = cur.length ? m.space + w.w : w.w;
    if (cur.length && curW + add > maxW) { lines.push({ ws: cur, w: curW }); cur = [w]; curW = w.w; } else { cur.push(w); curW += add; }
  }
  if (cur.length) lines.push({ ws: cur, w: curW });
  return lines;
}

// أصغر عرض يحقق نفس عدد الأسطر => أسطر متوازنة بدون كلمة يتيمة
function balanced(m, maxW) {
  const n = wrap(m, maxW).length; let lo = 0, hi = maxW;
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; wrap(m, mid).length <= n ? (hi = mid) : (lo = mid); }
  return wrap(m, hi);
}

function layout(title) {
  const words = toLatinDigits(title).trim().split(/\s+/);
  const { size: s0, minSize, maxLines, textWidth } = cfg.font;
  for (let s = s0; s >= minSize; s -= 0.5) {
    const m = measure(words, s);
    if (wrap(m, textWidth).length <= maxLines) return { size: s, m, lines: balanced(m, textWidth), overflow: false };
  }
  const m = measure(words, minSize);
  const lines = balanced(m, textWidth);
  return { size: minSize, m, lines, overflow: lines.length > maxLines + 1 };
}

// يرسم النص على طبقة شفافة بحجم التصميم كامل
function renderTitle(title, box) {
  const c = createCanvas(cfg.W, cfg.H); const g = c.getContext('2d');
  const { size, m, lines, overflow } = layout(title);
  const lh = size * cfg.font.lineHeight, cx = box.x + box.w / 2;
  const top = box.y + box.h / 2 - (lines.length * lh) / 2;
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
  lines.forEach((ln, i) => {
    let xr = cx + ln.w / 2; const y = top + lh * (i + 0.5);
    ln.ws.forEach((w, wi) => {
      if (wi) xr -= m.space;
      for (const p of w.parts) { xr -= p.w; g.font = fontOf(p, size); g.direction = p.latin ? 'ltr' : 'rtl'; g.fillText(p.t, xr, y); }
    });
  });
  return { png: c.toBuffer('image/png'), size, lines: lines.length, overflow };
}

module.exports = { renderTitle, toLatinDigits };
