// db.js — طبقة قاعدة البيانات (SQLite، ملف واحد محلي: kingcoin.db)
// لاحقاً لو حبيت تكبر المشروع، تقدر تبدّل better-sqlite3 بـ pg (PostgreSQL) بنفس الأسماء تقريباً.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'kingcoin.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  discord_id   TEXT PRIMARY KEY,
  username     TEXT NOT NULL,
  avatar       TEXT,
  balance      INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id      TEXT NOT NULL,
  to_id        TEXT NOT NULL,
  amount       INTEGER NOT NULL,
  type         TEXT NOT NULL,      -- send | gift | payment_link | welcome | admin
  note         TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_links (
  code         TEXT PRIMARY KEY,
  creator_id   TEXT NOT NULL,
  amount       INTEGER NOT NULL,
  note         TEXT,
  used_by      TEXT,
  created_at   INTEGER NOT NULL,
  used_at      INTEGER
);
`);

function getOrCreateUser(discordId, username, avatar, welcomeBonus = 0) {
  let user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
  if (!user) {
    db.prepare(
      'INSERT INTO users (discord_id, username, avatar, balance, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(discordId, username, avatar, welcomeBonus, Date.now());
    if (welcomeBonus > 0) {
      logTransaction('system', discordId, welcomeBonus, 'welcome', 'مكافأة إنشاء حساب');
    }
    user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
  } else {
    // حدّث الاسم/الصورة لو تغيّروا في ديسكورد
    db.prepare('UPDATE users SET username = ?, avatar = ? WHERE discord_id = ?').run(username, avatar, discordId);
  }
  return user;
}

function getUser(discordId) {
  return db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
}

function getBalance(discordId) {
  const u = getUser(discordId);
  return u ? u.balance : 0;
}

function logTransaction(fromId, toId, amount, type, note = '') {
  db.prepare(
    'INSERT INTO transactions (from_id, to_id, amount, type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(fromId, toId, amount, type, note, Date.now());
}

// تحويل آمن بين مستخدمين (كله أو ولا حاجة — عشان ما يحصل نقص فلوس لو صار خطأ في النص)
const transferStmt = db.transaction((fromId, toId, amount, type, note) => {
  const sender = getUser(fromId);
  if (!sender || sender.balance < amount) {
    throw new Error('INSUFFICIENT_BALANCE');
  }
  const receiver = getUser(toId);
  if (!receiver) {
    throw new Error('RECEIVER_NOT_FOUND');
  }
  db.prepare('UPDATE users SET balance = balance - ? WHERE discord_id = ?').run(amount, fromId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE discord_id = ?').run(amount, toId);
  logTransaction(fromId, toId, amount, type, note);
});

function transfer(fromId, toId, amount, type = 'send', note = '') {
  if (amount <= 0) throw new Error('INVALID_AMOUNT');
  transferStmt(fromId, toId, amount, type, note);
}

function getTransactions(discordId, limit = 25) {
  return db
    .prepare(
      `SELECT * FROM transactions WHERE from_id = ? OR to_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(discordId, discordId, limit);
}

function createPaymentLink(creatorId, amount, note) {
  const code = Math.random().toString(36).slice(2, 10);
  db.prepare(
    'INSERT INTO payment_links (code, creator_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(code, creatorId, amount, note, Date.now());
  return code;
}

function getPaymentLink(code) {
  return db.prepare('SELECT * FROM payment_links WHERE code = ?').get(code);
}

const redeemLinkStmt = db.transaction((code, payerId) => {
  const link = getPaymentLink(code);
  if (!link) throw new Error('LINK_NOT_FOUND');
  if (link.used_by) throw new Error('LINK_ALREADY_USED');
  if (link.creator_id === payerId) throw new Error('CANNOT_PAY_OWN_LINK');
  transfer(payerId, link.creator_id, link.amount, 'payment_link', link.note || `دفع رابط ${code}`);
  db.prepare('UPDATE payment_links SET used_by = ?, used_at = ? WHERE code = ?').run(
    payerId,
    Date.now(),
    code
  );
});

function redeemPaymentLink(code, payerId) {
  redeemLinkStmt(code, payerId);
}

module.exports = {
  db,
  getOrCreateUser,
  getUser,
  getBalance,
  transfer,
  getTransactions,
  createPaymentLink,
  getPaymentLink,
  redeemPaymentLink,
  logTransaction,
};
