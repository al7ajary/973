# Design Bot (تيلقرام)

## تشغيل محلي
1. `npm i`
2. انسخ `.env.example` إلى `.env` وعبّي `BOT_TOKEN` و `ALLOWED_USERS` (و `ANTHROPIC_API_KEY` لفحص الإملاء)
3. `npm run demo` لتجربة بدون تيلقرام (النتيجة في `out/`)
4. `npm start` لتشغيل البوت (Polling)

## هوستينقر (Webhook)
1. ارفع المجلد كـ Node.js Web App، ثم `npm i`
2. في `.env`: `WEBHOOK_URL` (رابط الموقع) و `WEBHOOK_SECRET`
3. شغّل `npm run set-webhook` مرة وحدة

## إضافة قالب جديد
ضع الـ PNG في `templates/` وأضف سطر في `templates/templates.json` (الاسم، الكلمات المفتاحية، مكان النص).

## ملاحظة
الفونتات في `fonts/` تأكد من ترخيصها قبل النشر.
