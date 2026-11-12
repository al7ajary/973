// تجربة محلية بدون تيلقرام: node src/demo.js
const fs = require('fs'); const path = require('path');
const { cover, plain } = require('./compose');
const out = path.join(__dirname, '..', 'out'); fs.mkdirSync(out, { recursive: true });
const S = n => fs.readFileSync(path.join(__dirname, '..', 'samples', n));
(async () => {
  const t = 'علي القيدوم. يجهز سيارته المميزه للموسم و يتفاخر بالوصول الى ٦٩٠ حصان على الداينو ويتمنى ان يضبط التيون';
  fs.writeFileSync(path.join(out, '1-cover.jpg'), (await cover(S('photo1.jpg'), 'news', t, {})).buf);
  fs.writeFileSync(path.join(out, '2-carousel.jpg'), await plain(S('other-size.jpg'), {}));
  fs.writeFileSync(path.join(out, '3-short.jpg'), (await cover(S('other-size.jpg'), 'congrats', 'اللجنة البارالمبية البحرينية تهنئ الأمير عبدالعزيز بن تركي الفيصل', {})).buf);
  console.log('تم: out/');
})();
