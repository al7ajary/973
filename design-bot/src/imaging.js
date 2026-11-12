const sharp = require('sharp');
const { W, H } = require('./config');

// تحسين خفيف ونظيف: تعديل إضاءة محدود + لمسة تباين وألوان + حدة بسيطة. بدون تنعيم أو فلاتر.
// حدود صغيرة عمداً حتى لا يتغير لون البشرة أو خلفية الصورة.
async function enhance(input) {
  const img = sharp(input, { failOn: 'none' }).rotate();            // يحترم اتجاه EXIF
  const stats = await img.clone().stats();
  const lum = stats.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
  const bright = Math.min(1.06, Math.max(0.96, 125 / Math.max(lum, 1)));   // ±5% فقط
  return img
    .modulate({ brightness: bright, saturation: 1.04 })
    .linear(1.04, -4)                                                // تباين خفيف
    .sharpen({ sigma: 0.6, m1: 0.7, m2: 1.0 })
    .toBuffer();
}

// قص ذكي لـ 4:5 (sharp.attention يركز على الأجزاء الأبرز في الصورة)
async function toPortrait(input, { doEnhance = true } = {}) {
  const buf = doEnhance ? await enhance(input) : await sharp(input, { failOn: 'none' }).rotate().toBuffer();
  return sharp(buf).resize(W, H, { fit: 'cover', position: sharp.strategy.attention, kernel: 'lanczos3' }).toBuffer();
}

module.exports = { enhance, toPortrait };
