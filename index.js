// index.js
import 'dotenv/config';
import { Telegraf, session, Scenes } from 'telegraf';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import crypto from 'crypto';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean).map(Number);
const DB_PATH = process.env.DB_PATH || './quizbot.db';

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN in .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// --- DB init ---
let db;
async function initDb() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS pending_questions (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      username TEXT,
      question TEXT,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      correct CHAR(1),
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reputation_effect INTEGER DEFAULT 0
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      question TEXT,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      correct CHAR(1),
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      added_by INTEGER
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      username TEXT,
      reputation INTEGER DEFAULT 0
    );
  `);
  
  console.log('Database initialized');
}

// --- Helpers ---
const profanity = ['yomon','so‘kim','badword']; // o'zingiz qo'shing
function containsProfanity(text) {
  const t = (text || '').toLowerCase();
  return profanity.some(w => t.includes(w));
}
function genId() {
  return crypto.randomBytes(8).toString('hex');
}
function isAdmin(ctx) {
  const id = ctx.from?.id;
  return ADMIN_IDS.includes(id);
}

// --- Scenes for add-question wizard ---
const { BaseScene, Stage } = Scenes;

const askQuestion = new BaseScene('askQuestion');
askQuestion.enter((ctx) => ctx.reply('Savolni matnini yozing (qisqa va aniq):'));
askQuestion.on('text', async (ctx) => {
  ctx.session.newQ = { question: ctx.message.text.trim() };
  if (ctx.session.newQ.question.length < 5) {
    return ctx.reply('Savol juda qisqa — iltimos, toʻliqroq yozing.');
  }
  if (containsProfanity(ctx.session.newQ.question)) {
    return ctx.reply('Savol notoʻgʻri soʻzlar bor — boshqa savol yozing.');
  }
  await ctx.reply('Variant A ni yozing:');
  return ctx.wizard.next();
});
askQuestion.on('message', (ctx) => ctx.reply('Iltimos, savol matnini matn sifatida yuboring.'));

const askOptA = new BaseScene('askOptA');
askOptA.enter((ctx) => ctx.reply('Variant A ni yozing:'));
askOptA.on('text', async (ctx) => {
  ctx.session.newQ.option_a = ctx.message.text.trim();
  await ctx.reply('Variant B ni yozing:');
  return ctx.wizard.next();
});
askOptA.on('message', (ctx) => ctx.reply('Iltimos, matn yuboring.'));

const askOptB = new BaseScene('askOptB');
askOptB.enter((ctx) => ctx.reply('Variant B ni yozing:'));
askOptB.on('text', async (ctx) => {
  ctx.session.newQ.option_b = ctx.message.text.trim();
  await ctx.reply('Variant C ni yozing:');
  return ctx.wizard.next();
});
askOptB.on('message', (ctx) => ctx.reply('Iltimos, matn yuboring.'));

const askOptC = new BaseScene('askOptC');
askOptC.enter((ctx) => ctx.reply('Variant C ni yozing:'));
askOptC.on('text', async (ctx) => {
  ctx.session.newQ.option_c = ctx.message.text.trim();
  await ctx.reply('Variant D ni yozing:');
  return ctx.wizard.next();
});
askOptC.on('message', (ctx) => ctx.reply('Iltimos, matn yuboring.'));

const askOptD = new BaseScene('askOptD');
askOptD.enter((ctx) => ctx.reply('Variant D ni yozing:'));
askOptD.on('text', async (ctx) => {
  ctx.session.newQ.option_d = ctx.message.text.trim();
  await ctx.reply('Toʻgʻri javob qaysi? (A/B/C/D) ');
  return ctx.wizard.next();
});
askOptD.on('message', (ctx) => ctx.reply('Iltimos, matn yuboring.'));

const askCorrect = new BaseScene('askCorrect');
askCorrect.enter((ctx) => ctx.reply('Toʻgʻri javob qaysi? (A/B/C/D) '));
askCorrect.on('text', async (ctx) => {
  const ans = ctx.message.text.trim().toUpperCase();
  if (!['A','B','C','D'].includes(ans)) return ctx.reply('Faqat A, B, C yoki D ni yozing.');
  ctx.session.newQ.correct = ans;
  await ctx.reply('Kategoriya yozing (masalan: Matematika, Tarix yoki "Umumiy"):');
  return ctx.wizard.next();
});
askCorrect.on('message', (ctx) => ctx.reply('Iltimos, A/B/C/D deb yozing.'));

const askCategory = new BaseScene('askCategory');
askCategory.enter((ctx) => ctx.reply('Kategoriya yozing (masalan: Matematika, Tarix yoki "Umumiy"):'));
askCategory.on('text', async (ctx) => {
  const cat = ctx.message.text.trim().slice(0,50) || 'Umumiy';
  ctx.session.newQ.category = cat;
  
  // minimal validation
  const q = ctx.session.newQ;
  if (!q.question || !q.option_a || !q.option_b || !q.option_c || !q.option_d || !q.correct) {
    ctx.session.newQ = null;
    await ctx.reply('Savol toʻliq emas. Iltimos boshidan kiritishni boshlang: /addquestion');
    return ctx.scene.leave();
  }
  
  // profanity check
  const joined = [q.question,q.option_a,q.option_b,q.option_c,q.option_d].join(' ');
  if (containsProfanity(joined)) {
    await ctx.reply('Savol yoki variantlarda nooʻrin soʻz topildi. Qayta yuboring.');
    ctx.session.newQ = null;
    return ctx.scene.leave();
  }

  // save to pending
  const id = genId();
  await db.run(
    `INSERT INTO pending_questions (id, user_id, username, question, option_a, option_b, option_c, option_d, correct, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, ctx.from.id, ctx.from.username || '', q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct, q.category
  );

  // ensure user exists
  await db.run(
    `INSERT OR IGNORE INTO users (user_id, username, reputation) VALUES (?, ?, 0)`,
    ctx.from.id, ctx.from.username || ''
  );

  await ctx.reply(`✅ Savolingiz qabul qilindi va admin tasdig'ini kutmoqda. ID: ${id}`);
  
  // notify admins
  const adminNotice = `🆕 Yangi savol keldi\nID: ${id}\nFrom: @${ctx.from.username || ctx.from.id}\nKategoriya: ${q.category}\n\n${q.question}\nA) ${q.option_a}\nB) ${q.option_b}\nC) ${q.option_c}\nD) ${q.option_d}\n✅ To'g'ri: ${q.correct}\n\nTekshirish: /pending`;
  for (const aid of ADMIN_IDS) {
    try { 
      await bot.telegram.sendMessage(aid, adminNotice); 
    } catch (e) { 
      console.log('Adminga xabar yuborishda xatolik:', e.message);
    }
  }

  ctx.session.newQ = null;
  return ctx.scene.leave();
});
askCategory.on('message', (ctx) => ctx.reply('Iltimos, matn yozing.'));

// Create wizard
const questionWizard = new Scenes.WizardScene(
  'questionWizard',
  askQuestion,
  askOptA,
  askOptB,
  askOptC,
  askOptD,
  askCorrect,
  askCategory
);

const stage = new Scenes.Stage([questionWizard]);
bot.use(session());
bot.use(stage.middleware());

// --- Commands ---

bot.start((ctx) => {
  ctx.reply(
    `Assalomu alaykum, ${ctx.from.first_name}! 👋\nQuizBot ga xush kelibsiz.\n\nSavol qo'shish: /addquestion\nOʻynash: /quiz\nAgar admin bo'lsangiz: /pending`
  );
});

// addquestion entry
bot.command('addquestion', (ctx) => ctx.scene.enter('questionWizard'));

// quiz: show a random approved question
bot.command('quiz', async (ctx) => {
  const row = await db.get(`SELECT * FROM questions ORDER BY RANDOM() LIMIT 1`);
  if (!row) return ctx.reply('Hozircha bazada savol yoʻq. Iltimos, admin tasdiqlagan savollar kelishini kuting.');
  
  const buttons = [
    [{ text: `A) ${row.option_a}`, callback_data: `answer|${row.id}|A` }],
    [{ text: `B) ${row.option_b}`, callback_data: `answer|${row.id}|B` }],
    [{ text: `C) ${row.option_c}`, callback_data: `answer|${row.id}|C` }],
    [{ text: `D) ${row.option_d}`, callback_data: `answer|${row.id}|D` }]
  ];
  
  // set a time limit
  ctx.session.lastQuiz = { id: row.id, ts: Date.now() };
  await ctx.reply(`📝 ${row.question}\n\nKategoriya: ${row.category}`, { 
    reply_markup: { inline_keyboard: buttons } 
  });
});

// handle answer callbacks
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith('answer|')) return ctx.answerCbQuery();
  
  const [, qid, chosen] = data.split('|');
  
  // simple time check (30s)
  const last = ctx.session.lastQuiz || {};
  if (!last.id || last.id !== qid || (Date.now() - last.ts) > 30000) {
    await ctx.answerCbQuery('⏰ Vaqt tugadi yoki savol mos kelmadi.', { show_alert: true });
    return;
  }
  
  const q = await db.get(`SELECT * FROM questions WHERE id = ?`, qid);
  if (!q) {
    await ctx.answerCbQuery('❌ Savol topilmadi.', { show_alert: true });
    return;
  }
  
  if (chosen === q.correct) {
    await ctx.answerCbQuery('🎉 Toʻgʻri!', { show_alert: true });
    await ctx.editMessageText(`✅ ${q.question}\n\nSizning javobingiz: ${chosen}) - TO'G'RI! 🎉\n\nYana savol: /quiz`);
  } else {
    await ctx.answerCbQuery(`❌ Noto'g'ri. To'g'ri javob: ${q.correct}`, { show_alert: true });
    await ctx.editMessageText(`❌ ${q.question}\n\nSizning javobingiz: ${chosen}) - NOTO'G'RI\n✅ To'g'ri javob: ${q.correct})\n\nYana savol: /quiz`);
  }
  
  // clear lastQuiz
  ctx.session.lastQuiz = null;
});

// Admin: check pending
bot.command('pending', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('❌ Faqat adminlar kirishi mumkin.');
  const rows = await db.all(`SELECT * FROM pending_questions ORDER BY created_at DESC LIMIT 50`);
  if (!rows.length) return ctx.reply('✅ Kutilayotgan savollar yoʻq.');
  
  let msg = '📋 Kutilayotgan savollar:\n\n';
  for (const r of rows) {
    msg += `🆔 ID: ${r.id}\n👤 From: @${r.username || r.user_id}\n📁 ${r.category}\n❓ ${r.question}\nA) ${r.option_a}\nB) ${r.option_b}\nC) ${r.option_c}\nD) ${r.option_d}\n✅ To'g'ri: ${r.correct}\n\n`;
  }
  msg += '\nQabul qilish: /accept <id>\nRad etish: /reject <id>';
  await ctx.reply(msg);
});

// Accept pending
bot.command('accept', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('❌ Faqat adminlar.');
  const parts = ctx.message.text.split(' ').filter(Boolean);
  if (parts.length < 2) return ctx.reply('ℹ️ Foydalanish: /accept <id>');
  
  const id = parts[1].trim();
  const p = await db.get(`SELECT * FROM pending_questions WHERE id = ?`, id);
  if (!p) return ctx.reply('❌ Bunday ID topilmadi.');
  
  // move to questions
  const qid = genId();
  await db.run(
    `INSERT INTO questions (id, question, option_a, option_b, option_c, option_d, correct, category, added_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    qid, p.question, p.option_a, p.option_b, p.option_c, p.option_d, p.correct, p.category, p.user_id
  );
  await db.run(`DELETE FROM pending_questions WHERE id = ?`, id);

  // reputation +1 to submitter
  await db.run(`INSERT OR IGNORE INTO users (user_id, username, reputation) VALUES (?, ?, 0)`, p.user_id, p.username || '');
  await db.run(`UPDATE users SET reputation = reputation + 1 WHERE user_id = ?`, p.user_id);

  await ctx.reply(`✅ Savol qabul qilindi va bazaga qoʻshildi. Yangi ID: ${qid}`);
  
  // notify submitter
  try {
    await bot.telegram.sendMessage(p.user_id, `🎉 Tabriklaymiz! Siz yuborgan savol qabul qilindi!\nSavol ID: ${qid}\nReputatsiya: +1`);
  } catch (e) {
    console.log('Foydalanuvchiga xabar yuborishda xatolik:', e.message);
  }
});

// Reject pending
bot.command('reject', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('❌ Faqat adminlar.');
  const parts = ctx.message.text.split(' ').filter(Boolean);
  if (parts.length < 2) return ctx.reply('ℹ️ Foydalanish: /reject <id> [sabab]');
  
  const id = parts[1].trim();
  const reason = parts.slice(2).join(' ').slice(0,250) || 'Noaniq yoki notoʻgʻri format';
  const p = await db.get(`SELECT * FROM pending_questions WHERE id = ?`, id);
  if (!p) return ctx.reply('❌ Bunday ID topilmadi.');
  
  await db.run(`DELETE FROM pending_questions WHERE id = ?`, id);
  
  // reputation -1
  await db.run(`INSERT OR IGNORE INTO users (user_id, username, reputation) VALUES (?, ?, 0)`, p.user_id, p.username || '');
  await db.run(`UPDATE users SET reputation = reputation - 1 WHERE user_id = ?`, p.user_id);

  await ctx.reply(`❌ Savol rad etildi. Sabab: ${reason}`);
  
  try {
    await bot.telegram.sendMessage(p.user_id, `😔 Siz yuborgan savol rad etildi.\n🆔 ID: ${id}\n📝 Sabab: ${reason}\n📉 Reputatsiya: -1`);
  } catch (e) {
    console.log('Foydalanuvchiga xabar yuborishda xatolik:', e.message);
  }
});

// Stats
bot.command('stats', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('❌ Faqat adminlar.');
  
  const totalPending = await db.get(`SELECT COUNT(*) as c FROM pending_questions`);
  const totalQuestions = await db.get(`SELECT COUNT(*) as c FROM questions`);
  const topUsers = await db.all(`SELECT user_id, username, reputation FROM users ORDER BY reputation DESC LIMIT 10`);
  
  let msg = `📊 Statistika\n\n✅ Tasdiqlangan savollar: ${totalQuestions.c}\n⏳ Kutilayotgan savollar: ${totalPending.c}\n\n🏆 Top foydalanuvchilar:\n`;
  for (const u of topUsers) {
    msg += `👤 @${u.username || u.user_id} — ${u.reputation} ball\n`;
  }
  await ctx.reply(msg);
});

// Fallback text handler
bot.on('text', (ctx) => {
  const t = ctx.message.text;
  if (t.startsWith('/')) return;
  ctx.reply('ℹ️ Nimani xohlayotganingizni aniq yozing:\n/addquestion — savol yuborish\n/quiz — o\'ynash\n/pending — admin paneli');
});

// Start bot
async function startBot() {
  await initDb();
  console.log('Database initialized, starting bot...');
  
  bot.launch().then(() => {
    console.log('🤖 Bot muvaffaqiyatli ishga tushdi!');
  }).catch(console.error);
}

startBot();

// graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));