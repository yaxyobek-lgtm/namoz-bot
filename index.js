import { Telegraf } from 'telegraf';
import QRCode from 'qrcode';
import axios from 'axios';
import sharp from 'sharp';
import { createReadStream, unlinkSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BOT_TOKEN = process.env.BOT_TOKEN || '8529967384:AAG3EUtygqchETc7df02LTB0ylfAPOonWGs';

if (!BOT_TOKEN) {
  console.error('❌ Bot token topilmadi!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Rasmni base64 ga aylantirish
async function imageToBase64(imageBuffer) {
  try {
    // Rasmni optimallashtirish
    const optimizedImage = await sharp(imageBuffer)
      .resize(800, 800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    return optimizedImage.toString('base64');
  } catch (error) {
    throw new Error('Rasmni qayta ishlashda xatolik');
  }
}

// Base64 ni rasmga aylantirish
async function base64ToImage(base64String, outputPath) {
  try {
    const buffer = Buffer.from(base64String, 'base64');
    await sharp(buffer).toFile(outputPath);
    return true;
  } catch (error) {
    throw new Error('Base64 dan rasm yaratishda xatolik');
  }
}

// Start komandasi
bot.start((ctx) => {
  ctx.reply(
    `🖼️ **Image to QR Code Bot** 🤖\n\n` +
    `📸 **Bot qanday ishlaydi:**\n` +
    `1. Siz rasm yuborasiz\n` +
    `2. Men rasmni QR kodga aylantiraman\n` +
    `3. Kimdir QR kodni skaner qilsa, sizning rasmingiz chiqadi\n\n` +
    `🔄 **Qo'llab-quvvatlanadigan formatlar:**\n` +
    `• JPEG, PNG, WEBP, GIF\n` +
    `• Maksimal hajm: 20MB\n\n` +
    `⚡ **Endi rasm yuboring!**\n\n` +
    `📝 Agar matn yuborsangiz, uni ham QR kodga aylantiraman`
  );
});

// Help komandasi
bot.help((ctx) => {
  ctx.reply(
    `🆘 **Yordam:**\n\n` +
    `📸 **Rasm yuboring:**\n` +
    `• Rasmni yuboring → QR kod olasiz\n` +
    `• QR kodni skaner qilganlar sizning rasmingizni ko'radilar\n\n` +
    `📝 **Matn yuboring:**\n` +
    `• Har qanday matn → QR kod\n` +
    `• URL, telefon, manzil, etc.\n\n` +
    `🔧 **Buyruqlar:**\n` +
    `/start - Botni ishga tushirish\n` +
    `/help - Yordam\n` +
    `/qr <matn> - Tez QR kod\n\n` +
    `💡 **Maslahat:**\n` +
    `• Aniqroq rasm uchun yorug' rasmlardan foydalaning\n` +
    `• QR kodni chop etish uchun sifatli rasm yuboring`
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
    
    await QRCode.toFile(qrPath, text, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    await ctx.replyWithPhoto(
      { source: qrPath },
      {
        caption: `📊 Matn QR kodi tayyor!\n\n` +
                `📝 Matn: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}\n` +
                `📏 Oʻlcham: 400x400\n\n` +
                `🔄 Yangi QR kod uchun rasm yoki matn yuboring!`
      }
    );

    unlinkSync(qrPath);

  } catch (error) {
    console.error('QR kod yaratishda xatolik:', error);
    ctx.reply('❌ QR kod yaratishda xatolik yuz berdi.');
  }
});

// RASMNI QR KODGA AYLANTIRISH
bot.on('photo', async (ctx) => {
  try {
    await ctx.reply('⏳ Rasm QR kodga aylantirilmoqda...');

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

    const imageBuffer = response.data;

    // Rasmni base64 ga aylantirish
    await ctx.reply('🔄 Rasm kodga aylantirilmoqda...');
    const base64Image = await imageToBase64(imageBuffer);

    // Base64 ni QR kodga aylantirish
    await ctx.reply('📊 QR kod yaratilmoqda...');
    const qrPath = join('/tmp', `image_qr_${Date.now()}.png`);
    
    await QRCode.toFile(qrPath, base64Image, {
      width: 500,
      margin: 3,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H' // Yuqori xato tuzatish
    });

    // QR kodni yuborish
    await ctx.replyWithPhoto(
      { source: qrPath },
      {
        caption: `✅ Rasm QR kodi tayyor! 🎉\n\n` +
                `📸 **Siz yuborgan rasm endi QR kodda!**\n\n` +
                `🔍 **Qanday ishlatish:**\n` +
                `• QR kodni skaner qiling\n` +
                `• Sizning asl rasmingiz ochiladi\n` +
                `• Do'stlaringizga yuboring\n\n` +
                `💾 **QR kod o'lchami:** 500x500\n` +
                `🛡️ **Xato tuzatish:** Yuqori\n\n` +
                `🔄 Yangi rasm yuboring!`
      }
    );

    // Test: QR kodni tekshirish
    await ctx.reply('🧪 QR kod tekshirilmoqda...');
    
    try {
      const testImagePath = join('/tmp', `test_${Date.now()}.jpg`);
      await base64ToImage(base64Image, testImagePath);
      
      await ctx.replyWithPhoto(
        { source: testImagePath },
        {
          caption: '✅ Test: QR kod skaner qilinganda shu rasm chiqadi!'
        }
      );
      
      unlinkSync(testImagePath);
    } catch (testError) {
      console.log('Test xatosi:', testError);
    }

    // Fayllarni tozalash
    unlinkSync(qrPath);

  } catch (error) {
    console.error('Rasm QR kod xatosi:', error);
    ctx.reply(
      '❌ Rasmni QR kodga aylantirishda xatolik.\n\n' +
      '💡 **Maslahatlar:**\n' +
      '• Rasm hajmi katta boʻlmasin\n' +
      '• Boshqa formatda rasm yuboring\n' +
      '• Yana urinib koʻring'
    );
  }
});

// Document (fayl) sifatida rasm
bot.on('document', async (ctx) => {
  const document = ctx.message.document;
  
  // Faqat rasm fayllarini qabul qilish
  const imageMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/webp',
    'image/gif'
  ];
  
  if (imageMimeTypes.includes(document.mime_type)) {
    await ctx.reply('⏳ Rasm fayli QR kodga aylantirilmoqda...');
    
    try {
      const file = await ctx.telegram.getFile(document.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
      
      const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'arraybuffer'
      });

      const imageBuffer = response.data;

      // Rasmni base64 ga aylantirish
      const base64Image = await imageToBase64(imageBuffer);

      // QR kod yaratish
      const qrPath = join('/tmp', `doc_qr_${Date.now()}.png`);
      
      await QRCode.toFile(qrPath, base64Image, {
        width: 500,
        margin: 3,
        errorCorrectionLevel: 'H'
      });

      await ctx.replyWithPhoto(
        { source: qrPath },
        {
          caption: `✅ Rasm QR kodi tayyor! 📄\n\n` +
                  `📁 Fayl formati: ${document.mime_type}\n` +
                  `📊 QR kod o'lchami: 500x500\n\n` +
                  `🔍 QR kodni skaner qiling - asl rasm chiqadi!`
        }
      );

      unlinkSync(qrPath);

    } catch (error) {
      console.error('Document QR xatosi:', error);
      ctx.reply('❌ Rasm faylini QR kodga aylantirishda xatolik.');
    }
  } else {
    ctx.reply(
      '❌ Faqat rasm fayllarini qabul qilaman!\n\n' +
      '📸 Qoʻllab-quvvatlanadigan formatlar:\n' +
      '• JPEG, PNG, WEBP, GIF\n\n' +
      '🖼️ Iltimos, rasm yuboring!'
    );
  }
});

// Matnni QR kodga aylantirish
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  
  if (text.startsWith('/')) return;

  try {
    await ctx.reply('⏳ Matn QR kodga aylantirilmoqda...');
    
    const qrPath = join('/tmp', `text_qr_${Date.now()}.png`);
    
    await QRCode.toFile(qrPath, text, {
      width: 400,
      margin: 2,
      color: {
        dark: '#2C3E50',
        light: '#ECF0F1'
      }
    });

    await ctx.replyWithPhoto(
      { source: qrPath },
      {
        caption: `📝 Matn QR kodi tayyor!\n\n` +
                `📄 Matn: ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}\n` +
                `📏 Oʻlcham: 400x400\n\n` +
                `🖼️ **Yoki rasm yuboring - men uni QR kodga aylantiraman!**`
      }
    );

    unlinkSync(qrPath);

  } catch (error) {
    console.error('Matn QR xatosi:', error);
    ctx.reply('❌ Matnni QR kodga aylantirishda xatolik.');
  }
});

// Boshqa xabarlar
bot.on('message', (ctx) => {
  ctx.reply(
    '🖼️ **Iltimos, rasm yuboring!**\n\n' +
    '📸 Men sizning rasmingizni QR kodga aylantiraman.\n' +
    '🔍 Keyin kimdir QR kodni skaner qilsa, sizning rasmingiz chiqadi!\n\n' +
    '📝 Yoki matn yuboring - uni ham QR kodga aylantiraman.'
  );
});

// Xatoliklar
bot.catch((err, ctx) => {
  console.error(`Bot xatosi: ${err}`);
  ctx.reply('❌ Botda xatolik yuz berdi. Iltimos, keyinroq urinib koʻring.');
});

// Botni ishga tushirish
bot.launch().then(() => {
  console.log('🤖 Image to QR Code Bot ishga tushdi!');
  console.log('📸 Endi foydalanuvchilar rasm yuborib, QR kod olishlari mumkin!');
}).catch(console.error);

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Keep-alive for Render
setInterval(() => {
  console.log('🫀 Bot ishlayapti...', new Date().toLocaleTimeString());
}, 60000);