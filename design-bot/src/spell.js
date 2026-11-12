const { env } = require('./config');

const SYSTEM = 'مدقق إملائي عربي لعناوين صور إخبارية. صحح فقط: الهمزات (أ/إ/ا)، التاء المربوطة/الهاء، الألف المقصورة، الأخطاء الإملائية الواضحة، علامات الترقيم الزائدة. ممنوع تغيير الصياغة أو المعنى أو الأسماء أو الأرقام أو ترتيب الكلمات. أرجع JSON فقط بالشكل: {"corrected":"...","changes":[{"from":"...","to":"..."}]}. لو النص سليم أرجع changes فاضية.';

async function ask(text) {
  if (env.OPENROUTER_API_KEY) {                       // مجاني/رخيص عبر OpenRouter (صيغة OpenAI)
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENROUTER_API_KEY },
      body: JSON.stringify({ model: env.OPENROUTER_MODEL, temperature: 0, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }] }) });
    if (!r.ok) throw new Error('openrouter ' + r.status);
    return (await r.json()).choices?.[0]?.message?.content || '';
  }
  if (env.ANTHROPIC_API_KEY) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.CLAUDE_MODEL || 'claude-haiku-5-5', max_tokens: 600, system: SYSTEM, messages: [{ role: 'user', content: text }] }) });
    if (!r.ok) throw new Error('anthropic ' + r.status);
    return (await r.json()).content?.[0]?.text || '';
  }
  return null;
}

// يرجع { corrected, changes } أو null (سليم / ما في مفتاح)
async function check(text) {
  const out = await ask(text); if (!out) return null;
  const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
  if (!j.changes?.length || !j.corrected || j.corrected === text) return null;
  return j;
}
module.exports = { check };
