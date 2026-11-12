const path = require('path');
const fs = require('fs');
try { for (const l of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; } } catch {}
const root = path.join(__dirname, '..');
module.exports = {
  root,
  W: 1080, H: 1350,                       // 4:5
  font: { size: 33, minSize: 26, lineHeight: 1.38, maxLines: 2, textWidth: 730 },
  fonts: { arabic: path.join(root, 'fonts', 'GESSTwoLight.otf'), latin: path.join(root, 'fonts', 'Tajawal-Light.ttf') },
  templates: JSON.parse(fs.readFileSync(path.join(root, 'templates', 'templates.json'), 'utf8')),
  jpegQuality: 95,
  env: process.env,
};
