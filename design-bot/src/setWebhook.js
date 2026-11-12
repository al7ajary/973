const { env } = require('./config');
(async () => {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: env.WEBHOOK_URL.replace(/\/$/, '') + '/tg', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'] }) });
  console.log(await r.json());
})();
