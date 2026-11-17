const http = require('http');
const { Bot, InlineKeyboard, InputFile, webhookCallback } = require('grammy');
const cfg = require('./config');
const { parseCaption, names } = require('./templates');
const { check } = require('./spell');
const { cover, plain } = require('./compose');

const { BOT_TOKEN, ALLOWED_USERS, WEBHOOK_URL, WEBHOOK_SECRET, PORT } = cfg.env;
if (!BOT_TOKEN) { console.error('BOT_TOKEN ناقص في .env'); process.exit(1); }
const allowed = new Set((ALLOWED_USERS || '').split(',').map(s => s.trim()).filter(Boolean));
const bot = new Bot(BOT_TOKEN);

const jobs = new Map();      // jobId -> { chat, files, key, title, enhance, fixed }
const waiting = new Map();   // chatId -> { type:'text'|'edit', jobId }
const albums = new Map();    // media_group_id -> { files, caption, timer }
let seq = 0;

bot.use(async (ctx, next) => {
  const id = String(ctx.from?.id || '');
  if (!allowed.size || !allowed.has(id)) return ctx.reply(`غير مصرح. آيديك: ${id}\nأضفه إلى ALLOWED_USERS.`);
  return next();
});

bot.command('start', ctx => ctx.reply(
  `ارسل صورة (أو عدة صور) مع كابشن:\n«${names()}: العنوان»\n\n` +
  `• أكثر من صورة = كاروسيل: الأولى غلاف بالقالب والعنوان، والباقي يتغير مقاسه لـ 4:5.\n` +
  `• لأفضل جودة ارسلها كـ File (بدون ضغط تيلقرام).\n` +
  `• لفحص الإملاء قبل التصميم اكتب «افحص» في الكابشن.\n• لإيقاف تحسين الألوان اكتب «بدون تحسين» في الكابشن.`));

// ---- استقبال الصور ----
const imageOf = m => m.photo ? { id: m.photo.at(-1).file_id } : (m.document?.mime_type?.startsWith('image/') ? { id: m.document.file_id } : null);
bot.on(['message:photo', 'message:document'], async ctx => {
  const m = ctx.message, f = imageOf(m); if (!f) return;
  const gid = m.media_group_id;
  if (!gid) return startJob(ctx, [f.id], m.caption);
  const a = albums.get(gid) || { files: [], caption: '' };
  a.files.push({ id: f.id, order: m.message_id }); if (m.caption) a.caption = m.caption;
  clearTimeout(a.timer);
  a.timer = setTimeout(() => { albums.delete(gid); startJob(ctx, a.files.sort((x, y) => x.order - y.order).map(x => x.id), a.caption); }, 1500);
  albums.set(gid, a);
});

async function startJob(ctx, files, caption) {
  const p = parseCaption(caption);
  const id = String(++seq); const job = { id, chat: ctx.chat.id, files, key: p.key, title: p.title, enhance: p.enhance, spell: p.spell || cfg.env.SPELL_DEFAULT === 'on' };
  jobs.set(id, job); setTimeout(() => jobs.delete(id), 3600e3);
  if (!job.key || !job.title) { waiting.set(ctx.chat.id, { type: 'text', jobId: id }); return ctx.reply(`اكتب نوع القالب والعنوان:\n«${names()}: العنوان»`); }
  return proofread(ctx, job);
}

// ---- فحص الإملاء قبل التصميم ----
async function proofread(ctx, job) {
  if (!job.spell) return render(ctx, job);
  let res = null;
  try { res = await check(job.title); } catch (e) { console.error(e); await ctx.reply('تعذر فحص الإملاء، أكمل بنصك كما هو.'); }
  if (!res) return render(ctx, job);
  job.fixed = res.corrected;
  const list = res.changes.map(c => `• ${c.from} ← ${c.to}`).join('\n');
  return ctx.reply(`لقيت ملاحظات في النص:\n${list}\n\nالنص بعد التصحيح:\n${res.corrected}`,
    { reply_markup: new InlineKeyboard().text('✅ اعتمد التصحيح', `sp:ok:${job.id}`).row().text('✏️ أعدّل بنفسي', `sp:edit:${job.id}`).row().text('➡️ كلامي كما هو', `sp:keep:${job.id}`) });
}

bot.callbackQuery(/^sp:(ok|edit|keep):(\d+)$/, async ctx => {
  const [, act, id] = ctx.match; const job = jobs.get(id);
  await ctx.answerCallbackQuery(); if (!job) return ctx.reply('انتهت صلاحية الطلب، ارسل الصور من جديد.');
  await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
  if (act === 'edit') { waiting.set(ctx.chat.id, { type: 'edit', jobId: id }); return ctx.reply('اكتب النص النهائي:'); }
  if (act === 'ok') job.title = job.fixed;
  return render(ctx, job);
});

bot.on('message:text', async ctx => {
  const w = waiting.get(ctx.chat.id); if (!w) return;
  const job = jobs.get(w.jobId); waiting.delete(ctx.chat.id);
  if (!job) return ctx.reply('انتهت صلاحية الطلب، ارسل الصور من جديد.');
  if (w.type === 'edit') { job.title = ctx.message.text.trim(); return render(ctx, job); }
  const p = parseCaption(ctx.message.text);
  if (!p.key || !p.title) { waiting.set(ctx.chat.id, w); return ctx.reply(`ما فهمت. اكتب: «${names()}: العنوان»`); }
  Object.assign(job, { key: p.key, title: p.title, enhance: p.enhance && job.enhance, spell: p.spell || job.spell });
  return proofread(ctx, job);
});

// ---- التصميم والإرسال ----
async function download(fileId) {
  const f = await bot.api.getFile(fileId);
  const r = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${f.file_path}`);
  if (!r.ok) throw new Error('download ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}
async function render(ctx, job) {
  try {
    await ctx.reply('جاري التصميم…');
    const opts = { doEnhance: job.enhance };
    const bufs = await Promise.all(job.files.map(download));
    const first = await cover(bufs[0], job.key, job.title, opts);
    const rest = await Promise.all(bufs.slice(1).map(b => plain(b, opts)));
    const all = [first.buf, ...rest].map((b, i) => new InputFile(b, `post-${job.id}-${i + 1}.jpg`));
    if (all.length === 1) await ctx.replyWithDocument(all[0]);
    else await ctx.replyWithMediaGroup(all.map(media => ({ type: 'document', media })));
    if (first.info.overflow) await ctx.reply('⚠️ العنوان طويل جداً، ممكن ما يتسع بشكل مريح. اختصره لو تبي.');
  } catch (e) { console.error(e); await ctx.reply('صار خطأ بالتصميم، جرب مرة ثانية.'); }
  jobs.delete(job.id);
}

bot.catch(e => console.error('bot error', e.error || e));

// إعداد البوت في تيلقرام تلقائياً (الأوامر والوصف) + تشغيل السيرفر
async function setup() {
  try {
    await bot.api.setMyCommands([{ command: 'start', description: 'طريقة الاستخدام' }]);
    await bot.api.setMyShortDescription('مصمم بوستات اللجنة البارالمبية البحرينية');
    await bot.api.setMyDescription('أرسل صورة مع كابشن مثل «خبر: العنوان» أو «تهنئة: العنوان»، وأرجع لك التصميم جاهز بمقاس 4:5. أكثر من صورة = كاروسيل.');
  } catch (e) { console.error('setup', e.description || e.message); }
}
const port = PORT || 3000;
if (WEBHOOK_URL) {
  const handle = webhookCallback(bot, 'http', { secretToken: WEBHOOK_SECRET });
  http.createServer((req, res) => req.url === '/tg' && req.method === 'POST' ? handle(req, res) : (res.writeHead(200), res.end('BPC bot is running')))
    .listen(port, async () => {
      console.log('webhook server on', port); await setup();
      try { await bot.api.setWebhook(WEBHOOK_URL.replace(/\/$/, '') + '/tg', { secret_token: WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'] }); console.log('webhook set'); }
      catch (e) { console.error('setWebhook', e.description || e.message); }
    });
} else {
  // بدون رابط: يشتغل بطريقة Polling، والسيرفر يرد بس عشان الاستضافة تعرف إن التطبيق شغال
  http.createServer((req, res) => { res.writeHead(200); res.end('BPC bot is running'); }).listen(port);
  setup().then(() => bot.api.deleteWebhook()).catch(() => {}).finally(() => bot.start({ onStart: () => console.log('polling…') }));
}
