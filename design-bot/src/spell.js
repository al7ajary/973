const { env } = require('./config');

// يرجع { corrected, changes:[{from,to}] } أو null لو ما في مشاكل / ما في مفتاح
async function check(text) {
  if (!env.ANTHROPIC_API_KEY) return null;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || 'claude-haiku-5-5', max_tokens: 600,
      system: 'مدقق إملائي عربي لعناوين صور إخبارية. صحح فقط: الهمزات (أ/إ/ا)، التاء المربوطة/الهاء، الألف المقصورة، الأخطاء الإملائية الواضحة، علامات الترقيم الزائدة. ممنوع تغيير الصياغة أو المعنى أو الأسماء أو الأرقام أو ترتيب الكلمات. أرجع JSON فقط بالشكل: {"corrected":"...","changes":[{"from":"...","to":"..."}]}. لو النص سليم أرجع changes فاضية.',
      messages: [{ role: 'user', content: text }],
    }),
  });
  if (!r.ok) throw new Error('spell api ' + r.status);
  const out = (await r.json()).content?.[0]?.text || '';
  const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
  if (!j.changes?.length || j.corrected === text) return null;
  return j;
}
module.exports = { check };
