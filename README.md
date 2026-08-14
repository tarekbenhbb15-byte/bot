# KingCoin — بوت وموقع محفظة عملة الديسكورد

دليل مخصص للتشغيل من الهاتف بس، من غير كمبيوتر خالص. كل خطوة هنا بتتعمل من المتصفح.

## الفكرة العامة

بما إنك على الهاتف، أسهل طريقة إنك ما تشغل حاجة على جهازك نفسه، وبدل كده "تستضيف" المشروع على خدمة سحابية بتشتغل هي 24 ساعة نيابة عنك. هنستخدم:

- **GitHub** — مكان نرفع فيه ملفات المشروع (زي تخزين سحابي للكود)
- **Railway** — خدمة استضافة بتاخد الكود من GitHub وتشغله تلقائي، وواجهتها كلها متصفح

## الخطوة 1: افتح حساب GitHub

1. روح https://github.com من متصفح الهاتف واعمل حساب مجاني (إيميل + باسورد)
2. بعد ما تدخل، اضغط علامة **+** فوق يمين → **New repository**
3. سمّيه `kingcoin` → خليه **Private** → اضغط **Create repository**

## الخطوة 2: ارفع ملفات المشروع

1. فكّ ضغط ملف `kingcoin-project.zip` اللي بعتهولك — أغلب هواتف الأندرويد فيها فك ضغط جاهز من تطبيق الملفات (Files)، بعد الفتح هتلاقي مجلد `kingcoin` فيه كل الملفات
2. ارجع لصفحة الريبو في GitHub → اضغط **Add file → Upload files**
3. من متصفح الهاتف اختار **كل الملفات اللي جوه مجلد kingcoin** (مش المجلد نفسه، الملفات اللي جواه) وارفعها كلها مرة واحدة
4. تحت الصفحة اضغط **Commit changes**

## الخطوة 3: جهّز تطبيق الديسكورد (من المتصفح)

1. روح https://discord.com/developers/applications → **New Application** → سمّيه King Coin
2. من تبويب **Bot** (يسار الشاشة): اضغط **Reset Token** وانسخ التوكن، احتفظ بيه في مكان آمن — هذا `DISCORD_BOT_TOKEN`
3. من تبويب **OAuth2 → General**: انسخ **Client ID** و**Client Secret** (لازم تعمل Reset للسكرت عشان يبان) — دول `DISCORD_CLIENT_ID` و`DISCORD_CLIENT_SECRET`
4. في نفس الصفحة تحت **Redirects** اضغط **Add Redirect** واكتب مؤقتاً:
   `https://kingcoin-production.up.railway.app/auth/discord/callback`
   (هنظبطه بالرابط الصح بعد ما نعرف رابطك النهائي من Railway في الخطوة 5)
5. عشان تجيب **Guild ID**: من تطبيق ديسكورد نفسه → الإعدادات → Advanced → فعّل Developer Mode. بعدين اضغط ضغطة طويلة على اسم سيرفرك → Copy Server ID
6. رابط دعوة البوت: ارجع لـ **OAuth2 → URL Generator** → اختار `bot` و`applications.commands`، وفي الصلاحيات تحت اختار `Send Messages` و`Embed Links` → افتح الرابط اللي يطلع تحت وأضف البوت لسيرفرك

## الخطوة 4: افتح حساب Railway وربطه بـ GitHub

1. روح https://railway.app من المتصفح → سجل دخول بحساب GitHub نفسه (زر Login with GitHub)
2. اضغط **New Project → Deploy from GitHub repo** → اختار ريبو `kingcoin`
3. Railway هيكتشف المشروع تلقائي ويبدأ يجهزه (ممكن ياخد دقيقة أو اتنين)

## الخطوة 5: حط المتغيرات السرية (Environment Variables)

1. جوه مشروعك في Railway اضغط على الخدمة (Service) → تبويب **Variables**
2. ضيف كل المتغيرات دي واحد واحد (القيم اللي جمعتها من الخطوة 3):

```
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_GUILD_ID=...
SESSION_SECRET=اكتب أي جملة عشوائية طويلة
WELCOME_BONUS=100
PORT=3000
```

3. من تبويب **Settings** في نفس الخدمة، تحت **Networking** اضغط **Generate Domain** — هيديك رابط زي:
   `kingcoin-production.up.railway.app`
4. ارجع ضيف متغيرين تانيين بنفس الرابط ده:

```
FRONTEND_URL=https://kingcoin-production.up.railway.app
OAUTH_CALLBACK_URL=https://kingcoin-production.up.railway.app/auth/discord/callback
```

5. روح رجّع لصفحة تطبيق الديسكورد (الخطوة 3-4) وحدّث الـ Redirect بنفس الرابط بالظبط (لازم يكونوا متطابقين حرف بحرف)

## الخطوة 6: شغّل خدمتين (البوت + الموقع)

المشروع فيه عمليتين منفصلتين لازم تشتغلوا مع بعض:

1. جوه Railway اضغط **New → Empty Service** (أو **Duplicate** للخدمة اللي عندك) عشان تعمل خدمة تانية من نفس الريبو
2. في الخدمة الأولى: Settings → Deploy → Start Command اكتبها: `npm run start` (ده البوت)
3. في الخدمة التانية: Settings → Deploy → Start Command اكتبها: `npm run start:web` (ده الموقع)
4. تأكد المتغيرات (Variables) من الخطوة 5 متكررة في الخدمتين الاتنين

Railway هيعيد النشر تلقائي، وبعد شوية هتلاقي في الـ **Logs**:
- الخدمة الأولى: `✅ البوت شغال باسم KingCoin#...`
- الخدمة التانية: `🌐 الموقع شغال على http://localhost:3000`

## جرّب دلوقتي

- روح ديسكورد سيرفرك واكتب `/balance` — المفروض يردلك رصيدك (0 أو الهدية لو حطيت WELCOME_BONUS)
- افتح رابط موقعك من Railway في المتصفح، جرب `/auth/discord` تشوف تسجيل الدخول شغال

## لو حاجة ما اشتغلت

افتح تبويب **Logs** في أي خدمة جوه Railway — أي خطأ هيبان هناك بالتفصيل. لو علقت في خطوة معينة قولّي بالظبط وش ظهرلك وأساعدك تحلها.

## ربط الواجهة (Front-end)

صفحة `kingcoin-wallet-mobile.html` اللي عملناها قبل كده لسه ببيانات وهمية. قولّي لو تبي أظبطها تتوصل بالموقع الحقيقي دلوقتي بعد ما خلص الاستضافة.
