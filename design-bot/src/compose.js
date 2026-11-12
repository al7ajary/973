const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const cfg = require('./config');
const { toPortrait } = require('./imaging');
const { renderTitle } = require('./text');

const tplBuf = {};
const template = key => tplBuf[key] ||= fs.readFileSync(path.join(cfg.root, 'templates', cfg.templates[key].file));
const jpeg = img => img.jpeg({ quality: cfg.jpegQuality, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer();

// الصورة الأولى = غلاف (خلفية + قالب + عنوان)
async function cover(photo, key, title, opts) {
  const base = await toPortrait(photo, opts);
  const t = renderTitle(title, cfg.templates[key].box);
  const out = await jpeg(sharp(base).composite([{ input: template(key) }, { input: t.png }]));
  return { buf: out, info: t };
}
// باقي صور الكاروسيل = تغيير مقاس فقط إلى 4:5
const plain = (photo, opts) => toPortrait(photo, opts).then(b => jpeg(sharp(b)));

module.exports = { cover, plain };
