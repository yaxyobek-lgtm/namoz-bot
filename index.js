import { Telegraf, Markup } from "telegraf";
import fetch from "node-fetch";
import { createServer } from 'http';

const bot = new Telegraf(process.env.BOT_TOKEN || "8529967384:AAG3EUtygqchETc7df02LTB0ylfAPOonWGs");

// Bot haqida ma'lumot
function getBotInfo(firstName) {
  return `🕌 **Namoz Vaqtlari Boti**

Assalomu alaykum ${firstName || "do'st"}! 😊 Bu bot orqali siz:

✅ **Bugungi namoz vaqtlarini** bilib olishingiz mumkin
✅ **O'zbekistonning barcha viloyat va tumanlari** uchun aniq vaqtlar
✅ **Qolgan vaqtni** ko'rish (keyingi namozgacha qancha vaqt qolgani)

Botdan foydalanish uchun /start buyrug'ini bering yoki pastdagi tugmalardan foydalaning.

🤲 *"Albatta, namoz mo'minlarga vaqtida farz qilindi"* (An-Niso: 103)`;
}

// Namoz vaqtlarini tartibda saqlash
const prayerOrder = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const prayerNames = {
  'Fajr': '🌅 Bomdod',
  'Sunrise': '🌄 Quyosh', 
  'Dhuhr': '☀️ Peshin',
  'Asr': '🌤 Asr',
  'Maghrib': '🌇 Shom',
  'Isha': '🌙 Xufton'
};

// Qolgan vaqtni hisoblash
function getTimeRemaining(currentTime, prayerTime) {
  const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
  const [prayerHours, prayerMinutes] = prayerTime.split(':').map(Number);
  
  const currentTotal = currentHours * 60 + currentMinutes;
  const prayerTotal = prayerHours * 60 + prayerMinutes;
  
  let diff = prayerTotal - currentTotal;
  
  if (diff < 0) {
    diff += 24 * 60;
  }
  
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  
  if (hours > 0) {
    return `${hours} soat ${minutes} daqiqa`;
  } else {
    return `${minutes} daqiqa`;
  }
}

// Keyingi namoz va qolgan vaqtni topish - TO'LIQ YANGILANDI
function getNextPrayerWithTime(times) {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
  const currentTotal = currentHours * 60 + currentMinutes;
  
  let nextPrayer = null;
  let minTimeDiff = Infinity;
  
  // Barcha namoz vaqtlarini tekshiramiz
  for (const prayer of prayerOrder) {
    if (prayer === 'Sunrise') continue;
    
    const prayerTime = times[prayer];
    if (!prayerTime) continue;
    
    const [prayerHours, prayerMinutes] = prayerTime.split(':').map(Number);
    const prayerTotal = prayerHours * 60 + prayerMinutes;
    
    let timeDiff = prayerTotal - currentTotal;
    
    // Agar vaqt o'tib bo'lsa, ertangi kunga qo'shamiz
    if (timeDiff < 0) {
      timeDiff += 24 * 60;
    }
    
    // Faqat kelajakdagi vaqtlarni hisoblaymiz
    if (timeDiff > 0 && timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      nextPrayer = {
        prayer: prayer,
        prayerName: prayerNames[prayer],
        time: prayerTime,
        remaining: getTimeRemaining(currentTime, prayerTime)
      };
    }
  }
  
  // Agar hamma vaqtlar o'tib bo'lsa, ertangi Bomdodni ko'rsatamiz
  if (!nextPrayer) {
    const tomorrowFajrTime = times['Fajr'];
    const timeRemaining = getTimeRemaining(currentTime, tomorrowFajrTime);
    nextPrayer = {
      prayer: 'Fajr',
      prayerName: prayerNames['Fajr'],
      time: tomorrowFajrTime,
      remaining: timeRemaining
    };
  }
  
  return nextPrayer;
}

// Foydalanuvchilarni saqlash
const users = new Set();
const userRatings = {};

// VILOYATLAR VA TUMANLAR
const regions = {
  "Toshkent shahri": {
    districts: {
      "Yunusobod": { lat: 41.3515, lng: 69.2863 },
      "Chilonzor": { lat: 41.2754, lng: 69.2044 },
      "Mirobod": { lat: 41.2974, lng: 69.2796 },
      "Shayxontohur": { lat: 41.3230, lng: 69.2417 },
      "Yakkasaroy": { lat: 41.2853, lng: 69.2510 },
      "Sergeli": { lat: 41.2421, lng: 69.2050 },
      "Olmazor": { lat: 41.3553, lng: 69.2163 },
      "Uchtepa": { lat: 41.2999, lng: 69.1611 },
      "Bektemir": { lat: 41.2091, lng: 69.3335 },
      "Yashnobod": { lat: 41.3387, lng: 69.3200 },
      "Mirzo Ulug'bek": { lat: 41.3380, lng: 69.3307 }
    }
  },
  "Toshkent viloyati": {
    districts: {
      "Olmaliq shahar": { lat: 40.8448, lng: 69.5983 },
      "Angren shahar": { lat: 41.0167, lng: 70.1436 },
      "Bekobod shahar": { lat: 40.2208, lng: 69.2697 },
      "Chirchiq shahar": { lat: 41.4689, lng: 69.5822 },
      "Yangiyo'l shahar": { lat: 41.1122, lng: 69.0472 },
      "Ohangaron shahar": { lat: 40.9064, lng: 69.6488 },
      "Bekobod tumani": { lat: 40.2208, lng: 69.2697 },
      "Bo'ka tumani": { lat: 40.8108, lng: 69.2014 },
      "Bo'stonliq tumani": { lat: 41.5667, lng: 69.9000 },
      "Chinoz tumani": { lat: 40.9361, lng: 68.7594 },
      "Qibray tumani": { lat: 41.3890, lng: 69.4650 },
      "Parkent tumani": { lat: 41.2942, lng: 69.6790 },
      "Oqqo'rg'on tumani": { lat: 40.8786, lng: 69.3547 },
      "Ohangaron tumani": { lat: 40.9064, lng: 69.6488 },
      "Piskent tumani": { lat: 40.8972, lng: 69.3506 },
      "Quyi Chirchiq tumani": { lat: 41.1950, lng: 69.2580 },
      "O'rta Chirchiq tumani": { lat: 41.2220, lng: 69.1390 },
      "Yuqori Chirchiq tumani": { lat: 41.2064, lng: 69.4086 },
      "Zangiota tumani": { lat: 41.1920, lng: 69.1480 },
      "Yangiyo'l tumani": { lat: 41.1120, lng: 69.0470 }
    }
  },
  "Farg'ona viloyati": {
    districts: {
      "Farg'ona shahar": { lat: 40.3864, lng: 71.7864 },
      "Marg'ilon shahar": { lat: 40.4714, lng: 71.7247 },
      "Quvasoy shahar": { lat: 40.2972, lng: 71.9803 },
      "Qo'qon shahar": { lat: 40.5286, lng: 70.9425 },
      "Beshariq tumani": { lat: 40.4360, lng: 70.6100 },
      "Bog'dod tumani": { lat: 40.5370, lng: 71.8220 },
      "Buvayda tumani": { lat: 40.7167, lng: 70.9000 },
      "Dang'ara tumani": { lat: 40.5920, lng: 70.9170 },
      "Furqat tumani": { lat: 40.5140, lng: 70.8140 },
      "Oltiariq tumani": { lat: 40.3910, lng: 71.4740 },
      "Qo'shtepa tumani": { lat: 40.5670, lng: 71.2170 },
      "Quva tumani": { lat: 40.5240, lng: 72.0720 },
      "Rishton tumani": { lat: 40.3570, lng: 71.2840 },
      "So'x tumani": { lat: 39.9650, lng: 71.1340 },
      "Toshloq tumani": { lat: 40.4770, lng: 71.7670 },
      "Uchko'prik tumani": { lat: 40.4360, lng: 70.9420 },
      "O'zbekiston tumani": { lat: 40.6890, lng: 71.0410 },
      "Yozyovon tumani": { lat: 40.6550, lng: 71.7430 }
    }
  },
  "Namangan viloyati": {
    districts: {
      "Namangan shahar": { lat: 40.9983, lng: 71.6726 },
      "Chust shahar": { lat: 41.0039, lng: 71.2372 },
      "Kosonsoy shahar": { lat: 41.2494, lng: 71.5472 },
      "Chust tumani": { lat: 41.0039, lng: 71.2372 },
      "Kosonsoy tumani": { lat: 41.2494, lng: 71.5472 },
      "Mingbuloq tumani": { lat: 40.7630, lng: 70.9420 },
      "Norin tumani": { lat: 40.9970, lng: 71.6370 },
      "Pop tumani": { lat: 40.8736, lng: 71.1089 },
      "To'raqo'rg'on tumani": { lat: 40.9970, lng: 71.5120 },
      "Uchqo'rg'on tumani": { lat: 41.1130, lng: 72.0790 },
      "Uychi tumani": { lat: 41.0750, lng: 71.9230 },
      "Yangiqo'rg'on tumani": { lat: 41.1930, lng: 71.3390 },
      "Chortoq tumani": { lat: 41.0690, lng: 71.8220 }
    }
  },
  "Andijon viloyati": {
    districts: {
      "Andijon shahar": { lat: 40.7833, lng: 72.3333 },
      "Xonobod shahar": { lat: 40.8040, lng: 72.9830 },
      "Asaka shahar": { lat: 40.6410, lng: 72.2380 },
      "Shahrixon tumani": { lat: 40.7130, lng: 72.0560 },
      "Baliqchi tumani": { lat: 40.8660, lng: 72.0000 },
      "Bo'z tumani": { lat: 40.6930, lng: 71.9130 },
      "Buloqboshi tumani": { lat: 40.6080, lng: 72.4670 },
      "Izboskan tumani": { lat: 40.9140, lng: 72.2430 },
      "Jalaquduq tumani": { lat: 40.7420, lng: 72.5990 },
      "Xo'jaobod tumani": { lat: 40.6680, lng: 72.5600 },
      "Qo'rg'ontepa tumani": { lat: 40.7340, lng: 72.7610 },
      "Marhamat tumani": { lat: 40.4800, lng: 72.3130 },
      "Oltinko'l tumani": { lat: 40.8010, lng: 72.1940 },
      "Paxtaobod tumani": { lat: 40.9290, lng: 72.4980 },
      "Ulug'nor tumani": { lat: 40.7340, lng: 71.5900 }
    }
  },
  "Samarqand viloyati": {
    districts: {
      "Samarqand shahar": { lat: 39.6542, lng: 66.9597 },
      "Kattaqo'rg'on shahar": { lat: 39.8994, lng: 66.2611 },
      "Bulung'ur tumani": { lat: 39.7667, lng: 67.2714 },
      "Ishtixon tumani": { lat: 39.9667, lng: 66.4861 },
      "Jomboy tumani": { lat: 39.6986, lng: 67.0933 },
      "Koshrabot tumani": { lat: 39.9833, lng: 66.8333 },
      "Narpay tumani": { lat: 39.9972, lng: 65.6167 },
      "Nurobod tumani": { lat: 39.5000, lng: 66.0333 },
      "Oqdaryo tumani": { lat: 39.9167, lng: 66.4333 },
      "Paxtachi tumani": { lat: 40.2333, lng: 67.1833 },
      "Payariq tumani": { lat: 39.8333, lng: 66.9333 },
      "Pastdarg'om tumani": { lat: 39.7000, lng: 66.6667 },
      "Qo'shrabot tumani": { lat: 40.0833, lng: 66.6667 },
      "Toyloq tumani": { lat: 39.6333, lng: 67.1000 },
      "Urgut tumani": { lat: 39.4022, lng: 67.2431 }
    }
  },
  "Buxoro viloyati": {
    districts: {
      "Buxoro shahar": { lat: 39.7667, lng: 64.4333 },
      "Kogon shahar": { lat: 39.7222, lng: 64.5514 },
      "Olot tumani": { lat: 39.4172, lng: 63.8033 },
      "Peshku tumani": { lat: 40.4272, lng: 63.8533 },
      "Romitan tumani": { lat: 39.9292, lng: 64.3792 },
      "Shofirkon tumani": { lat: 40.1200, lng: 64.5014 },
      "Qorako'l tumani": { lat: 39.8772, lng: 63.8542 },
      "Qorovulbozor tumani": { lat: 39.5000, lng: 64.7933 },
      "G'ijduvon tumani": { lat: 40.0992, lng: 64.6833 },
      "Vobkent tumani": { lat: 40.0333, lng: 64.5167 },
      "Jondor tumani": { lat: 40.1000, lng: 63.6667 }
    }
  },
  "Navoiy viloyati": {
    districts: {
      "Navoiy shahar": { lat: 40.0844, lng: 65.3792 },
      "Zarafshon shahar": { lat: 41.5764, lng: 64.2014 },
      "Karmana tumani": { lat: 40.1433, lng: 65.3714 },
      "Konimex tumani": { lat: 40.2750, lng: 65.1522 },
      "Navbahor tumani": { lat: 40.1872, lng: 65.3714 },
      "Nurota tumani": { lat: 40.5611, lng: 65.6944 },
      "Qiziltepa tumani": { lat: 40.0333, lng: 64.8500 },
      "Tomdi tumani": { lat: 42.0611, lng: 64.5139 },
      "Uchquduq tumani": { lat: 42.1561, lng: 63.5528 },
      "Xatirchi tumani": { lat: 40.1872, lng: 65.9250 }
    }
  },
  "Qashqadaryo viloyati": {
    districts: {
      "Qarshi shahar": { lat: 38.8611, lng: 65.7897 },
      "Shahrisabz shahar": { lat: 39.0578, lng: 66.8339 },
      "Beshkent tumani": { lat: 38.8211, lng: 65.6533 },
      "Chiroqchi tumani": { lat: 39.0333, lng: 66.5722 },
      "Dehqonobod tumani": { lat: 38.3172, lng: 66.5833 },
      "G'uzor tumani": { lat: 38.6200, lng: 66.2392 },
      "Kasbi tumani": { lat: 38.9583, lng: 65.5264 },
      "Kitob tumani": { lat: 39.1214, lng: 66.8861 },
      "Koson tumani": { lat: 39.0372, lng: 65.5850 },
      "Mirishkor tumani": { lat: 38.7583, lng: 65.5264 },
      "Muborak tumani": { lat: 39.2550, lng: 65.1522 },
      "Nishon tumani": { lat: 38.6931, lng: 65.6750 },
      "Qamashi tumani": { lat: 38.8211, lng: 66.4561 },
      "Yakkabog' tumani": { lat: 38.9761, lng: 66.6833 }
    }
  },
  "Surxondaryo viloyati": {
    districts: {
      "Termiz shahar": { lat: 37.2242, lng: 67.2783 },
      "Bandixon tumani": { lat: 37.9333, lng: 67.1833 },
      "Boysun tumani": { lat: 38.2061, lng: 67.2061 },
      "Denov tumani": { lat: 38.2672, lng: 67.8981 },
      "Jarqo'rg'on tumani": { lat: 37.5122, lng: 67.4050 },
      "Qiziriq tumani": { lat: 37.6642, lng: 67.2792 },
      "Qumqo'rg'on tumani": { lat: 37.8272, lng: 67.5892 },
      "Muzrabot tumani": { lat: 37.5711, lng: 66.6311 },
      "Oltinsoy tumani": { lat: 38.1072, lng: 67.8922 },
      "Sariosiyo tumani": { lat: 38.4172, lng: 67.9592 },
      "Sherobod tumani": { lat: 37.6672, lng: 67.0161 },
      "Sho'rchi tumani": { lat: 37.9992, lng: 67.7872 },
      "Termiz tumani": { lat: 37.2242, lng: 67.2783 },
      "Uzun tumani": { lat: 38.2172, lng: 68.1833 }
    }
  },
  "Jizzax viloyati": {
    districts: {
      "Jizzax shahar": { lat: 40.1167, lng: 67.8500 },
      "Arnasoy tumani": { lat: 40.5333, lng: 67.8333 },
      "Baxmal tumani": { lat: 39.7500, lng: 67.5833 },
      "Do'stlik tumani": { lat: 40.5333, lng: 68.0372 },
      "Forish tumani": { lat: 40.3833, lng: 67.2333 },
      "G'allaorol tumani": { lat: 40.1333, lng: 67.9500 },
      "Mirzacho'l tumani": { lat: 40.7000, lng: 68.7667 },
      "Paxtakor tumani": { lat: 40.3172, lng: 67.9542 },
      "Yangiobod tumani": { lat: 40.5333, lng: 68.7667 },
      "Zomin tumani": { lat: 39.9667, lng: 68.4000 },
      "Zafarobod tumani": { lat: 40.3833, lng: 67.8333 },
      "Zarbdor tumani": { lat: 40.1500, lng: 68.1500 }
    }
  },
  "Sirdaryo viloyati": {
    districts: {
      "Guliston shahar": { lat: 40.4894, lng: 68.7842 },
      "Yangiyer shahar": { lat: 40.2750, lng: 68.8222 },
      "Shirin shahar": { lat: 40.2922, lng: 69.0472 },
      "Boyovut tumani": { lat: 40.7200, lng: 69.3500 },
      "Guliston tumani": { lat: 40.4894, lng: 68.7842 },
      "Xovos tumani": { lat: 40.3000, lng: 68.8833 },
      "Mirzaobod tumani": { lat: 40.6833, lng: 68.7667 },
      "Oqoltin tumani": { lat: 40.6000, lng: 68.5333 },
      "Sardoba tumani": { lat: 40.0333, lng: 68.8333 },
      "Sayxunobod tumani": { lat: 40.6667, lng: 68.7667 }
    }
  },
  "Xorazm viloyati": {
    districts: {
      "Urganch shahar": { lat: 41.5500, lng: 60.6333 },
      "Xiva shahar": { lat: 41.3842, lng: 60.3581 },
      "Bog'ot tumani": { lat: 41.3222, lng: 60.8672 },
      "Gurlan tumani": { lat: 41.8442, lng: 60.3911 },
      "Xonqa tumani": { lat: 41.4272, lng: 60.8722 },
      "Hazorasp tumani": { lat: 41.3192, lng: 61.0742 },
      "Xiva tumani": { lat: 41.3842, lng: 60.3581 },
      "Qo'shko'pir tumani": { lat: 41.5350, lng: 60.3450 },
      "Shovot tumani": { lat: 41.6622, lng: 60.3022 },
      "Urganch tumani": { lat: 41.5500, lng: 60.6333 },
      "Yangiariq tumani": { lat: 41.3333, lng: 60.5583 },
      "Yangibozor tumani": { lat: 41.7211, lng: 60.8972 }
    }
  },
  "Qoraqalpog'iston": {
    districts: {
      "Nukus shahar": { lat: 42.4647, lng: 59.6142 },
      "Amudaryo tumani": { lat: 42.1500, lng: 60.1000 },
      "Beruniy tumani": { lat: 41.6911, lng: 60.7522 },
      "Chimboy tumani": { lat: 42.9311, lng: 59.7772 },
      "Ellikqala tumani": { lat: 41.9167, lng: 61.9167 },
      "Kegayli tumani": { lat: 42.7772, lng: 59.4442 },
      "Mo'ynoq tumani": { lat: 43.7683, lng: 59.0211 },
      "Nukus tumani": { lat: 42.4647, lng: 59.6142 },
      "Qonliko'l tumani": { lat: 42.8333, lng: 58.9833 },
      "Qo'ng'irot tumani": { lat: 43.0672, lng: 58.9000 },
      "Shumanay tumani": { lat: 42.7142, lng: 58.9222 },
      "Taxtako'pir tumani": { lat: 43.2000, lng: 61.3333 },
      "To'rtko'l tumani": { lat: 41.5500, lng: 61.0000 },
      "Xo'jayli tumani": { lat: 42.4083, lng: 59.4450 }
    }
  }
};

// Foydalanuvchi holatini saqlash
const userState = {};

// Start buyrug'i
bot.start((ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name;
  
  users.add(userId);
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🕌 Namoz Vaqtlari', 'prayer_times')],
    [Markup.button.callback('ℹ️ Bot Haqida', 'bot_info')]
  ]);
  
  ctx.reply(
    getBotInfo(firstName),
    {
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
});

// Asosiy menyuga qaytish
bot.action('back_to_main', (ctx) => {
  const firstName = ctx.from.first_name;
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🕌 Namoz Vaqtlari', 'prayer_times')],
    [Markup.button.callback('ℹ️ Bot Haqida', 'bot_info')]
  ]);
  
  ctx.editMessageText(
    getBotInfo(firstName),
    {
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
});

// Namoz vaqtlari menyusi
bot.action('prayer_times', (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    ...Object.keys(regions).map(region => 
      [Markup.button.callback(region, `region_${region}`)]
    ),
    [Markup.button.callback('⬅️ Orqaga', 'back_to_main')]
  ]);
  
  ctx.editMessageText(
    "🕌 **Namoz Vaqtlari**\n\nIltimos, viloyatni tanlang:",
    {
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
});

// Viloyat tanlash
bot.action(/region_(.+)/, (ctx) => {
  const region = ctx.match[1];
  const districts = Object.keys(regions[region].districts);
  
  userState[ctx.from.id] = { region };
  
  const districtButtons = [];
  for (let i = 0; i < districts.length; i += 2) {
    const row = districts.slice(i, i + 2).map(district => 
      Markup.button.callback(district, `district_${district}`)
    );
    districtButtons.push(row);
  }
  
  districtButtons.push([Markup.button.callback('⬅️ Orqaga', 'prayer_times')]);
  
  const keyboard = Markup.inlineKeyboard(districtButtons);
  
  ctx.editMessageText(
    `${region} tanlandi. Iltimos tumanni tanlang:`,
    keyboard
  );
});

// Tuman tanlash
bot.action(/district_(.+)/, async (ctx) => {
  const district = ctx.match[1];
  const userId = ctx.from.id;
  
  let coords = null;
  let regionFound = null;
  
  for (const region in regions) {
    if (regions[region].districts[district]) {
      coords = regions[region].districts[district];
      regionFound = region;
      userState[userId] = { region: regionFound, district };
      break;
    }
  }

  if (!coords) {
    return ctx.answerCbQuery("Xatolik yuz berdi!");
  }

  try {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🕌 ${district} — namoz vaqtlari olinmoqda... ⏳`);

    const response = await fetch(
      `http://api.aladhan.com/v1/timings?latitude=${coords.lat}&longitude=${coords.lng}&method=2`
    );
    const data = await response.json();

    if (!data.data || !data.data.timings) throw new Error("API xatosi");

    const times = data.data.timings;
    const date = data.data.date.readable;
    
    const nextPrayer = getNextPrayerWithTime(times);
    
    let message = `🕌 ${district} — ${date} namoz vaqtlari:\n\n`;
    
    for (const prayer of prayerOrder) {
      if (prayer === 'Sunrise') continue;
      message += `${prayerNames[prayer]}: ${times[prayer]}\n`;
    }
    
    message += `\n⏰ **Keyingi namoz:** ${nextPrayer.prayerName}\n`;
    message += `🕒 **Vaqt:** ${nextPrayer.time}\n`;
    message += `⏳ **Qolgan vaqt:** ${nextPrayer.remaining}\n\n`;
    
    message += `📍 ${regionFound}\n\n`;
    message += `🤲 *"Albatta, namoz mo'minlarga vaqtida farz qilindi"* (An-Niso: 103)`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Vaqtlarni yangilash', `district_${district}`)],
      [Markup.button.callback('⬅️ Bosh menyuga qaytish', 'back_to_main')]
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  } catch (err) {
    console.error("Xatolik:", err);
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Bosh menyuga qaytish', 'back_to_main')],
      [Markup.button.callback(`🔄 Qayta urinish`, `district_${district}`)]
    ]);
    
    await ctx.editMessageText("❌ Xatolik! Iltimos keyinroq urinib ko'ring.", {
      ...keyboard
    });
  }
});

// Bot haqida
bot.action('bot_info', async (ctx) => {
  const totalUsers = users.size;
  const totalRatings = Object.keys(userRatings).length;
  const averageRating = totalRatings > 0 
    ? (Object.values(userRatings).reduce((a, b) => a + b, 0) / totalRatings).toFixed(1)
    : "0.0";
  
  const message = `ℹ️ **Bot Haqida**

🤖 **Namoz Vaqtlari Boti**
Version: 2.0

📊 **Statistika:**
• ${Object.keys(regions).length} ta viloyat
• ${Object.values(regions).reduce((acc, region) => acc + Object.keys(region.districts).length, 0)}+ tuman va shahar
• ${totalUsers} ta foydalanuvchi
• ⭐ ${averageRating} (${totalRatings} ta baho)

👨‍💻 **Dasturchi:** Nomonov

*"Albatta, namoz mo'minlarga vaqtida farz qilindi"* (An-Niso: 103)`;
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('⭐ Baholang', 'rate_bot')],
    [Markup.button.callback('📢 Ulashing', 'share_bot')],
    [Markup.button.callback('⬅️ Orqaga', 'back_to_main')]
  ]);
  
  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  } catch (error) {
    // Xabar o'zgartirish xatosini e'tiborsiz qoldirish
  }
});

// Baholash tizimi
bot.action('rate_bot', (ctx) => {
  const userId = ctx.from.id;
  
  const message = `⭐ **Botni Baholang**

Botimiz sizga qanchalik yoqdi? Baholang:`;
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('⭐️ 1', 'rate_1'), Markup.button.callback('⭐️⭐️ 2', 'rate_2')],
    [Markup.button.callback('⭐️⭐️⭐️ 3', 'rate_3'), Markup.button.callback('⭐️⭐️⭐️⭐️ 4', 'rate_4')],
    [Markup.button.callback('⭐️⭐️⭐️⭐️⭐️ 5', 'rate_5')],
    [Markup.button.callback('⬅️ Orqaga', 'bot_info')]
  ]);
  
  ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// Baholarni qayta ishlash
const ratingHandlers = {
  'rate_1': 1, 'rate_2': 2, 'rate_3': 3, 'rate_4': 4, 'rate_5': 5
};

for (const [action, rating] of Object.entries(ratingHandlers)) {
  bot.action(action, async (ctx) => {
    const userId = ctx.from.id;
    
    userRatings[userId] = rating;
    
    await ctx.answerCbQuery(`✅ Rahmat! ${rating} baho berdingiz!`);
    
    const message = `✅ **Rahmat! Baholaganingiz uchun tashakkur!**

Siz ${rating} ⭐ baho berdingiz.`;
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📢 Boshqalarga ulashing', 'share_bot')],
      [Markup.button.callback('⬅️ Orqaga', 'bot_info')]
    ]);
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  });
}

// Ulashish - TO'LIQ TUZATILDI
bot.action('share_bot', async (ctx) => {
  const message = `📢 **Botni Ulashing**

Do'stlaringizga botni ulashing va savobga tushing!

🤖 Bot nomi: Namoz Vaqtlari Boti
🔗 Havola: https://t.me/namoz_vaqtlari_bugun_bot`;
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('📤 Telegramda Ulashish', 'https://t.me/share/url?url=https://t.me/namoz_vaqtlari_bugun_bot&text=🕌 Namoz vaqtlarini bilib oling!')],
    [Markup.button.callback('⬅️ Orqaga', 'bot_info')]
  ]);
  
  try {
    await ctx.editMessageText(message, {
      ...keyboard
    });
  } catch (error) {
    console.log("Xabar o'zgartirish xatosi:", error.message);
  }
});

// Har qanday xabarga javob
bot.on('message', (ctx) => {
  if (ctx.message.text && !ctx.message.text.startsWith('/')) {
    const firstName = ctx.from.first_name;
    users.add(ctx.from.id);
    
    ctx.reply(
      `Assalomu alaykum ${firstName || "do'st"}! Botdan foydalanish uchun /start buyrug'ini bering:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Botni ishga tushirish', 'start_bot')]
      ])
    );
  }
});

// Start bot tugmasi uchun handler
bot.action('start_bot', (ctx) => {
  const firstName = ctx.from.first_name;
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🕌 Namoz Vaqtlari', 'prayer_times')],
    [Markup.button.callback('ℹ️ Bot Haqida', 'bot_info')]
  ]);
  
  ctx.editMessageText(
    getBotInfo(firstName),
    {
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
});

// SERVER FOR RENDER
const PORT = process.env.PORT || 3000;

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🕌 Namoz Vaqtlari Boti ishlayapti!\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server ${PORT} portida ishga tushdi`);
});

// Keep-alive
setInterval(() => {
  console.log('❤️ Bot jonli... ' + new Date().toLocaleString());
}, 600000);

// Botni ishga tushirish
bot.launch().then(() => {
  console.log('🤖 Bot muvaffaqiyatli ishga tushdi!');
}).catch(err => {
  console.error('❌ Botni ishga tushirishda xatolik:', err);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));