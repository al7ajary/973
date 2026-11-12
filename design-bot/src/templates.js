const cfg = require('./config');
const norm = s => s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase().trim();

// "خبر: العنوان" أو "تهنئة - العنوان" => { key, title }
function parseCaption(caption = '') {
  let c = caption.trim(); let enhance = true;
  if (/بدون\s*تحسين/.test(c)) { enhance = false; c = c.replace(/بدون\s*تحسين/g, '').trim(); }
  const m = c.match(/^(\S+)\s*[:：\-–—،,]?\s*([\s\S]*)$/);
  if (!m) return { key: null, title: '', enhance };
  const word = norm(m[1]);
  for (const [key, t] of Object.entries(cfg.templates)) if (t.aliases.some(a => norm(a) === word)) return { key, title: m[2].trim(), enhance };
  return { key: null, title: c, enhance };
}
const names = () => Object.values(cfg.templates).map(t => t.aliases[0]).join(' / ');
module.exports = { parseCaption, names };
