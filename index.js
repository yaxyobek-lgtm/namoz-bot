const { Telegraf, Markup } = require('telegraf');
const { createCanvas } = require('canvas');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const userStates = new Map();

function mainMenu() {
    return Markup.keyboard([
        ['💳 Yangi chek yaratish'],
        ['📊 Cashback tarixi', 'ℹ️ Yordam']
    ]).resize();
}

async function createCheckImage(userData) {
    const canvas = createCanvas(400, 650);
    const ctx = canvas.getContext('2d');

    // Orqa fon
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // STATUS BAR (telefonning yuqori qismi)
    const currentTime = new Date();
    const timeString = currentTime.toLocaleTimeString('uz-UZ', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });

    // Status bar fon
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, 25);

    // Soat
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(timeString, 20, 17);

    // Status ikonkalari (o'ng tomonda)
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    
    // Batareya
    ctx.fillText('🔋', 320, 17);
    // WiFi
    ctx.fillText('📶', 345, 17);
    // Signal
    ctx.fillText('📱', 370, 17);

    // ASOSIY KONTENT
    const yStart = 40;

    // Foydalanuvchi ismi va karta raqami
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(userData.username, 20, yStart + 30);

    // Karta raqami (faqat oxirgi 4 raqam ko'rinadi)
    const maskedCard = `**** **** **** ${userData.cardNumber.slice(-4)}`;
    ctx.font = '16px Arial';
    ctx.fillText(maskedCard, 20, yStart + 60);

    // Ajratuvchi chiziq
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, yStart + 80);
    ctx.lineTo(380, yStart + 80);
    ctx.stroke();

    // Chek ma'lumotlari
    const infoY = yStart + 110;

    // Sarlavha - @tezcheklot
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('# @tezcheklot', 20, infoY);

    // Qalin chiziq
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, infoY + 15);
    ctx.lineTo(380, infoY + 15);
    ctx.stroke();

    // "Bugun"
    ctx.font = '16px Arial';
    ctx.fillText('Bugun', 20, infoY + 45);

    // Pul o'tkazmasi muvaffaqiyatli
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Pul o'tkazmasi Muvaffaqiyatli ${userData.transferTime}`, 20, infoY + 75);

    // Summa
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`${parseInt(userData.amount).toLocaleString()} so'm`, 20, infoY + 110);

    // Izoh
    ctx.font = '16px Arial';
    ctx.fillText('Izoh qo\'shish', 20, infoY + 145);

    // Cashback (yashil rangda)
    const cashback = Math.round(userData.amount * 0.0025);
    ctx.fillStyle = '#008000';
    ctx.font = 'bold 15px Arial';
    ctx.fillText(`- CASHBACK tushdi: ${cashback.toLocaleString()} so'm`, 20, infoY + 180);

    // TUGMALAR QATORI
    const buttonsY = infoY + 220;
    const buttons = ['50 000', '100 000', '200 000', '320 000'];
    const buttonWidth = 85;
    const buttonHeight = 35;

    for (let i = 0; i < buttons.length; i++) {
        const x = 20 + i * (buttonWidth + 5);
        
        // Tugma fon
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(x, buttonsY, buttonWidth, buttonHeight);
        
        // Tugma chegarasi
        ctx.strokeStyle = '#e0e0e0';
        ctx.strokeRect(x, buttonsY, buttonWidth, buttonHeight);
        
        // Tugma matni
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(buttons[i], x + buttonWidth/2, buttonsY + 22);
    }

    ctx.textAlign = 'left';

    // PASTKI TUGMALAR
    const bottomY = buttonsY + 60;

    // "Pul o'tkazish" tugmasi
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(20, bottomY, 120, 40);
    ctx.strokeStyle = '#e0e0e0';
    ctx.strokeRect(20, bottomY, 120, 40);
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.fillText('Pul o\'tkazish', 40, bottomY + 25);

    // "Keyingi" tugmasi (ko'k rangda)
    ctx.fillStyle = '#007bff';
    ctx.fillRect(280, bottomY, 80, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText('Keyingi', 300, bottomY + 25);

    return canvas.toBuffer('image/png');
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

            // Ma'lumotlarni saqlash
            const userData = {
                username: username,
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