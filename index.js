const { Telegraf, Markup } = require('telegraf');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Foydalanuvchi holatlari
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
    const canvas = createCanvas(400, 700);
    const ctx = canvas.getContext('2d');

    // Orqa fon - oq rang
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Status bari (yuqorida)
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    const now = new Date();
    const timeString = now.toLocaleTimeString('uz-UZ', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    
    // Soat
    ctx.fillText(timeString, 20, 20);
    
    // Status ikonkalari (o'ng tomonda)
    ctx.fillText('📶', 320, 20); // WiFi
    ctx.fillText('🔋', 350, 20); // Batareya
    ctx.fillText('📱', 380, 20); // Signal

    // Asosiy kontent
    const cardNumber = userData.cardNumber;
    const maskedCard = `${cardNumber.substring(0, 6)}******${cardNumber.substring(12)}`;
    
    // Foydalanuvchi ismi va karta raqami
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(userData.username, 20, 60);
    
    ctx.font = '16px Arial';
    ctx.fillText(maskedCard, 20, 90);

    // Ajratuvchi chiziq
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 110);
    ctx.lineTo(380, 110);
    ctx.stroke();

    // Chek sarlavhasi
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Pul o\'tkazmasi', 20, 140);

    // Vaqt
    ctx.font = '14px Arial';
    ctx.fillText(userData.transferTime, 20, 170);

    // Summa
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`${parseInt(userData.amount).toLocaleString()} so'm`, 20, 210);

    // Status - Muvaffaqiyatli
    ctx.fillStyle = '#00a000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Muvaffaqiyatli', 20, 250);

    // Izoh
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.fillText('Izoh qo\'shish', 20, 290);

    // Cashback
    const cashback = Math.round(userData.amount * 0.0025);
    ctx.fillStyle = '#00a000';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`- CASHBACK tushdi: ${cashback.toLocaleString()} so'm`, 20, 320);

    // Pastki chiziq
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(20, 350);
    ctx.lineTo(380, 350);
    ctx.stroke();

    // Tugmalar paneli
    const buttons = ['50 000', '100 000', '200 000', '320 000'];
    const buttonWidth = 85;
    const buttonHeight = 40;
    const spacing = 5;
    const startX = 20;
    const startY = 370;

    for (let i = 0; i < buttons.length; i++) {
        // Button background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(startX + i * (buttonWidth + spacing), startY, buttonWidth, buttonHeight);
        
        // Button border
        ctx.strokeStyle = '#e0e0e0';
        ctx.strokeRect(startX + i * (buttonWidth + spacing), startY, buttonWidth, buttonHeight);
        
        // Button text
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.fillText(buttons[i], startX + i * (buttonWidth + spacing) + 10, startY + 25);
    }

    // Pastki tugmalar
    const bottomY = 430;
    
    // "Pul o'tkazish" tugmasi
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(20, bottomY, 150, 45);
    ctx.strokeStyle = '#e0e0e0';
    ctx.strokeRect(20, bottomY, 150, 45);
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.fillText('Pul o\'tkazish', 40, bottomY + 25);

    // "Keyingi" tugmasi
    ctx.fillStyle = '#007bff';
    ctx.fillRect(250, bottomY, 100, 45);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText('Keyingi', 270, bottomY + 25);

    // Eng pastgi chiziq
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(20, 490);
    ctx.lineTo(380, 490);
    ctx.stroke();

    // Footer ma'lumotlari
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.fillText('@tezcheklot', 20, 520);
    ctx.fillText(now.toLocaleDateString('uz-UZ'), 320, 520);

    return canvas.toBuffer('image/png');
}

// Start komandasi
bot.start((ctx) => {
    const welcomeText = `👋 Assalomu alaykum! ${ctx.from.first_name}

💳 Chek yaratish botiga xush kelibsiz!

"Yangi chek yaratish" tugmasini bosing va quyidagi formatda ma'lumotlarni kiriting:

*Ism Familiya*
*Karta raqami*
*Summa*

📝 **Misol:**
Abdulhafizov Abduhalim
4916991204131606
100000`;
    
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

    // Agar foydalanuvchi ma'lumot kutyotgan bo'lsa
    if (userState?.waitingForData) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length >= 3) {
            const username = lines[0].trim();
            let cardNumber = lines[1].trim().replace(/\s/g, '');
            const amount = parseInt(lines[2].trim().replace(/\s/g, ''));

            // Karta raqamini tekshirish
            if (!/^\d{16}$/.test(cardNumber)) {
                return ctx.reply('❌ Karta raqami 16 xonali boʻlishi kerak. Iltimos, qaytadan kiriting:');
            }

            if (isNaN(amount) || amount <= 0) {
                return ctx.reply('❌ Summa notoʻgʻri kiritildi. Iltimos, qaytadan kiriting:');
            }

            // Ma'lumotlarni saqlash
            userStates.set(userId, {
                username: username,
                cardNumber: cardNumber,
                amount: amount,
                transferTime: new Date().toLocaleTimeString('uz-UZ', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                })
            });

            try {
                // Chek rasmini yaratish
                const imageBuffer = await createCheckImage(userStates.get(userId));
                
                // Rasmni yuborish
                await ctx.replyWithPhoto(
                    { source: imageBuffer },
                    {
                        caption: `✅ Chek muvaffaqiyatli yaratildi!\n\n💳 Karta: ****${cardNumber.substring(12)}\n💰 Summa: ${amount.toLocaleString()} so'm\n👤 Foydalanuvchi: ${username}`,
                        reply_markup: mainMenu().reply_markup
                    }
                );

                // Holatni tozalash
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
    const historyText = `📊 Cashback tarixi:

💰 Jami cashback: 7,488.25 so'm`;
    
    return ctx.reply(historyText, mainMenu());
});

// Yordam
bot.hears('ℹ️ Yordam', (ctx) => {
    const helpText = `ℹ️ Yordam

Bu bot orqali siz haqiqiy ko'rinishdagi chek rasmlarini yaratishingiz mumkin.

📝 **Format:**
Ism Familiya
4916991204131606
100000

🔢 **Karta raqami:** 16 xonali
💰 **Summa:** Istalgan miqdor`;
    
    return ctx.reply(helpText, mainMenu());
});

// Botni ishga tushurish
bot.launch().then(() => {
    console.log('Bot ishga tushdi!');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));