import { Telegraf } from 'telegraf';
import QRCode from 'qrcode';
import axios from 'axios';
import sharp from 'sharp';
import { createReadStream, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Bot token (.env faylidan olish yoki to'g'ridan-to'g'ri yozish)
const BOT_TOKEN = process.env.BOT_TOKEN || '8529967384:AAG3EUtygqchETc7df02LTB0ylfAPOonWGs';

if (!BOT_TOKEN) {
  console.error('❌ Bot token topilmadi! .env faylida BOT_TOKEN=qoʻying');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Start komandasi
bot.start((ctx) => {
  ctx.reply(
    `👋 Assalomu alaykum ${ctx.from.first_name}!\n\n` +
    `📸 **QR Code Generator Bot** ga xush kelibsiz!\n\n` +
    `🔄 **Bot qanday ishlaydi:**\n` +
    `• Matn yuboring - QR kod yasab beraman\n` +
    `• Rasm yuboring - ichidagi matnni QR kodga aylantiraman\n` +
    `• URL yuboring - havola QR kodini yasab beraman\n\n` +
    `📝 **Buyruqlar:**\n` +
    `/start - Botni ishga tushirish\n` +
    `/help - Yordam\n` +
    `/qr <matn> - Tez QR kod yaratish\n\n` +
    `🎯 **Hozir matn, rasm yoki havola yuboring!**`
  );
});

// Help komandasi
bot.help((ctx) => {
  ctx.reply(
    `🆘 **Yordam:**\n\n` +
    `1. **Matn yuboring** - har qanday matn QR kodga aylanadi\n` +
    `2. **Rasm yuboring** - rasmda yozilgan matn QR kod bo'ladi\n` +
    `3. **URL yuboring** - veb-sayt havolasi QR kodi\n` +
    `4. **/qr <matn>** - tezkor QR kod yaratish\n\n` +
    `📸 **Qo'llab-quvvatlanadigan rasm formatlari:**\n` +
    `• JPEG, PNG, WEBP\n` +
    `• Maksimal hajm: 20MB\n\n` +
    `⚡ **Misol:**\n` +
    `• "Salom Dunyo" yuboring\n` +
    `• "https://google.com" yuboring\n` +
    `• Rasm yuboring (matn bilan)`
  );
});

// Tezkor QR kod komandasi
bot.command('qr', async (ctx) => {
  const text = ctx.message.text.replace('/qr', '').trim();
  
  if (!text) {
    return ctx.reply(
      '❌ Iltimos, QR kod qilish uchun matn yozing:\n' +
      'Misol: `/qr Salom Dunyo`'
    );
  }

  try {
    await ctx.reply('⏳ QR kod yaratilmoqda...');
    
    const qrPath = join('/tmp', `qr_${Date.now()}.png`);
    
    // QR kod yaratish
    await QRCode.toFile(qrPath, text, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // QR kodni yuborish
    await ctx.replyWithPhoto(
      { source: qrPath },
      {
        caption: `📊 QR Kod yaratildi!\n\n` +
                `📝 Matn: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n` +
                `📏 Oʻlcham: 400x400\n` +
                `🔄 Yana QR kod yaratish uchun matn yuboring!`
      }
    );

    // Vaqtincha faylni o'chirish
    unlinkSync(qrPath);

  } catch (error) {
    console.error('QR kod yaratishda xatolik:', error);
    ctx.reply('❌ QR kod yaratishda xatolik yuz berdi. Iltimos, qayta urinib koʻring.');
  }
});

// Matnli xabarlarni qayta ishlash
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  
  // Agar bu komanda bo'lsa, boshqa ishlamaslik
  if (text.startsWith('/')) return;

  try {
    await ctx.reply('⏳ QR kod yaratilmoqda...');
    
    const qrPath = join('/tmp', `qr_${Date.now()}.png`);
    
    // QR kod yaratish
    await QRCode.toFile(qrPath, text, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // QR kodni yuborish
    await ctx.replyWithPhoto(
      { source: qrPath },
      {
        caption: `✅ QR Kod tayyor!\n\n` +
                `📝 Kiritgan matningiz: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n\n` +
                `🔄 Yangi QR kod uchun yana matn yuboring!`
      }
    );

    // Faylni tozalash
    unlinkSync(qrPath);

  } catch (error) {
    console.error('Xatolik:', error);
    ctx.reply('❌ QR kod yaratishda xatolik. Iltimos, qayta urinib koʻring.');
  }
});

// Rasmni qayta ishlash
bot.on('photo', async (ctx) => {
  try {
    await ctx.reply('⏳ Rasm tahlil qilinmoqda...');

    // Eng yuqori sifatli rasmni olish
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.telegram.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    // Rasmni yuklab olish
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'arraybuffer'
    });

    const tempImagePath = join('/tmp', `temp_${Date.now()}.jpg`);
    const tempTextPath = join('/tmp', `text_${Date.now()}.txt`);

    // Rasmni saqlash
    await sharp(response.data)
      .jpeg()
      .toFile(tempImagePath);

    // Bu yerda siz OCR (Optical Character Recognition) qo'shishingiz mumkin
    // Lekin oddiy versiya uchun foydalanuvchidan rasmga matn yozishini so'raymiz
    
    await ctx.reply(
      `📸 Rasm qabul qilindi!\n\n` +
      `ℹ️ Hozircha bot rasm ichidagi matnni avtomatik o'qiy olmaydi.\n\n` +
      `📝 Iltimos, rasmda yozilgan matnni yuboring va men uni QR kodga aylantiraman:`
    );

    // Vaqtincha fayllarni o'chirish
    if (existsSync(tempImagePath)) unlinkSync(tempImagePath);
    if (existsSync(tempTextPath)) unlinkSync(tempTextPath);

  } catch (error) {
    console.error('Rasm qayta ishlash xatoligi:', error);
    ctx.reply('❌ Rasmni qayta ishlashda xatolik. Iltimos, boshqa rasm yuboring.');
  }
});

// Document (fayl) qabul qilish
bot.on('document', async (ctx) => {
  const document = ctx.message.document;
  
  // Faqat rasm fayllarini qabul qilish
  const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (imageMimeTypes.includes(document.mime_type)) {
    await ctx.reply('⏳ Rasm fayli qayta ishlanmoqda...');
    
    try {
      const file = await ctx.telegram.getFile(document.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
      
      const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'arraybuffer'
      });

      const tempPath = join('/tmp', `doc_${Date.now()}.${document.mime_type.split('/')[1]}`);
      
      await sharp(response.data)
        .toFile(tempPath);

      await ctx.reply(
        `📄 Rasm fayli qabul qilindi!\n\n` +
        `ℹ️ Hozircha bot rasm ichidagi matnni avtomatik o'qiy olmaydi.\n\n` +
        `📝 Iltimos, rasmda yozilgan matnni yuboring va men uni QR kodga aylantiraman:`
      );

      if (existsSync(tempPath)) unlinkSync(tempPath);

    } catch (error) {
      console.error('Fayl qayta ishlash xatoligi:', error);
      ctx.reply('❌ Faylni qayta ishlashda xatolik.');
    }
  } else {
    ctx.reply(
      '❌ Faqat rasm fayllarini qabul qilaman!\n\n' +
      '📸 Qoʻllab-quvvatlanadigan formatlar: JPEG, PNG, WEBP'
    );
  }
});

// Boshqa turdagi xabarlarga javob
bot.on('message', (ctx) => {
  ctx.reply(
    '❌ Faqat matn, rasm yoki fayl qabul qilaman!\n\n' +
    '📝 Matn yuboring - QR kod yasab beraman\n' +
    '📸 Rasm yuboring - matnni QR kodga aylantiraman\n' +
    '🔗 URL yuboring - havola QR kodini yasayman'
  );
});

// Xatoliklarni boshqarish
bot.catch((err, ctx) => {
  console.error(`Bot xatosi: ${err}`);
  ctx.reply('❌ Botda xatolik yuz berdi. Iltimos, keyinroq urinib koʻring.');
});

// Botni ishga tushirish
bot.launch().then(() => {
  console.log('🤖 QR Code Bot muvaffaqiyatli ishga tushdi!');
}).catch(console.error);

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Render uchun keep-alive
setInterval(() => {
  console.log('🫀 Bot ishlayapti...', new Date().toISOString());
}, 60000);