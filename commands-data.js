// commands-data.js — تعريف أوامر السلاش (مشترك بين bot.js و deploy-commands.js)
const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('يعرض رصيدك الحالي من عملة KingCoin'),

  new SlashCommandBuilder()
    .setName('send')
    .setDescription('إرسال عملة لعضو آخر')
    .addUserOption((opt) => opt.setName('member').setDescription('المستلم').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('الكمية').setRequired(true).setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName('gift')
    .setDescription('إهداء عملة لعضو (نفس الإرسال بس برسالة هدية)')
    .addUserOption((opt) => opt.setName('member').setDescription('المستلم').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('الكمية').setRequired(true).setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName('paylink')
    .setDescription('إنشاء رابط دفع يقدر أي عضو يدفعه لك')
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('الكمية المطلوبة').setRequired(true).setMinValue(1)
    )
    .addStringOption((opt) => opt.setName('note').setDescription('ملاحظة (اختياري)')),

  new SlashCommandBuilder()
    .setName('history')
    .setDescription('يعرض آخر عملياتك'),

  new SlashCommandBuilder()
    .setName('give')
    .setDescription('[أدمن] إعطاء عملة لعضو من عندك')
    .addUserOption((opt) => opt.setName('member').setDescription('المستلم').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('الكمية').setRequired(true).setMinValue(1)
    )
    .setDefaultMemberPermissions(0x8), // Administrator
].map((c) => c.toJSON());

module.exports = commands;
