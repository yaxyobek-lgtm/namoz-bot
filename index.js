// index.js
import 'dotenv/config';
import { Telegraf, session, Scenes } from 'telegraf';
import pkg from 'pg';
const { Client } = pkg;
import crypto from 'crypto';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean).map(Number);

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN in .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// --- PostgreSQL setup ---
let db;
async function initDb() {
  // Renderda DATABASE_URL avtomatik beriladi
  db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  await db.connect();
  
  // Jadvalarni yaratish
  await db.query(`
    CREATE TABLE IF NOT EXISTS pending_questions (
      id TEXT PRIMARY KEY,
      user_id BIGINT,
      username TEXT,
      question TEXT,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      correct CHAR(1),
      category TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reputation_effect INTEGER DEFAULT 0
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      question TEXT,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      correct CHAR(1),
      category TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      added_by BIGINT
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id BIGINT PRIMARY KEY,
      username TEXT,
      reputation INTEGER DEFAULT 0
    );
  `);
  
  console.log('PostgreSQL database initialized');
}

// --- Helpers ---
const profanity = ['yomon','so‘kim','badword'];
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

// --- Wizard Scene ---
const { Scenes: { WizardScene } } = Scenes;

const questionWizard = new WizardScene(
  'questionWizard',
  (ctx) => {
    ctx.reply('Savolni matnini yozing (qisqa va aniq):');
    ctx.wizard.state.data = {};
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message?.text) {
      ctx.reply('Iltimos, matn yuboring.');
      return;
    }
    
    ctx.wizard.state.data.question = ctx.message.text.trim();
    if (ctx.wizard.state.data.question.length < 5) {
      ctx.reply('Savol juda qisqa — iltimos, toʻliqroq yozing.');
      return;
    }
    if (containsProfanity(ctx.wizard.state.data.question)) {
      ctx.reply('Savol notoʻgʻri soʻzlar bor — boshqa savol yozing.');
      return;
    }
    
    await ctx.reply('Variant A ni yozing:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message?.text) {
      ctx.reply('Iltimos, matn yuboring.');
      return;
    }
    ctx.wizard.state.data.option_a = ctx.message.text.trim();
    await ctx.reply('Variant B ni yozing:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message?.text) {
      ctx.reply('Iltimos, matn yuboring.');
      return;
    }
    ctx.wizard.state.data.option_b = ctx.message.text.trim();
    await ctx.reply('Variant C ni yozing:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message?.text) {
      ctx.reply('Iltimos, matn yuboring.');
      return;
    }
    ctx.wizard.state.data.option_c = ctx.message.text.trim();
    await ctx.reply('Variant D ni yozing:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message?.text) {
      ctx.reply('Iltimos, matn yuboring.');
      return;
    }
    ctx.wizard.state.data.option_d = ctx.message.text.trim();
    await ctx.reply('Toʻgʻri javob qaysi? (A/B/C/D)');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message?.text) {
      ctx.reply('Iltimos, A/B/C/D yozing.');
      return;
    }
    
    const ans = ctx.message.text.trim().toUpperCase();
    if (!['A','B','C','D'].includes(ans)) {
      ctx.reply('Faqat A, B, C yoki D ni yozing.');
      return;
    }
    
    ctx.wizard.state.data.correct = ans;
    await ctx.reply('Kategoriya yozing (masalan: Matematika, Tarix yoki "Umumiy"):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message?.text) {
      ctx.reply('Iltimos, matn yozing.');
      return;
    }
    
    const data = ctx.wizard.state.data;
    data.category = ctx.message.text.trim().slice(0,50) || 'Umumiy';
    
    // Validation
    if (!data.question || !data.option_a || !data.option_b || !data.option_c || !data.option_d || !data.correct) {
      await ctx.reply('Savol toʻliq emas. Iltimos boshidan kiritishni boshlang: /addquestion');
      return ctx.scene.leave();
    }
    
    // Profanity check
    const joined = [data.question, data.option_a, data.option_b, data.option_c, data.option_d].join(' ');
    if (containsProfanity(joined)) {
      await ctx.reply('Savol yoki variantlarda nooʻrin soʻz topildi. Qayta yuboring.');
      return ctx.scene.leave();
    }

    // Save to pending
    const id = genId();
    await db.query(
      `INSERT INTO pending_questions (id, user_id, username, question, option_a, option_b, option_c, option_d, correct, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, ctx.from.id, ctx.from.username || '', data.question, data.option_a, data.option_b, data.option_c, data.option_d, data.correct, data.category]
    );

    // Ensure user exists
    await db.query(
      `INSERT INTO users (user_id, username, reputation) VALUES ($1, $2, 0) ON CONFLICT (user_id) DO NOTHING`,
      [ctx.from.id, ctx.from.username || '']
    );

    await ctx.reply(`✅ Savolingiz qabul qilindi va admin tasdig'ini kutmoqda. ID: ${id}`);
    
    // Notify admins
    const adminNotice = `🆕 Yangi savol keldi\nID: ${id}\nFrom: @${ctx.from.username || ctx.from.id}\nKategoriya: ${data.category}\n\n${data.question}\nA) ${data.option_a}\nB) ${data.option_b}\nC) ${data.option_c}\nD) ${data.option_d}\n✅ To'g'ri: ${data.correct}\n\nTekshirish: /pending`;
    
    for (const aid of ADMIN_IDS) {
      try { 
        await bot.telegram.sendMessage(aid, adminNotice); 
      } catch (e) { 
        console.log('Adminga xabar yuborishda xatolik:', e.message);
      }
    }

    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([questionWizard]);
bot.use(session({ defaultSession: () => ({}) }));
bot.use(stage.middleware());

// --- Commands ---
bot.start((ctx) => {
  ctx.reply(
    `Assalomu alaykum, ${ctx.from.first_name}! 👋\nQuizBot ga xush kelibsiz.\n\nSavol qo'shish: /addquestion\nOʻynash: /quiz\nAgar admin bo'lsangiz: /pending`
  );
});

bot.command('addquestion', (ctx) => ctx.scene.enter('questionWizard'));

bot.command('quiz', async (ctx) => {
  const result = await db.query(`SELECT * FROM questions ORDER BY RANDOM() LIMIT 1`);
  const row = result.rows[0];
  
  if (!row) return ctx.reply('Hozircha bazada savol yoʻq. Iltimos, admin tasdiqlagan savollar kelishini kuting.');
  
  const buttons = [
    [{ text: `A) ${row.option_a}`, callback_data: `answer|${row.id}|A` }],
    [{ text: `B) ${row.option_b}`, callback_data: `answer|${row.id}|B` }],
    [{ text: `C) ${row.option_c}`, callback_data: `answer|${row.id}|C` }],
    [{ text: `D) ${row.option_d}`, callback_data: `answer|${row.id}|D` }]
  ];
  
  ctx.session = ctx.session || {};
  ctx.session.lastQuiz = { id: row.id, ts: Date.now() };
  
  await ctx.reply(`📝 ${row.question}\n\nKategoriya: ${row.category}`, { 
    reply_markup: { inline_keyboard: buttons } 
  });
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith('answer|')) return ctx.answerCbQuery();
  
  const [, qid, chosen] = data.split('|');
  ctx.session = ctx.session || {};
  
  const last = ctx.session.lastQuiz || {};
  if (!last.id || last.id !== qid || (Date.now() - last.ts) > 30000) {
    await ctx.answerCbQuery('⏰ Vaqt tugadi yoki savol mos kelmadi.', { show_alert: true });
    return;
  }
  
  const result = await db.query(`SELECT * FROM questions WHERE id = $1`, [qid]);
  const q = result.rows[0];
  
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
  
  ctx.session.lastQuiz = null;
});

bot.command('pending', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('❌ Faqat adminlar kirishi mumkin.');
  
  const result = await db.query(`SELECT * FROM pending_questions ORDER BY created_at DESC LIMIT 50`);
  const rows = result.rows;
  
  if (!rows.length) return ctx.reply('✅ Kutilayotgan savollar yoʻq.');
  
  let msg = '📋 Kutilayotgan savollar:\n\n';
  for (const r of rows) {
    msg += `🆔 ID: ${r.id}\n👤 From: @${r.username || r.user_id}\n📁 ${r.category}\n❓ ${r.question}\nA) ${r.option_a}\nB) ${r.option_b}\nC) ${r.option_c}\nD) ${r.option_d}\n✅ To'g'ri: ${r.correct}\n\n`;
  }
  msg += '\nQabul qilish: /accept <id>\nRad etish: /reject <id>';
  await ctx.reply(msg);
});

bot.command('accept', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('❌ Faqat adminlar.');
  
  const parts = ctx.message.text.split(' ').filter(Boolean);
  if (parts.length < 2) return ctx.reply('ℹ️ Foydalanish: /accept <id>');
  
  const id = parts[1].trim();
  const result = await db.query(`SELECT * FROM pending_questions WHERE id = $1`, [id]);
  const p = result.rows[0];
  
  if (!p) return ctx.reply('❌ Bunday ID topilmadi.');
  
  const qid = genId();
  await db.query(
    `INSERT INTO questions (id, question, option_a, option_b, option_c, option_d, correct, category, added_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [qid, p.question, p.option_a, p.option_b, p.option_c, p.option_d, p.correct, p.category, p.user_id]
  );
  
  await db.query(`DELETE FROM pending_questions WHERE id = $1`, [id]);
  await db.query(`INSERT INTO users (user_id, username, reputation) VALUES ($1, $2, 0) ON CONFLICT (user_id) DO NOTHING`, [p.user_id, p.username || '']);
  await db.query(`UPDATE users SET reputation = reputation + 1 WHERE user_id = $1`, [p.user_id]);

  await ctx.reply(`✅ Savol qabul qilindi va bazaga qoʻshildi. Yangi ID: ${qid}`);
  
  try {
    await bot.telegram.sendMessage(p.user_id, `🎉 Tabriklaymiz! Siz yuborgan savol qabul qilindi!\nSavol ID: ${qid}\nReputatsiya: +1`);
  } catch (e) {
    console.log('Foydalanuvchiga xabar yuborishda xatolik:', e.message);
  }
});

bot.command('reject', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('❌ Faqat adminlar.');
  
  const parts = ctx.message.text.split(' ').filter(Boolean);
  if (parts.length < 2) return ctx.reply('ℹ️ Foydalanish: /reject <id> [sabab]');
  
  const id = parts[1].trim();
  const reason = parts.slice(2).join(' ').slice(0,250) || 'Noaniq yoki notoʻgʻri format';
  
  const result = await db.query(`SELECT * FROM pending_questions WHERE id = $1`, [id]);
  const p = result.rows[0];
  
  if (!p) return ctx.reply('❌ Bunday ID topilmadi.');
  
  await db.query(`DELETE FROM pending_questions WHERE id = $1`, [id]);
  await db.query(`INSERT INTO users (user_id, username, reputation) VALUES ($1, $2, 0) ON CONFLICT (user_id) DO NOTHING`, [p.user_id, p.username || '']);
  await db.query(`UPDATE users SET reputation = reputation - 1 WHERE user_id = $1`, [p.user_id]);

  await ctx.reply(`❌ Savol rad etildi. Sabab: ${reason}`);
  
  try {
    await bot.telegram.sendMessage(p.user_id, `😔 Siz yuborgan savol rad etildi.\n🆔 ID: ${id}\n📝 Sabab: ${reason}\n📉 Reputatsiya: -1`);
  } catch (e) {
    console.log('Foydalanuvchiga xabar yuborishda xatolik:', e.message);
  }
});

bot.command('stats', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('❌ Faqat adminlar.');
  
  const pendingResult = await db.query(`SELECT COUNT(*) as c FROM pending_questions`);
  const questionsResult = await db.query(`SELECT COUNT(*) as c FROM questions`);
  const usersResult = await db.query(`SELECT user_id, username, reputation FROM users ORDER BY reputation DESC LIMIT 10`);
  
  const totalPending = pendingResult.rows[0].c;
  const totalQuestions = questionsResult.rows[0].c;
  const topUsers = usersResult.rows;
  
  let msg = `📊 Statistika\n\n✅ Tasdiqlangan savollar: ${totalQuestions}\n⏳ Kutilayotgan savollar: ${totalPending}\n\n🏆 Top foydalanuvchilar:\n`;
  for (const u of topUsers) {
    msg += `👤 @${u.username || u.user_id} — ${u.reputation} ball\n`;
  }
  await ctx.reply(msg);
});

bot.on('text', (ctx) => {
  const t = ctx.message.text;
  if (t.startsWith('/')) return;
  ctx.reply('ℹ️ Nimani xohlayotganingizni aniq yozing:\n/addquestion — savol yuborish\n/quiz — o\'ynash\n/pending — admin paneli');
});

// Start bot
async function startBot() {
  try {
    await initDb();
    console.log('Database initialized, starting bot...');
    
    await bot.launch();
    console.log('🤖 Bot muvaffaqiyatli ishga tushdi!');
  } catch (error) {
    console.error('Botni ishga tushirishda xatolik:', error);
  }
}

startBot();

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));