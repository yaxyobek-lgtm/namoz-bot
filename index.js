const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Foydalanuvchilar ma'lumotlari (asl loyihada DB ishlatish kerak)
const users = new Map();

// Asosiy menyu
function mainMenu() {
    return Markup.keyboard([
        ['💰 Pul o\'tkazish', '📊 Cashback tarixi'],
        ['ℹ️ Yordam', '⚙️ Sozlamalar']
    ]).resize();
}

// Summa tanlash uchun inline keyboard
function amountKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('50 000', 'amount_50000'),
            Markup.button.callback('100 000', 'amount_100000')
        ],
        [
            Markup.button.callback('200 000', 'amount_200000'),
            Markup.button.callback('320 000', 'amount_320000')
        ],
        [Markup.button.callback('Boshqa summa', 'amount_custom')],
        [Markup.button.callback('⬅️ Ortga', 'back_main')]
    ]);
}

// Tasdiqlash tugmalari
function confirmKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Tasdiqlash', 'confirm_transfer'),
            Markup.button.callback('❌ Bekor qilish', 'cancel_transfer')
        ]
    ]);
}

// Start komandasi
bot.start((ctx) => {
    const welcomeText = `👋 Assalomu alaykum! ${ctx.from.first_name}

💰 Pul o'tkazmalari va cashback xizmatiga xush kelibsiz!

Quyidagi tugmalardan foydalaning:`;
    
    return ctx.reply(welcomeText, mainMenu());
});

// Pul o'tkazish bosqichlari
bot.hears('💰 Pul o\'tkazish', (ctx) => {
    const text = `💸 Pul o'tkazish summasini tanlang:

Yoki o'zingiz summa kiriting:`;
    
    return ctx.reply(text, amountKeyboard());
});

// Summa tanlash
bot.action(/amount_/, async (ctx) => {
    const amount = ctx.match[0].replace('amount_', '');
    let summa;
    
    if (amount === 'custom') {
        await ctx.deleteMessage();
        return ctx.reply('💳 Iltimos, summani kiriting:\n\nMasalan: 150000');
    } else {
        summa = parseInt(amount);
        users.set(ctx.from.id, { ...users.get(ctx.from.id), transferAmount: summa });
        
        const text = `📋 Transfer tafsilotlari:

💵 Summa: ${summa.toLocaleString()} so'm
👤 Qabul qiluvchi: @tezcheklot

Tasdiqlaysizmi?`;
        
        await ctx.editMessageText(text, confirmKeyboard());
    }
});

// Tasdiqlash
bot.action('confirm_transfer', async (ctx) => {
    const user = users.get(ctx.from.id);
    const amount = user?.transferAmount || 0;
    const cashback = Math.round(amount * 0.0025); // 0.25% cashback
    
    const successText = `# @tezcheklot

---

**Bugun**

**Pul o'tkazmasi Muvaffaqiyatli ${new Date().toLocaleTimeString('uz-UZ', {hour: '2-digit', minute: '2-digit'})}**

**${amount.toLocaleString()} so'm**

**Izoh qo'shish**

- **CASHBACK tushdi: ${cashback.toLocaleString()} so'm**

| 50 000 | 100 000 | 200 000 | 320 000 |
|---|---|---|---|
| Pul o'tkazish    |    |    | Keyingi |`;
    
    await ctx.editMessageText(successText);
    return ctx.reply('✅ Pul o\'tkazmasi muvaffaqiyatli amalga oshirildi!', mainMenu());
});

// Bekor qilish
bot.action('cancel_transfer', async (ctx) => {
    await ctx.editMessageText('❌ Pul o\'tkazmasi bekor qilindi.');
    return ctx.reply('Asosiy menyu:', mainMenu());
});

// Boshqa summa kiritish
bot.on('text', (ctx) => {
    const text = ctx.message.text;
    const user = users.get(ctx.from.id);
    
    // Faqat raqam kiritilganini tekshirish
    if (/^\d+$/.test(text) && !user?.transferAmount) {
        const amount = parseInt(text);
        if (amount > 0) {
            users.set(ctx.from.id, { ...user, transferAmount: amount });
            
            const confirmText = `📋 Transfer tafsilotlari:

💵 Summa: ${amount.toLocaleString()} so'm
👤 Qabul qiluvchi: @tezcheklot

Tasdiqlaysizmi?`;
            
            return ctx.reply(confirmText, confirmKeyboard());
        }
    }
});

// Cashback tarixi
bot.hears('📊 Cashback tarixi', (ctx) => {
    const historyText = `📊 Cashback tarixi:

🟢 16.11.2025 - 1,912.50 so'm
🟢 15.11.2025 - 2,450.00 so'm
🟢 14.11.2025 - 3,125.75 so'm

💰 Jami cashback: 7,488.25 so'm`;
    
    return ctx.reply(historyText, mainMenu());
});

// Yordam
bot.hears('ℹ️ Yordam', (ctx) => {
    const helpText = `ℹ️ Yordam

Bu bot orqali siz:
• 💸 Pul o'tkazmalari qilishingiz mumkin
• 💰 Har bir o'tkazmadan cashback olishingiz mumkin
• 📊 Cashback tarixini ko'rishingiz mumkin

📞 Aloqa: @support`;
    
    return ctx.reply(helpText, mainMenu());
});

// Xatoliklar
bot.catch((err, ctx) => {
    console.error('Bot xatosi:', err);
    return ctx.reply('❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
});

// Botni ishga tushurish
bot.launch().then(() => {
    console.log('Bot ishga tushdi!');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));