// server.js — API الموقع + تسجيل دخول عبر ديسكورد (OAuth2)
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // أسبوع
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = db.getUser(id);
  done(null, user || null);
});

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.OAUTH_CALLBACK_URL,
      scope: ['identify'],
    },
    (accessToken, refreshToken, profile, done) => {
      const avatar = profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : null;
      const user = db.getOrCreateUser(
        profile.id,
        profile.username,
        avatar,
        Number(process.env.WELCOME_BONUS || 0)
      );
      done(null, user);
    }
  )
);

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'غير مسجل دخول' });
}

// ---------- مسارات تسجيل الدخول ----------
app.get('/auth/discord', passport.authenticate('discord'));

app.get(
  '/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => res.redirect(`${process.env.FRONTEND_URL}/wallet`)
);

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

// ---------- API المحفظة ----------
app.get('/api/me', requireAuth, (req, res) => {
  const user = db.getUser(req.user.discord_id);
  res.json(user);
});

app.get('/api/transactions', requireAuth, (req, res) => {
  res.json(db.getTransactions(req.user.discord_id, 25));
});

app.post('/api/send', requireAuth, (req, res) => {
  const { toDiscordId, amount, note } = req.body;
  if (!toDiscordId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'بيانات ناقصة' });
  }
  if (toDiscordId === req.user.discord_id) {
    return res.status(400).json({ error: 'ما تقدر ترسل لنفسك' });
  }
  const receiver = db.getUser(toDiscordId);
  if (!receiver) return res.status(404).json({ error: 'المستلم مش موجود' });

  try {
    db.transfer(req.user.discord_id, toDiscordId, amount, 'send', note || '');
    res.json({ ok: true, balance: db.getBalance(req.user.discord_id) });
  } catch (e) {
    if (e.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ error: 'رصيدك ما يكفي' });
    }
    res.status(500).json({ error: 'خطأ غير متوقع' });
  }
});

app.post('/api/paylink', requireAuth, (req, res) => {
  const { amount, note } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'كمية غير صحيحة' });
  const code = db.createPaymentLink(req.user.discord_id, amount, note || '');
  res.json({ code, url: `${process.env.FRONTEND_URL}/pay/${code}` });
});

app.get('/api/paylink/:code', (req, res) => {
  const link = db.getPaymentLink(req.params.code);
  if (!link) return res.status(404).json({ error: 'الرابط غير موجود' });
  res.json(link);
});

app.post('/api/paylink/:code/pay', requireAuth, (req, res) => {
  try {
    db.redeemPaymentLink(req.params.code, req.user.discord_id);
    res.json({ ok: true, balance: db.getBalance(req.user.discord_id) });
  } catch (e) {
    const messages = {
      LINK_NOT_FOUND: 'الرابط غير موجود',
      LINK_ALREADY_USED: 'الرابط اتدفع خلاص',
      CANNOT_PAY_OWN_LINK: 'ما تقدر تدفع رابطك انت',
      INSUFFICIENT_BALANCE: 'رصيدك ما يكفي',
    };
    res.status(400).json({ error: messages[e.message] || 'خطأ غير متوقع' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 الموقع شغال على http://localhost:${PORT}`));
