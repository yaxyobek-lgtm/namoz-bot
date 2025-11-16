import { Telegraf, Markup } from "telegraf";
import fetch from "node-fetch";
import { createServer } from 'http';

const bot = new Telegraf(process.env.BOT_TOKEN || "8529967384:AAG3EUtygqchETc7df02LTB0ylfAPOonWGs");

// Bot tavsifi
const BOT_DESCRIPTION = `🕌 Namoz Vaqtlari Boti - O'zbekiston bo'ylab aniq namoz vaqtlari

Assalomu alaykum! Bu bot orqali siz O'zbekistonning barcha viloyat va tumanlari uchun aniq namoz vaqtlari bilib olishingiz mumkin.

📅 Xususiyatlar:
• Bugungi namoz vaqtlari
• Barcha viloyat va tumanlar uchun
• Tasodifiy Qur'on oyatlari
• Haftalik statistika

🤖 Bot: @namoz_vaqtlari_bugun_bot
👨‍💻 Dasturchi: Nomonov`;

// Bot haqida ma'lumot
function getBotInfo(firstName) {
  return `🕌 Namoz Vaqtlari Boti

Assalomu alaykum ${firstName || "do'st"}! 😊 Bu bot orqali siz:

✅ Bugungi namoz vaqtlarini bilib olishingiz mumkin
✅ O'zbekistonning barcha viloyat va tumanlari uchun aniq vaqtlar
✅ Har safar yangi Qur'on oyatlari
✅ Foydalanuvchi statistikasi

Botdan foydalanish uchun /start buyrug'ini bering yoki pastdagi tugmalardan foydalaning.`;
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

// 100+ Tasodifiy Qur'on oyatlari va hadislar
const islamicMessages = [
  `📖 "Albatta, namoz mo'minlarga vaqtida farz qilindi" (An-Niso: 103)`,
  `📖 "Namozni to'kis ado eting, zakot bering va ruku qiluvchilar bilan birga ruku qiling" (Al-Baqara: 43)`,
  `📖 "Ey mo'minlar! Sabr va namoz bilan Yordan so'rang. Albatta, Alloh sabr qiluvchilar bilan birga" (Al-Baqara: 153)`,
  `📖 "Ular namozlarini doimiy ado etadilar va Biz ulagan rizqlardan infoq qiladilar" (Al-Anfal: 3)`,
  `📖 "Namozni to'kis ado eting va Allohdan qo'rqing. Uning oldiga yig'ilasiz" (Al-An'am: 72)`,
  `📖 "O'z uylaringizga qaytganingizda, ota-onangizga va qarindoshlaringizga salom bering. Bu Allohning huzurida savobli ishdir" (An-Nur: 61)`,
  `📖 "Kimki bir yaxshilik qilsa, unga o'n barobar savob yoziladi" (Al-An'am: 160)`,
  `📖 "Alloh sizga osonlikni istaydi, qiynoqni istamaydi" (Al-Baqara: 185)`,
  `📖 "Har qiyinchilik bilan birga osonlik bor" (Ash-Sharh: 6)`,
  `📖 "Albatta, Alloh adolat qiluvchilarni, iylik qiluvchilarni va qarindoshlarga yordam beruvchilarni sevadi" (An-Nahl: 90)`,
  `🕌 "Sizlardan kim bir yomonlikni ko'rsa, uni qo'li bilan o'zgartirsin" (Hadisi Sharif)`,
  `🕌 "Mo'min boshqalarga yordam beradigan, ularning dardlarini yengillashtiradigan kishidir" (Hadisi Sharif)`,
  `🕌 "Barcha ishlaringizda o'rtachilikni tuting, chunki eng yaxshi isl o'rtacha qilinadigan isldir" (Hadisi Sharif)`,
  `🕌 "Halol rizq izlash har bir musulmon uchun farzdir" (Hadisi Sharif)`,
  `🕌 "Ota-onaga yaxshilik qiling, ularning duolari qabul qilinadi" (Hadisi Sharif)`,
  `🕌 "Ilm o'rgangan kishiga osmon va yer aholisi duo qiladi" (Hadisi Sharif)`,
  `🕌 "Halol narsadan bir lokma, harom narsadan to'la qozondan afzaldir" (Hadisi Sharif)`,
  `🕌 "Birovning ehtiyojini qondirgan kishi butun kun Allohga ibodat qilgandek savob oladi" (Hadisi Sharif)`,
  `🕌 "Yaxshi so'z - sadaqadir" (Hadisi Sharif)`,
  `🕌 "Kuchli mo'min Alloh nazdida zaif mo'mindan afzaldir" (Hadisi Sharif)`,
  `📖 "Alloh sizni ozgina sinab ko'radi" (Al-Anfal: 28)`,
  `📖 "Kim Allohga tawakkul qilsa, U unga kifoya qiladi" (At-Taloq: 3)`,
  `📖 "Alloh hech kimga uning qudratidan ortig'ini yuklamaydi" (Al-Baqara: 286)`,
  `📖 "Yaxshi so'z va kechirim, orqasidan ozor keladigan sadagadan afzaldir" (Al-Baqara: 263)`,
  `📖 "Alloh sizning amallaringizni ko'rmaydimi?" (At-Tin: 4)`,
  `📖 "Barcha jonzotlar uchun o'lim bor" (Al-Anbiyo: 35)`,
  `📖 "Dunyoning barcha bezaklari o'tkinchidir" (Al-Hadid: 20)`,
  `📖 "Har qiyinchilikdan keyin osonlik bor" (Ash-Sharh: 5)`,
  `📖 "Allohga shukr qiling, chunki u sizga bergan ne'matlari son-sanoqsiz" (Ibrohim: 34)`,
  `📖 "Yaxshi amallaringizni bekor qilmang" (Muhammad: 33)`,
  `🕌 "Halol ishlash - har bir musulmon uchun farz" (Hadisi Sharif)`,
  `🕌 "Qo'shning ochiq holda uxlasa, siz to'kin-sochin yeb uxlashingiz halol emas" (Hadisi Sharif)`,
  `🕌 "Birovning aybini izlamang, gunoh qilmang, hasad qilmang" (Hadisi Sharif)`,
  `🕌 "Eng yaxshi odam - odamlarga foydasi tegadigan kishi" (Hadisi Sharif)`,
  `🕌 "Ilm o'rgangan kishi bilan birga bo'lish - savob ishidir" (Hadisi Sharif)`,
  `🕌 "Yaxshi xulq - eng yaxshi merosdir" (Hadisi Sharif)`,
  `🕌 "Kichik gunohlarga kichik deb qarama, chunki ular jam bo'lganda katta bo'ladi" (Hadisi Sharif)`,
  `🕌 "Har bir musulmon boshqa musulmon uchun birodardir" (Hadisi Sharif)`,
  `🕌 "Sizlardan kim bir yaxshilikni boshlasa, uni davom ettirganlar uchun savob bor" (Hadisi Sharif)`,
  `🕌 "Har kim yaxshi niyat bilan bir ishni boslasa, unga to'liq savob yoziladi" (Hadisi Sharif)`,
  `📖 "Alloh sizga dushmanlik qilganlarga muhabbat bilan munosabatda bo'lishingizni buyuradi" (Fussilat: 34)`,
  `📖 "Yaxshi so'z va kechirim, orqasidan ozor keladigan sadagadan afzaldir" (Al-Baqara: 263)`,
  `📖 "Alloh sizni imtihon qilish uchun boylik va farzandlar bilan sinaydi" (Al-Anfal: 28)`,
  `📖 "Har bir inson o'z qilgan amallari uchun javobgardir" (At-Toor: 21)`,
  `📖 "Allohga qaytishingiz va undan umid qilishingiz kerak" (Az-Zumar: 53)`,
  `📖 "Dunyoviy hayot faqat o'yin-kulgi va bezakdir" (Al-Hadid: 20)`,
  `📖 "Har bir narsa Allohning irodasi bilan bo'ladi" (At-Tag'obun: 11)`,
  `📖 "Alloh sizga bergan ne'matlarini eslang" (Al-Baqara: 152)`,
  `📖 "Har qanday ishni boshlaganda Bismillah deb boshlang" (Hadisi Sharif asosida)`,
  `📖 "Alloh sizni yaratdi va sizga shakl berdi" (Al-Infitor: 7)`,
  `🕌 "Kichiklarga rahm qiling, kattalarga hurmat qiling" (Hadisi Sharif)`,
  `🕌 "Yaxshi odam - yaxshi so'zli va xushmuomala odam" (Hadisi Sharif)`,
  `🕌 "Har bir musulmon boshqa musulmonning og'rig'ini his qilishi kerak" (Hadisi Sharif)`,
  `🕌 "Yaxshi niyat - amalning qalbidir" (Hadisi Sharif)`,
  `🕌 "Har kim bir yaxshilikni ko'rsatsa, uni qilgan kabi savob oladi" (Hadisi Sharif)`,
  `🕌 "Ilm o'rgangan kishiga barcha mahlukot duo qiladi" (Hadisi Sharif)`,
  `🕌 "Yaxshi xulq - jannat kalitidir" (Hadisi Sharif)`,
  `🕌 "Har kim bir musulmonning dardini yengillashtirsa, Alloh uning dardini yengillashtiradi" (Hadisi Sharif)`,
  `🕌 "Birovga yordam berish - eng yaxshi sadaqadir" (Hadisi Sharif)`,
  `🕌 "Har bir musulmon boshqa musulmon uchun oyna bo'lishi kerak" (Hadisi Sharif)`
];

// Tasodifiy oyat/hadis tanlash
function getRandomIslamicMessage() {
  const randomIndex = Math.floor(Math.random() * islamicMessages.length);
  return islamicMessages[randomIndex];
}

// Foydalanuvchilarni saqlash
const users = new Map();
const userStats = {
  totalStarts: 0,
  dailyStarts: 0,
  lastReset: new Date().toDateString()
};

// Haftalik statistikani yangilash
function updateDailyStats() {
  const today = new Date().toDateString();
  if (userStats.lastReset !== today) {
    userStats.dailyStarts = 0;
    userStats.lastReset = today;
  }
}

// VILOYATLAR VA TUMANLAR - SIZ TO'LDIRASIZ
const regions = {
  "Toshkent shahri": {
    districts: {
      "Yunusobod": { lat: 41.3515, lng: 69.2863 },
      "Chilonzor": { lat: 41.2754, lng: 69.2044 },
      "Mirzo Ulug'bek": { lat: 41.3339, lng: 69.2275 },
      "Mirobod": { lat: 41.3289, lng: 69.2314 },
      "Olmazor": { lat: 41.3058, lng: 69.2406 },
      "Sergeli": { lat: 41.2142, lng: 69.2367 },
      "Shayxontohur": { lat: 41.3172, lng: 69.2408 },
      "Yakkasaroy": { lat: 41.2825, lng: 69.2714 },
      "Yashnobod": { lat: 41.2153, lng: 69.3019 },
      "Uchtepa": { lat: 41.2658, lng: 69.3319 }
    }
  },
  "Toshkent viloyati": {
    districts: {
      "Angren": { lat: 41.0167, lng: 70.1436 },
      "Bekobod": { lat: 40.2203, lng: 69.2236 },
      "Chirchiq": { lat: 41.4689, lng: 69.5822 },
      "Olmaliq": { lat: 40.8500, lng: 69.6000 },
      "Ohangaron": { lat: 40.9064, lng: 69.6383 },
      "Parkent": { lat: 41.2944, lng: 69.6764 },
      "Piskent": { lat: 40.8972, lng: 69.3500 },
      "Quyi Chirchiq": { lat: 41.1167, lng: 69.3667 },
      "O'rta Chirchiq": { lat: 41.2333, lng: 69.1500 },
      "Yangiyo'l": { lat: 41.1122, lng: 69.0472 },
      "Zangiota": { lat: 41.1928, lng: 69.1403 },
      "Boka": { lat: 40.8111, lng: 69.1944 },
      "Qibray": { lat: 41.3897, lng: 69.4650 },
      "Yuqori Chirchiq": { lat: 41.3500, lng: 69.5833 },
      "Oqqo'rg'on": { lat: 40.8789, lng: 72.5619 }
    }
  },
  "Farg'ona viloyati": {
    districts: {
      "Farg'ona shahar": { lat: 40.3864, lng: 71.7864 },
      "Marg'ilon shahar": { lat: 40.4714, lng: 71.7247 },
      "Qo'qon shahar": { lat: 40.5286, lng: 70.9425 },
      "Beshariq": { lat: 40.4358, lng: 70.6103 },
      "Bog'dod": { lat: 40.5375, lng: 71.1083 },
      "Buvayda": { lat: 40.6167, lng: 70.8333 },
      "Dang'ara": { lat: 40.5917, lng: 70.9167 },
      "Furqat": { lat: 40.5139, lng: 70.7647 },
      "O'zbekiston": { lat: 40.4333, lng: 70.6000 },
      "Quva": { lat: 40.5222, lng: 72.0667 },
      "Rishton": { lat: 40.3567, lng: 71.2847 },
      "So'x": { lat: 39.9667, lng: 71.1333 },
      "Toshloq": { lat: 40.4667, lng: 71.7667 },
      "Uchko'prik": { lat: 40.4333, lng: 70.9500 },
      "O'zgan": { lat: 40.3667, lng: 71.5000 },
      "Yozyovon": { lat: 40.6556, lng: 71.7444 }
    }
  },
  "Andijon viloyati": {
    districts: {
      "Andijon shahar": { lat: 40.7833, lng: 72.3333 },
      "Xonobod shahar": { lat: 40.8694, lng: 72.9889 },
      "Asaka": { lat: 40.6417, lng: 72.2389 },
      "Baliqchi": { lat: 40.8667, lng: 72.0000 },
      "Boz": { lat: 40.7333, lng: 71.9167 },
      "Buloqboshi": { lat: 40.6167, lng: 72.4667 },
      "Izboskan": { lat: 40.9167, lng: 72.2500 },
      "Jalaquduq": { lat: 40.7500, lng: 72.6667 },
      "Xo'jaobod": { lat: 40.6667, lng: 72.5667 },
      "Qo'rg'ontepa": { lat: 40.7333, lng: 72.7667 },
      "Marhamat": { lat: 40.5000, lng: 72.3167 },
      "Oltinko'l": { lat: 40.8000, lng: 72.1667 },
      "Paxtaobod": { lat: 40.9333, lng: 72.5000 },
      "Shahrixon": { lat: 40.7167, lng: 72.0667 },
      "Ulug'nor": { lat: 40.7333, lng: 71.7000 }
    }
  },
  "Namangan viloyati": {
    districts: {
      "Namangan shahar": { lat: 40.9953, lng: 71.6725 },
      "Kosonsoy": { lat: 41.2494, lng: 71.5472 },
      "Mingbuloq": { lat: 40.7667, lng: 72.7000 },
      "Norin": { lat: 40.9667, lng: 71.7167 },
      "Pop": { lat: 40.8667, lng: 71.1167 },
      "To'raqo'rg'on": { lat: 40.9967, lng: 71.5117 },
      "Uchqo'rg'on": { lat: 41.1139, lng: 72.0792 },
      "Chortoq": { lat: 41.0694, lng: 71.8233 },
      "Chust": { lat: 41.0033, lng: 71.2378 },
      "Yangiqo'rg'on": { lat: 41.1889, lng: 71.7319 },
      "Uychi": { lat: 41.0806, lng: 71.9233 }
    }
  },
  "Samarqand viloyati": {
    districts: {
      "Samarqand shahar": { lat: 39.6542, lng: 66.9597 },
      "Kattaqo'rg'on shahar": { lat: 39.9000, lng: 66.2500 },
      "Bulung'ur": { lat: 39.7667, lng: 67.2667 },
      "Ishtixon": { lat: 39.9667, lng: 66.4833 },
      "Jomboy": { lat: 39.7000, lng: 67.0833 },
      "Kattaqo'rg'on": { lat: 39.9000, lng: 66.2500 },
      "Qo'shrabot": { lat: 40.1667, lng: 66.6667 },
      "Narpay": { lat: 39.8333, lng: 65.6667 },
      "Nurobod": { lat: 39.5000, lng: 66.2500 },
      "Oqdaryo": { lat: 39.9167, lng: 66.1667 },
      "Paxtachi": { lat: 40.2167, lng: 67.9500 },
      "Payariq": { lat: 39.8333, lng: 66.9167 },
      "Pastdarg'om": { lat: 39.7167, lng: 66.6667 },
      "Toyloq": { lat: 39.5833, lng: 66.8333 },
      "Urgut": { lat: 39.4022, lng: 67.2431 }
    }
  },
  "Buxoro viloyati": {
    districts: {
      "Buxoro shahar": { lat: 39.7667, lng: 64.4333 },
      "Kogon shahar": { lat: 39.7225, lng: 64.5517 },
      "Olot": { lat: 39.4167, lng: 63.8000 },
      "Buxoro tumani": { lat: 39.7667, lng: 64.4333 },
      "Vobkent": { lat: 39.7167, lng: 64.5167 },
      "G'ijduvon": { lat: 40.1000, lng: 64.6833 },
      "Jondor": { lat: 39.7167, lng: 63.9000 },
      "Kogon tumani": { lat: 39.7225, lng: 64.5517 },
      "Qorako'l": { lat: 39.8333, lng: 63.8333 },
      "Qorovulbozor": { lat: 39.5000, lng: 64.8000 },
      "Peshku": { lat: 40.1667, lng: 63.5000 },
      "Romitan": { lat: 39.9333, lng: 64.3833 },
      "Shofirkon": { lat: 40.1167, lng: 64.5000 }
    }
  },
  "Xorazm viloyati": {
    districts: {
      "Urganch shahar": { lat: 41.5500, lng: 60.6333 },
      "Xiva shahar": { lat: 41.3842, lng: 60.3581 },
      "Bog'ot": { lat: 41.3167, lng: 60.8500 },
      "Gurlan": { lat: 41.8333, lng: 60.3833 },
      "Qo'shko'pir": { lat: 41.5350, lng: 60.3450 },
      "Urganch tumani": { lat: 41.5500, lng: 60.6333 },
      "Xiva tumani": { lat: 41.3842, lng: 60.3581 },
      "Xonqa": { lat: 41.4269, lng: 60.8667 },
      "Yangiariq": { lat: 41.3333, lng: 60.5667 },
      "Yangibozor": { lat: 41.7211, lng: 60.8972 },
      "Shovot": { lat: 41.6558, lng: 60.3025 },
      "Hazorasp": { lat: 41.3194, lng: 61.0742 }
    }
  },
  "Navoiy viloyati": {
    districts: {
      "Navoiy shahar": { lat: 40.0844, lng: 65.3792 },
      "Zarafshon shahar": { lat: 41.5667, lng: 64.2000 },
      "Karmana": { lat: 40.1333, lng: 65.3667 },
      "Konimex": { lat: 40.2756, lng: 65.1519 },
      "Navbahor": { lat: 40.1667, lng: 65.4167 },
      "Nurota": { lat: 40.5614, lng: 65.6886 },
      "Qiziltepa": { lat: 40.0333, lng: 64.8500 },
      "Tomdi": { lat: 42.1000, lng: 64.5167 },
      "Uchquduq": { lat: 42.1564, lng: 63.5522 },
      "Xatirchi": { lat: 40.1833, lng: 65.9167 }
    }
  },
  "Qashqadaryo viloyati": {
    districts: {
      "Qarshi shahar": { lat: 38.8667, lng: 65.8000 },
      "Shahrisabz shahar": { lat: 39.0578, lng: 66.8342 },
      "Chiroqchi": { lat: 39.0333, lng: 66.5667 },
      "Dehqonobod": { lat: 38.3167, lng: 66.6167 },
      "G'uzor": { lat: 38.6167, lng: 66.2500 },
      "Qamashi": { lat: 38.8333, lng: 66.4500 },
      "Qarshi tumani": { lat: 38.8667, lng: 65.8000 },
      "Koson": { lat: 39.0375, lng: 65.5850 },
      "Kasbi": { lat: 39.0333, lng: 65.5000 },
      "Kitob": { lat: 39.1167, lng: 66.8833 },
      "Mirishkor": { lat: 38.7667, lng: 65.5333 },
      "Muborak": { lat: 39.2553, lng: 65.1528 },
      "Nishon": { lat: 38.6667, lng: 65.6667 },
      "Shahrisabz tumani": { lat: 39.0578, lng: 66.8342 },
      "Yakkabog'": { lat: 38.9667, lng: 66.6833 }
    }
  },
  "Surxondaryo viloyati": {
    districts: {
      "Termiz shahar": { lat: 37.2242, lng: 67.2783 },
      "Angor": { lat: 37.5000, lng: 67.0000 },
      "Bandixon": { lat: 37.9667, lng: 67.1833 },
      "Boysun": { lat: 38.2000, lng: 67.2000 },
      "Denov": { lat: 38.2672, lng: 67.8989 },
      "Jarqo'rg'on": { lat: 37.5167, lng: 67.4000 },
      "Qiziriq": { lat: 37.6667, lng: 67.2500 },
      "Qumqo'rg'on": { lat: 37.8333, lng: 67.5833 },
      "Muzrabot": { lat: 37.7667, lng: 66.5333 },
      "Oltinsoy": { lat: 38.1000, lng: 67.9000 },
      "Sariosiyo": { lat: 38.4167, lng: 67.9667 },
      "Termiz tumani": { lat: 37.2242, lng: 67.2783 },
      "Uzun": { lat: 38.1667, lng: 68.0000 },
      "Sherobod": { lat: 37.6667, lng: 67.0167 },
      "Sho'rchi": { lat: 37.9994, lng: 67.7875 }
    }
  },
  "Jizzax viloyati": {
    districts: {
      "Jizzax shahar": { lat: 40.1167, lng: 67.8500 },
      "Arnasoy": { lat: 40.5333, lng: 67.7167 },
      "Baxmal": { lat: 39.7500, lng: 67.6667 },
      "Do'stlik": { lat: 40.5247, lng: 68.0358 },
      "Forish": { lat: 40.3833, lng: 67.2333 },
      "G'allaorol": { lat: 40.1333, lng: 67.8667 },
      "Sharof Rashidov": { lat: 40.1667, lng: 67.8333 },
      "Mirzacho'l": { lat: 40.6667, lng: 68.3333 },
      "Paxtakor": { lat: 40.3167, lng: 67.9500 },
      "Yangiobod": { lat: 40.5667, lng: 68.8333 },
      "Zomin": { lat: 39.9667, lng: 68.4000 },
      "Zafarobod": { lat: 40.3833, lng: 67.8167 },
      "Zarbdor": { lat: 40.1667, lng: 68.5000 }
    }
  },
  "Sirdaryo viloyati": {
    districts: {
      "Guliston shahar": { lat: 40.4897, lng: 68.7842 },
      "Yangiyer shahar": { lat: 40.2750, lng: 68.8225 },
      "Shirin shahar": { lat: 40.2917, lng: 69.0667 },
      "Boyovut": { lat: 40.7167, lng: 69.2000 },
      "Guliston tumani": { lat: 40.4897, lng: 68.7842 },
      "Xovos": { lat: 40.3000, lng: 68.8667 },
      "Mirzaobod": { lat: 40.6667, lng: 68.8333 },
      "Oqoltin": { lat: 40.6000, lng: 69.0000 },
      "Sardoba": { lat: 40.5500, lng: 68.1667 },
      "Sayxunobod": { lat: 40.6667, lng: 68.6667 },
      "Sirdaryo tumani": { lat: 40.8500, lng: 68.6667 }
    }
  },
  "Qoraqalpog'iston Respublikasi": {
    districts: {
      "Nukus shahar": { lat: 42.4647, lng: 59.6022 },
      "Amudaryo": { lat: 42.4167, lng: 59.9667 },
      "Beruniy": { lat: 41.6911, lng: 60.7525 },
      "Chimboy": { lat: 42.9333, lng: 59.7833 },
      "Ellikqala": { lat: 41.9167, lng: 61.9167 },
      "Kegayli": { lat: 42.7767, lng: 59.8078 },
      "Mo'ynoq": { lat: 43.7683, lng: 59.0214 },
      "Nukus tumani": { lat: 42.4647, lng: 59.6022 },
      "Qonliko'l": { lat: 43.0333, lng: 58.8500 },
      "Qo'ng'irot": { lat: 43.0639, lng: 58.9044 },
      "Shumanay": { lat: 42.7147, lng: 58.0619 },
      "Taxtako'pir": { lat: 43.2000, lng: 61.3333 },
      "To'rtko'l": { lat: 41.5500, lng: 61.0000 },
      "Xo'jayli": { lat: 42.4000, lng: 59.4500 }
    }
  }
};

// Foydalanuvchi holatini saqlash
const userState = {};

// Start buyrug'i
bot.start((ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name;
  const username = ctx.from.username;
  
  // Statistikani yangilash
  updateDailyStats();
  userStats.totalStarts++;
  userStats.dailyStarts++;
  
  // Foydalanuvchini qo'shish
  users.set(userId, {
    name: firstName,
    username: username,
    firstSeen: new Date(),
    lastSeen: new Date(),
    startCount: (users.get(userId)?.startCount || 0) + 1
  });
  
  console.log(`👤 Yangi foydalanuvchi: ${firstName} (${username || 'username yo\'q'}) - Jami: ${users.size}`);
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🕌 Namoz Vaqtlari', 'prayer_times')],
    [Markup.button.callback('ℹ️ Bot Haqida', 'bot_info')],
    [Markup.button.callback('📊 Statistika', 'show_stats')]
  ]);
  
  ctx.reply(
    getBotInfo(firstName),
    {
      ...keyboard
    }
  );
});

// Statistika ko'rsatish
bot.action('show_stats', async (ctx) => {
  const totalUsers = users.size;
  
  const message = `📊 Bot Statistikasi

👥 Foydalanuvchilar:
• Jami: ${totalUsers} ta
• Bugun: ${userStats.dailyStarts} marta

📈 Umumiy:
• Start bosish: ${userStats.totalStarts} marta
• Viloyatlar: ${Object.keys(regions).length} ta
• Tumanlar: ${Object.values(regions).reduce((acc, region) => acc + Object.keys(region.districts).length, 0)}+ ta
• Qur'on oyatlari: ${islamicMessages.length} ta

🔄 Oxirgi yangilanish: ${new Date().toLocaleString()}`;
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Yangilash', 'show_stats')],
    [Markup.button.callback('⬅️ Orqaga', 'back_to_main')]
  ]);
  
  try {
    await ctx.editMessageText(message, {
      ...keyboard
    });
  } catch (error) {
    await ctx.reply(message, { ...keyboard });
  }
});

// Asosiy menyuga qaytish
bot.action('back_to_main', (ctx) => {
  const firstName = ctx.from.first_name;
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🕌 Namoz Vaqtlari', 'prayer_times')],
    [Markup.button.callback('ℹ️ Bot Haqida', 'bot_info')],
    [Markup.button.callback('📊 Statistika', 'show_stats')]
  ]);
  
  ctx.editMessageText(
    getBotInfo(firstName),
    {
      ...keyboard
    }
  );
});

// Namoz vaqtlari menyusi
bot.action('prayer_times', (ctx) => {
  // Foydalanuvchi faolligini yangilash
  const userId = ctx.from.id;
  if (users.has(userId)) {
    const user = users.get(userId);
    user.lastSeen = new Date();
    users.set(userId, user);
  }
  
  const keyboard = Markup.inlineKeyboard([
    ...Object.keys(regions).map(region => 
      [Markup.button.callback(region, `region_${region}`)]
    ),
    [Markup.button.callback('⬅️ Orqaga', 'back_to_main')]
  ]);
  
  ctx.editMessageText(
    "🕌 Namoz Vaqtlari\n\nIltimos, viloyatni tanlang:",
    {
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
      `http://api.aladhan.com/v1/timings?latitude=${coords.lat}&longitude=${coords.lng}&method=2&timezonestring=Asia/Tashkent`
    );
    const data = await response.json();

    if (!data.data || !data.data.timings) throw new Error("API xatosi");

    const times = data.data.timings;
    const date = data.data.date.readable;
    
    // Tasodifiy oyat/hadis tanlash
    const randomMessage = getRandomIslamicMessage();
    
    let message = `🕌 ${district} — ${date}\n\n`;
    message += `📅 Bugungi namoz vaqtlari:\n\n`;
    
    for (const prayer of prayerOrder) {
      if (prayer === 'Sunrise') continue;
      message += `${prayerNames[prayer]}: ${times[prayer]}\n`;
    }
    
    message += `\n📍 ${regionFound}\n\n`;
    message += `${randomMessage}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Vaqtlarni yangilash', `district_${district}`)],
      [Markup.button.callback('📖 Yangi oyat', `new_verse_${district}`)],
      [Markup.button.callback('⬅️ Bosh menyuga qaytish', 'back_to_main')]
    ]);

    await ctx.editMessageText(message, {
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

// Yangi oyat tugmasi
bot.action(/new_verse_(.+)/, async (ctx) => {
  const district = ctx.match[1];
  const userId = ctx.from.id;
  
  let coords = null;
  let regionFound = null;
  
  for (const region in regions) {
    if (regions[region].districts[district]) {
      coords = regions[region].districts[district];
      regionFound = region;
      break;
    }
  }

  try {
    await ctx.answerCbQuery();
    
    const response = await fetch(
      `http://api.aladhan.com/v1/timings?latitude=${coords.lat}&longitude=${coords.lng}&method=2&timezonestring=Asia/Tashkent`
    );
    const data = await response.json();

    if (!data.data || !data.data.timings) throw new Error("API xatosi");

    const times = data.data.timings;
    const date = data.data.date.readable;
    
    // Yangi tasodifiy oyat/hadis tanlash
    const randomMessage = getRandomIslamicMessage();
    
    let message = `🕌 ${district} — ${date}\n\n`;
    message += `📅 Bugungi namoz vaqtlari:\n\n`;
    
    for (const prayer of prayerOrder) {
      if (prayer === 'Sunrise') continue;
      message += `${prayerNames[prayer]}: ${times[prayer]}\n`;
    }
    
    message += `\n📍 ${regionFound}\n\n`;
    message += `${randomMessage}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Vaqtlarni yangilash', `district_${district}`)],
      [Markup.button.callback('📖 Yangi oyat', `new_verse_${district}`)],
      [Markup.button.callback('⬅️ Bosh menyuga qaytish', 'back_to_main')]
    ]);

    await ctx.editMessageText(message, {
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
  
  const message = `ℹ️ Bot Haqida

🤖 Namoz Vaqtlari Boti
Version: 2.2

📊 Statistika:
• ${Object.keys(regions).length} ta viloyat
• ${Object.values(regions).reduce((acc, region) => acc + Object.keys(region.districts).length, 0)}+ tuman va shahar
• ${totalUsers} ta foydalanuvchi
• ${islamicMessages.length} ta Qur'on oyati va hadis

🌟 Yangi xususiyatlar:
• Tasodifiy Qur'on oyatlari
• Yangi oyat tugmasi
• Foydalanuvchi statistikasi

👨‍💻 Dasturchi: Nomonov

"Har safar yangi ilhom va sabab"`;
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📢 Ulashing', 'share_bot')],
    [Markup.button.callback('📊 Statistika', 'show_stats')],
    [Markup.button.callback('⬅️ Orqaga', 'back_to_main')]
  ]);
  
  try {
    await ctx.editMessageText(message, {
      ...keyboard
    });
  } catch (error) {}
});

// Ulashish
bot.action('share_bot', async (ctx) => {
  const message = `📢 Botni Ulashing

Do'stlaringizga botni ulashing va savobga tushing!

🤖 Bot nomi: Namoz Vaqtlari Boti
🔗 Havola: https://t.me/namoz_vaqtlari_bugun_bot
  
📊 Bot statistikasi:
• ${users.size} ta foydalanuvchi
• ${Object.keys(regions).length} ta viloyat
• ${Object.values(regions).reduce((acc, region) => acc + Object.keys(region.districts).length, 0)}+ tuman
• ${islamicMessages.length} ta Qur'on oyati`;
  
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
    const userId = ctx.from.id;
    
    users.set(userId, {
      name: firstName,
      username: ctx.from.username,
      firstSeen: new Date(),
      lastSeen: new Date(),
      startCount: (users.get(userId)?.startCount || 0) + 1
    });
    
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
    [Markup.button.callback('ℹ️ Bot Haqida', 'bot_info')],
    [Markup.button.callback('📊 Statistika', 'show_stats')]
  ]);
  
  ctx.editMessageText(
    getBotInfo(firstName),
    {
      ...keyboard
    }
  );
});

// SERVER FOR RENDER
const PORT = process.env.PORT || 3000;

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(BOT_DESCRIPTION);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server ${PORT} portida ishga tushdi`);
});

// Keep-alive
setInterval(() => {
  console.log('❤️ Bot jonli... ' + new Date().toLocaleString());
  console.log(`👥 Foydalanuvchilar: ${users.size} ta`);
}, 600000); // 10 daqiqa

// Botni ishga tushirish
bot.launch().then(() => {
  console.log('🤖 Bot muvaffaqiyatli ishga tushdi!');
  console.log(`📊 Boshlang'ich statistika: ${users.size} ta foydalanuvchi`);
}).catch((error) => {
  console.error('❌ Botni ishga tushirishda xato:', error);
});

// Graceful shutdown
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  console.log('🔄 Bot toxtatildi (SIGINT)');
});

process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  console.log('🔄 Bot toxtatildi (SIGTERM)');
});