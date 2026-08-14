// bot.js — بوت KingCoin: يدير الرصيد، الإرسال، الهدايا، روابط الدفع
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const db = require('./db');
const commandsData = require('./commands-data');

const AMBER = 0xffb020;
const RED = 0xe63946;
const GREEN = 0x3ddc84;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`✅ البوت شغال باسم ${client.user.tag}`);
  // يسجل أوامر السلاش تلقائياً كل ما يشتغل البوت — ما محتاج خطوة يدوية منفصلة
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commandsData }
    );
    console.log('✅ تم تسجيل أوامر السلاش تلقائياً.');
  } catch (err) {
    console.error('⚠️ فشل تسجيل الأوامر تلقائياً:', err.message);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  // يتأكد إن المستخدم عنده حساب، ويعطيه هدية ترحيب أول مرة
  db.getOrCreateUser(
    userId,
    interaction.user.username,
    interaction.user.displayAvatarURL(),
    Number(process.env.WELCOME_BONUS || 0)
  );

  try {
    if (interaction.commandName === 'balance') {
      const balance = db.getBalance(userId);
      const embed = new EmbedBuilder()
        .setColor(AMBER)
        .setTitle('💳 رصيدك في KingCoin')
        .setDescription(`**${balance.toLocaleString('en-US')} KCC**`)
        .setFooter({ text: 'King City RP · KingCoin' });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'send' || interaction.commandName === 'gift') {
      const target = interaction.options.getUser('member');
      const amount = interaction.options.getInteger('amount');
      const isGift = interaction.commandName === 'gift';

      if (target.id === userId) {
        return interaction.reply({ content: '❌ ما تقدر ترسل لنفسك.', ephemeral: true });
      }
      if (target.bot) {
        return interaction.reply({ content: '❌ ما تقدر ترسل لبوت.', ephemeral: true });
      }

      db.getOrCreateUser(
        target.id,
        target.username,
        target.displayAvatarURL(),
        Number(process.env.WELCOME_BONUS || 0)
      );

      try {
        db.transfer(userId, target.id, amount, isGift ? 'gift' : 'send');
      } catch (e) {
        if (e.message === 'INSUFFICIENT_BALANCE') {
          return interaction.reply({ content: '❌ رصيدك ما يكفي.', ephemeral: true });
        }
        throw e;
      }

      const embed = new EmbedBuilder()
        .setColor(isGift ? GREEN : AMBER)
        .setTitle(isGift ? '🎁 تم إرسال هدية' : '↗️ تم التحويل')
        .setDescription(`تم إرسال **${amount.toLocaleString('en-US')} KCC** إلى <@${target.id}>`)
        .setFooter({ text: `رصيدك الحالي: ${db.getBalance(userId).toLocaleString('en-US')} KCC` });

      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'paylink') {
      const amount = interaction.options.getInteger('amount');
      const note = interaction.options.getString('note') || '';
      const code = db.createPaymentLink(userId, amount, note);
      const url = `${process.env.FRONTEND_URL}/pay/${code}`;

      const embed = new EmbedBuilder()
        .setColor(AMBER)
        .setTitle('🔗 رابط دفع جديد')
        .setDescription(`اطلب **${amount.toLocaleString('en-US')} KCC**\n${url}`)
        .setFooter({ text: 'أي عضو يدخل الرابط ويدفعلك من محفظته' });

      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'history') {
      const txs = db.getTransactions(userId, 10);
      if (txs.length === 0) {
        return interaction.reply({ content: 'ما فيه عمليات لسه.', ephemeral: true });
      }
      const lines = txs.map((tx) => {
        const out = tx.from_id === userId;
        const other = out ? tx.to_id : tx.from_id;
        const sign = out ? '-' : '+';
        return `${sign}${tx.amount.toLocaleString('en-US')} KCC — ${out ? 'إلى' : 'من'} <@${other}>`;
      });
      const embed = new EmbedBuilder()
        .setColor(AMBER)
        .setTitle('⚡ آخر عملياتك')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'give') {
      if (!interaction.memberPermissions.has('Administrator')) {
        return interaction.reply({ content: '❌ الأمر ده للأدمن بس.', ephemeral: true });
      }
      const target = interaction.options.getUser('member');
      const amount = interaction.options.getInteger('amount');

      db.getOrCreateUser(
        target.id,
        target.username,
        target.displayAvatarURL(),
        Number(process.env.WELCOME_BONUS || 0)
      );
      db.logTransaction('admin:' + userId, target.id, amount, 'admin', 'منحة أدمن');
      db.db.prepare('UPDATE users SET balance = balance + ? WHERE discord_id = ?').run(amount, target.id);

      const embed = new EmbedBuilder()
        .setColor(GREEN)
        .setTitle('✅ تم منح العملة')
        .setDescription(`أُضيف **${amount.toLocaleString('en-US')} KCC** لـ <@${target.id}>`);
      return interaction.reply({ embeds: [embed] });
    }
  } catch (err) {
    console.error(err);
    const embed = new EmbedBuilder()
      .setColor(RED)
      .setDescription('حصل خطأ غير متوقع، حاول تاني.');
    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
