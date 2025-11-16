const { Telegraf, Markup } = require('telegraf');
const { createCanvas } = require('canvas');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const userStates = new Map();

// Asosiy menyu
function mainMenu() {
    return Markup.keyboard([
        ['💳 Yangi chek yaratish'],
        ['📊 Cashback tarixi', 'ℹ️ Yordam']
    ]).resize();
}

// Chek rasmini yaratish funksiyasi
async function createCheckImage(userData) {
    const canvas = createCanvas(400, 600);
    const ctx = canvas.getContext('2d');

    // Orqa fon - oq rang
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // HEADER (Foydalanuvchi ma'lumotlari)
    const headerY = 30;
    
    // Avatar
    ctx.fillStyle = '#313131';
    ctx.beginPath();
    ctx.arc(30, headerY, 24, 0, Math.PI * 2);
    ctx.fill();
    
    // Avatar harflari
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(userData.initials, 30, headerY + 5);
    ctx.textAlign = 'left';

    // Ism
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(userData.username, 65, headerY - 8);

    // Karta raqami
    ctx.fillStyle = '#6c757d';
    ctx.font = '13px Arial';
    const maskedCard = `4916 9*** **** ${userData.cardNumber.slice(-4)}`;
    ctx.fillText(maskedCard, 65, headerY + 12);

    // Ikonkalar (o'ng tomonda)
    ctx.font = '16px Arial';
    ctx.fillText('📋', 350, headerY - 8);
    ctx.fillText('👤', 380, headerY - 8);

    // "Bugun" matni
    ctx.fillStyle = '#6c757d';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Bugun', canvas.width / 2, headerY + 50);
    ctx.textAlign = 'left';

    // ASOSIY KARTA
    const cardY = headerY + 70;
    const cardWidth = canvas.width - 32;
    const cardHeight = 380;

    // Karta fon
    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.roundRect(16, cardY, cardWidth, cardHeight, 14);
    ctx.fill();

    // Karta chegarasi
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(16, cardY, cardWidth, cardHeight, 14);
    ctx.stroke();

    // Karta ichidagi kontent
    const contentX = 32;
    let contentY = cardY + 25;

    // Sarlavha
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 15px Arial';
    ctx.fillText('Pul o\'tkazmasi', contentX, contentY);

    // Status
    ctx.fillStyle = '#28a745';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(`Muvaffaqiyatli ${userData.transferTime}`, contentX, contentY + 25);

    // Nusxa olish tugmasi
    ctx.fillStyle = '#e9ecef';
    ctx.beginPath();
    ctx.roundRect(320, cardY + 15, 40, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.fillText('📄', 332, cardY + 42);

    // Summa
    contentY += 60;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`${parseInt(userData.amount).toLocaleString()}`, contentX, contentY);
    
    ctx.fillStyle = '#6c757d';
    ctx.font = '14px Arial';
    ctx.fillText('so\'m', contentX + ctx.measureText(`${parseInt(userData.amount).toLocaleString()}`).width + 8, contentY - 20);

    // Cashback
    contentY += 50;
    const cashback = Math.round(userData.amount * 0.0025);
    
    // Cashback kartasi
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.beginPath();
    ctx.roundRect(contentX, contentY, cardWidth - 32, 50, 12);
    ctx.fill();
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.roundRect(contentX, contentY, cardWidth - 32, 50, 12);
    ctx.stroke();

    // Cashback ikonkasi
    ctx.fillStyle = '#28a745';
    ctx.beginPath();
    ctx.arc(contentX + 25, contentY + 25, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💰', contentX + 25, contentY + 29);
    ctx.textAlign = 'left';

    // Cashback matni
    ctx.fillStyle = '#6c757d';
    ctx.font = '14px Arial';
    ctx.fillText('CASHBACK tushdi:', contentX + 50, contentY + 20);
    ctx.fillStyle = '#28a745';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`${cashback.toLocaleString()} so'm`, contentX + 50, contentY + 40);

    // Tez tugmalar
    contentY += 80;
    const buttons = ['50 000', '100 000', '200 000', '320 000'];
    const buttonWidth = 80;
    const buttonHeight = 35;
    const spacing = 10;

    for (let i = 0; i < buttons.length; i++) {
        const x = contentX + i * (buttonWidth + spacing);
        
        // Tugma fon
        ctx.fillStyle = '#e9ecef';
        ctx.beginPath();
        ctx.roundRect(x, contentY, buttonWidth, buttonHeight, 18);
        ctx.fill();
        
        // Tugma chegarasi
        ctx.strokeStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.roundRect(x, contentY, buttonWidth, buttonHeight, 18);
        ctx.stroke();
        
        // Tugma matni
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(buttons[i], x + buttonWidth/2, contentY + 22);
    }
    ctx.textAlign = 'left';

    // Input maydoni va tugmalar
    contentY += 60;
    
    // "Pul o'tkazish" tugmasi
    ctx.fillStyle = '#e9ecef';
    ctx.beginPath();
    ctx.roundRect(contentX, contentY, 120, 45, 12);
    ctx.fill();
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.roundRect(contentX, contentY, 120, 45, 12);
    ctx.stroke();
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.fillText('Pul o\'tkazish', contentX + 20, contentY + 28);

    // Input maydoni
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(contentX + 140, contentY, 120, 45, 12);
    ctx.fill();
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.roundRect(contentX + 140, contentY, 120, 45, 12);
    ctx.stroke();
    ctx.fillStyle = '#6c757d';
    ctx.font = '14px Arial';
    ctx.fillText('Pul o\'tkazish', contentX + 150, contentY + 28);

    // "Keyingi" tugmasi
    ctx.fillStyle = '#007bff';
    ctx.beginPath();
    ctx.roundRect(contentX + 280, contentY, 80, 45, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Keyingi', contentX + 295, contentY + 28);

    return canvas.toBuffer('image/png');
}

// Canvas uchun roundRect funksiyasi
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
}

// Start komandasi
bot.start((ctx) => {
    const welcomeText = `👋 Assalomu alaykum! ${ctx.from.first_name}

💳 Haqiqiy ko'rinishdagi chek yaratish botiga xush kelibsiz!

"Yangi chek yaratish" tugmasini bosing va ma'lumotlarni kiriting.`;
    
    return ctx.reply(welcomeText, mainMenu());
});

// Yangi chek yaratish
bot.hears('💳 Yangi chek yaratish', (ctx) => {
    userStates.set(ctx.from.id, { waitingForData: true });
    
    const instructionText = `📝 Iltimos, ma'lumotlarni quyidagi formatda kiriting:

*Ism Familiya*
*16 xonali karta raqami*
*Summa*

📋 **Misol:**
Abdulhafizov Abduhalim
4916991204131606
100000`;
    
    return ctx.reply(instructionText);
});

// Ma'lumotlarni qabul qilish
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userState = userStates.get(userId);
    const text = ctx.message.text;

    if (userState?.waitingForData) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length >= 3) {
            const username = lines[0].trim();
            let cardNumber = lines[1].trim().replace(/\s/g, '');
            const amount = parseInt(lines[2].trim().replace(/\s/g, ''));

            // Validatsiya
            if (!/^\d{16}$/.test(cardNumber)) {
                return ctx.reply('❌ Karta raqami 16 xonali boʻlishi kerak. Iltimos, qaytadan kiriting:');
            }

            if (isNaN(amount) || amount <= 0) {
                return ctx.reply('❌ Summa notoʻgʻri kiritildi. Iltimos, qaytadan kiriting:');
            }

            // Ismdan bosh harflar olish
            const initials = username.split(' ').map(n => n[0]).join('').toUpperCase();

            // Ma'lumotlarni saqlash
            const userData = {
                username: username,
                initials: initials,
                cardNumber: cardNumber,
                amount: amount,
                transferTime: new Date().toLocaleTimeString('uz-UZ', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                })
            };

            try {
                // Chek rasmini yaratish
                const imageBuffer = await createCheckImage(userData);
                
                // Rasmni yuborish
                await ctx.replyWithPhoto(
                    { source: imageBuffer },
                    {
                        caption: `✅ Chek muvaffaqiyatli yaratildi!\n\n👤 Foydalanuvchi: ${username}\n💳 Karta: ****${cardNumber.substring(12)}\n💰 Summa: ${amount.toLocaleString()} so'm`,
                        reply_markup: mainMenu().reply_markup
                    }
                );

                userStates.delete(userId);

            } catch (error) {
                console.error('Rasm yaratishda xato:', error);
                await ctx.reply('❌ Xatolik yuz berdi. Iltimos, qaytadan urinib koʻring.', mainMenu());
                userStates.delete(userId);
            }

        } else {
            await ctx.reply('❌ Notoʻgʻri format. Iltimos, 3 qatorli formatda kiriting:\n\nIsm Familiya\nKarta raqami\nSumma');
        }
    }
});

// Cashback tarixi
bot.hears('📊 Cashback tarixi', (ctx) => {
    return ctx.reply('📊 Cashback tarixi:\n\n💰 Jami cashback: 7,488.25 so\'m', mainMenu());
});

// Yordam
bot.hears('ℹ️ Yordam', (ctx) => {
    const helpText = `ℹ️ Yordam

Bu bot orqali siz haqiqiy ko'rinishdagi chek rasmlarini yaratishingiz mumkin.

📝 **Format:**
Ism Familiya
4916991204131606
100000`;
    
    return ctx.reply(helpText, mainMenu());
});

// Botni ishga tushurish
bot.launch().then(() => {
    console.log('Bot ishga tushdi!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));