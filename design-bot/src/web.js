// صفحة ويب: node src/web.js
const http = require('http'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const cfg = require('./config'); const { cover, plain } = require('./compose'); const { check } = require('./spell');
const { PAGE_PIN, PORT } = cfg.env;
if (!PAGE_PIN) { console.error('PAGE_PIN ناقص في .env'); process.exit(1); }
const token = crypto.createHmac('sha256', PAGE_PIN).update('bpc-page').digest('hex');
const tries = new Map();
const html = fs.readFileSync(path.join(cfg.root, 'public', 'index.html'));
const authed = req => (req.headers.cookie || '').split(/;\s*/).some(c => c === 's=' + token);
const send = (res, code, obj, h = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...h }); res.end(JSON.stringify(obj)); };
const body = req => new Promise((ok, no) => { let n = 0; const a = []; req.on('data', d => { n += d.length; if (n > 60e6) { no(new Error('big')); req.destroy(); } else a.push(d); }); req.on('end', () => { try { ok(JSON.parse(Buffer.concat(a) || '{}')); } catch (e) { no(e); } }); });
const buf = u => Buffer.from(u.split(',').pop(), 'base64');

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); return res.end(html); }
    if (req.url === '/api/login') {
      const ip = req.socket.remoteAddress, t = (tries.get(ip) || []).filter(x => Date.now() - x < 60e3);
      if (t.length >= 5) return send(res, 429, { error: 'محاولات كثيرة، انتظر دقيقة' });
      const { pin } = await body(req); tries.set(ip, [...t, Date.now()]);
      const ok = pin && crypto.timingSafeEqual(crypto.createHash('sha256').update(String(pin)).digest(), crypto.createHash('sha256').update(PAGE_PIN).digest());
      return ok ? send(res, 200, { ok: 1 }, { 'set-cookie': `s=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000` }) : send(res, 401, { error: 'الرمز غير صحيح' });
    }
    if (!authed(req)) return send(res, 401, { error: 'login' });
    if (req.url === '/api/config') return send(res, 200, { templates: Object.entries(cfg.templates).map(([k, t]) => ({ key: k, name: t.aliases[0] })) });
    if (req.url === '/api/spell') { const { title } = await body(req); try { return send(res, 200, { result: await check(title) }); } catch (e) { return send(res, 200, { result: null, error: 'تعذر الفحص' }); } }
    if (req.url === '/api/render') {
      const { template, title, enhance = true, images } = await body(req);
      if (!cfg.templates[template] || !title || !images?.length) return send(res, 400, { error: 'بيانات ناقصة' });
      const o = { doEnhance: !!enhance }, b = images.map(buf);
      const first = await cover(b[0], template, title, o), rest = await Promise.all(b.slice(1).map(x => plain(x, o)));
      return send(res, 200, { images: [first.buf, ...rest].map(x => 'data:image/jpeg;base64,' + x.toString('base64')), overflow: first.info.overflow });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { console.error(e); send(res, 500, { error: 'خطأ بالسيرفر' }); }
}).listen(PORT || 3000, () => console.log('page on', PORT || 3000));
