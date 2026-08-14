// deploy-commands.js — يسجل أوامر السلاش يدوياً لو حبيت (اختياري الآن، لأن bot.js يسجلها تلقائي عند التشغيل)
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const commands = require('./commands-data');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('⏳ جاري تسجيل الأوامر...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );
    console.log('✅ تم تسجيل الأوامر بنجاح على السيرفر.');
  } catch (err) {
    console.error('❌ خطأ أثناء التسجيل:', err);
  }
})();
