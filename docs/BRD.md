# Business Requirements Document (BRD)
## Shaharlararo Taxi Xizmati — Telegram Platformasi

**Versiya:** 1.0
**Sana:** 2026-06-14
**Holat:** Qoralama

---

## 1. Loyiha Haqida Umumiy Ma'lumot

### 1.1 Maqsad

O'zbekistondagi shaharlararo yo'nalishlarda harakatlanadigan taksi haydovchilarini yo'lovchilar bilan samarali ulash uchun Telegram platformasiga asoslangan raqamli xizmat yaratish.

### 1.2 Muammo

- Yo'lovchilar shaharlararo taksi topish uchun tanishlar yoki ko'cha bozorlariga murojaat qiladi
- Haydovchilar yo'l davomida bo'sh o'rinlarini to'ldira olmaydi
- Narx va vaqt bo'yicha kelishuvda shaffoflik yo'q
- Xavfsizlik va ishonchlilik kafolati yo'q

### 1.3 Yechim

Ikki tomonlama Telegram platforma:
- **Yo'lovchilar uchun** — Telegram Mini App (interfeys orqali buyurtma)
- **Haydovchilar uchun** — Telegram Bot (chat orqali boshqaruv)

---

## 2. Foydalanuvchilar

| Rol | Tavsif |
|-----|--------|
| **Yo'lovchi (Passenger)** | Shaharlararo safar uchun o'rin izlovchi foydalanuvchi |
| **Haydovchi (Driver)** | Ro'yxatdan o'tgan taksi haydovchisi |
| **Admin** | Platformani boshqaruvchi operator |

---

## 3. Funksional Talablar

### 3.1 Yo'lovchi — Telegram Mini App

#### Ro'yxatdan o'tish
- [ ] Telegram akkaunt orqali avtomatik identifikatsiya
- [ ] Ism — Telegram profilidan avtomatik olinadi
- [ ] Telefon raqam — Telegram "Contact ulashish" tugmasi orqali so'raladi

#### Buyurtma yaratish
- [ ] Chiqish va borish joyi uchun ikki bosqichli tanlash:
  - **1-bosqich:** Shahar tanlash (dropdown — O'zbekiston shaharlari ro'yxati)
  - **2-bosqich:** Shahar ichidagi joy — qidiruv maydoni orqali aniqlashtirish
    - Rasmiy nom (tuman, ko'cha) bilan qidirish
    - Mahalliy sheva va qisqartma nomlar bilan ham qidirish (masalan: "Vokzal", "Bekat", "Shayx", "Mirzo", "Farish bozor", "To'rtko'l")
    - Mashhur mo'ljallar (bozor, masjid, kasalxona, avtoturargoh) bo'yicha qidirish
    - Topilgan joylarni tanlash yoki o'zi matn kiritish
- [ ] Shahar tanlanganda yo'nalish bo'yicha **bugungi faol haydovchilar soni** ko'rsatiladi (masalan: "Bugun 8 ta haydovchi mavjud")
- [ ] "Tez ketaman" belgisi — haydovchilarga buyurtma ustuvor tarzda yuboriladi
- [ ] Safar sanasi va vaqtini belgilash
- [ ] O'rin turi tanlash:
  - **"Butun mashina"** — bitta haydovchi butun mashinani oladi
  - **"N ta o'rin"** — faqat kerak bo'lgan o'rinlar soni (1–4)
- [ ] Bagaj borligini belgilash (checkbox: yo'q / kichik / katta)
- [ ] **O'zi xohlagan narxni kiritish (so'mda)** — yo'nalish bo'yicha bozor narx diapazoni ko'rsatiladi: "Min: 80,000 | O'rt: 110,000 | Maks: 150,000 so'm"
- [ ] Qo'shimcha izoh (manzil va h.k.)
- [ ] Buyurtmani yuborish

#### Takliflarni ko'rish va tanlash
- [ ] Haydovchilardan kelgan takliflar narx bo'yicha **o'sish tartibida** ro'yxatda ko'rsatiladi
- [ ] Har bir taklif kartasida: haydovchi ismi, taklif qilgan narx, reyting, ⭐ (sevimli belgisi)
- [ ] Taklif tanlash → haydovchining telefon raqami ochiladi
- [ ] Mijoz haydovchi bilan mustaqil bog'lanadi (bot orqali emas)

#### Sevimli haydovchilar
- [ ] Safardan keyin haydovchini "Sevimlilar"ga qo'shish imkoniyati
- [ ] Yangi buyurtma yaratishda "Sevimli haydovchilarga ham yuborish" opsiyasi
- [ ] Sevimli haydovchi taklif berganda takliflar ro'yxatida ⭐ bilan ajratiladi
- [ ] Sevimlilar ro'yxatidan to'g'ridan-to'g'ri haydovchiga buyurtma yuborish

#### Buyurtma holati (timeline)
- [ ] Buyurtma sahifasida jonli holat ko'rsatkichi:
  - ✅ Buyurtma yaratildi
  - 👁 Nechta haydovchi ko'rdi
  - 💬 Nechta taklif keldi
  - ✅ Haydovchi tanlandi / ⏳ Muddat tugadi
- [ ] Yangi taklif kelganda badge va notification

#### Buyurtma boshqaruvi
- [ ] Buyurtmani bekor qilish (haydovchi tanlanmaguncha)
- [ ] Faol va o'tgan buyurtmalar tarixi
- [ ] Muddat uzaytirish: buyurtma yopilishiga 15 daqiqa qolganda bot so'raydi: **"Buyurtmangizni 1 soatga uzaytirsinmi?"** — yo'lovchi bir tugma bilan uzaytiradi; uzaytirish bir marta mumkin

#### Tarix va baho
- [ ] O'tgan safarlar tarixi
- [ ] Haydovchiga baho qo'yish (1–5 yulduz) va izoh yozish

---

### 3.2 Haydovchi — Telegram Bot

#### Ro'yxatdan o'tish
- [ ] `/start` buyrug'i orqali Telegram akkaunt orqali avtomatik kirish
- [ ] Ism — Telegram profilidan avtomatik olinadi
- [ ] Telefon raqam — Telegram "Contact ulashish" tugmasi orqali so'raladi
- [ ] **Marshrutlarga obuna bo'lish** — haydovchi muntazam qatnayigan yo'nalishlarini tanlaydi (bir yoki bir necha marshrut). Faqat shu yo'nalishlardagi buyurtmalar keladi

#### Marshrutlarni boshqarish
- [ ] Obuna bo'lgan marshrutlarni ko'rish va o'zgartirish (`/routes`)
- [ ] Yangi marshrut qo'shish yoki mavjudini o'chirish

#### Narx so'rovi (Bozor narxini aniqlash)
- [ ] Tizim vaqti-vaqtida obuna bo'lgan haydovchilarga so'rov yuboradi: "Toshkent → Samarqand yo'nalishi uchun hozirgi narxingiz?"
- [ ] Haydovchi botda narxini kiritadi (ixtiyoriy, lekin rag'batlantiriladi)
- [ ] Narx ma'lumotlari ikki manbadan yig'iladi:
  - **So'rov javoblari** — haydovchilar vaqti-vaqtida bildirgan narxlar
  - **Haqiqiy takliflar** — platformada berilgan va qabul qilingan takliflar narxi
- [ ] Har bir yo'nalish bo'yicha avtomatik hisoblanadi:
  - **Minimal narx** — oxirgi 30 kundagi eng past qabul qilingan taklif
  - **Maksimal narx** — oxirgi 30 kundagi eng yuqori qabul qilingan taklif
  - **O'rtacha narx** — oxirgi 30 kundagi o'rtacha
- [ ] Bu uch ko'rsatkich mijozga buyurtma yaratishda ko'rsatiladi (masalan: "Min: 80,000 | O'rt: 110,000 | Maks: 150,000 so'm")

#### "Hozir yo'lda" rejimi
- [ ] Haydovchi `/onroad` buyrug'i yoki tugma orqali "Hozir yo'ldaman" holatini yoqadi
  - Marshrut (chiqish → borish)
  - Bo'sh o'rinlar soni
- [ ] Tizim shu marshrutdagi **"Tez ketaman"** belgili buyurtmalarni haydovchiga darhol yuboradi
- [ ] Haydovchi manzilga yetgach holat avtomatik o'chadi yoki `/offroad` orqali o'chiradi

#### Buyurtmalarni ko'rish va taklif berish
- [ ] Yangi buyurtma kelganda bot xabar jo'natishi:
  - Yo'nalish (shahar, joy → shahar, joy) — masalan: "Toshkent, Vokzal → Samarqand, Siyob bozor"
  - Sana va vaqt
  - O'rin turi (butun mashina / N ta o'rin) va bagaj holati
  - Mijoz taklif qilgan narx
- [ ] Inline tugmalar orqali ikki variant:
  - **"Rozi bo'laman"** — mijoz narxiga qo'shilish
  - **"Narx taklif qilaman"** — o'z narxini kiritish va mijozga yuborish
- [ ] Bir buyurtmaga bir marta taklif berish imkoniyati
- [ ] Mijoz tanlagan taqdirda haydovchiga notification (ism va telefon raqami ochiladi)
- [ ] Taklif tarixi (`/offers`)

#### Statistika
- [ ] O'tgan safarlar va daromad statistikasi (`/history`)

---

### 3.3 Admin Panel

- [ ] Haydovchilarni tasdiqlash / bloklash
- [ ] Reyslar va buyurtmalar monitoringi
- [ ] Foydalanuvchilar ro'yxati va statistika
- [ ] Shikoyatlarni ko'rish va hal qilish
- [ ] Yo'nalishlar bo'yicha narx statistikasini kuzatish (min/maks/o'rta — bozordan avtomatik)

---

## 4. Biznes Qoidalar

| # | Qoida |
|---|-------|
| BR-01 | Haydovchi faqat obuna bo'lgan marshrut(lar)dagi buyurtmalarni ko'radi |
| BR-02 | Haydovchi bir buyurtmaga faqat bir marta taklif bera oladi |
| BR-03 | Yo'lovchi haydovchi tanlamaguncha buyurtmani bekor qilishi mumkin |
| BR-04 | Haydovchi taklif narxi mijoz narxidan yuqori bo'lishi mumkin (counter-offer) |
| BR-05 | Mijoz tanlagan haydovchining telefon raqami ochiladi; boshqalarniki ochilmaydi |
| BR-06 | Takliflar ro'yxati narx bo'yicha o'sish tartibida saralanadi; sevimli haydovchilar ⭐ bilan belgilanadi |
| BR-07 | Buyurtma yaratilgandan 2 soat o'tsa va hech kim tanlanmasa — buyurtma avtomatik yopiladi; yopilishdan 15 daqiqa oldin yo'lovchiga uzaytirish taklifi yuboriladi (bir marta, 1 soatga) |
| BR-08 | Narx statistikasi (min/maks/o'rta) faqat so'rov javoblari emas, haqiqiy qabul qilingan takliflar asosida hisoblanadi |
| BR-09 | Yo'nalish bo'yicha kamida 5 ta ma'lumot nuqtasi bo'lganda narx diapazoni ko'rsatiladi; kamroq bo'lsa ko'rsatilmaydi |
| BR-10 | Narx statistikasi oxirgi 30 kun oynasida yangilanib turadi |
| BR-11 | Narx faqat so'mda ko'rsatiladi |
| BR-12 | Haydovchi reytingi 3.0 dan pastga tushsa, hisobi to'xtatiladi |

---

## 5. Texnik Talablar

### 5.1 Stack

| Komponent | Texnologiya |
|-----------|-------------|
| Til | TypeScript (Node.js 20+) |
| Backend API | Fastify |
| Telegram Bot | grammY |
| Telegram Mini App | HTML/CSS/JS + Telegram Web App SDK |
| Ma'lumotlar bazasi | PostgreSQL |
| ORM | Prisma |
| Cache | Redis |
| Xabar navbati | BullMQ (Redis-based) |
| Hosting | Linux server / Docker |

### 5.2 Integratsiyalar

- **Telegram Bot API** — bot xabarlari, inline klaviatura
- **Telegram Mini App API** — Web App init data, foydalanuvchi autentifikatsiyasi

### 5.3 Xavfsizlik

- Telegram `initData` hash tekshiruvi (HMAC-SHA256)
- JWT token autentifikatsiya (Mini App ↔ Backend)
- Haydovchi hujjatlarini saqlashda shifrlash
- Rate limiting (API va bot)

---

## 6. Funksional Bo'lmagan Talablar

| Talab | Ko'rsatkich |
|-------|-------------|
| Mavjudlik (Uptime) | ≥ 99.5% |
| API javob vaqti | < 500ms (95-percentil) |
| Bir vaqtdagi foydalanuvchilar | ≥ 1,000 |
| Ma'lumotlar zaxirasi | Har kuni avtomatik |
| Til | O'zbek |

---

## 7. Sahifalar va Ekranlar (Mini App)

```
Mini App
├── Bosh sahifa
│   ├── Yangi buyurtma yaratish tugmasi
│   └── Faol buyurtmam + kelgan takliflar soni (badge)
├── Buyurtma yaratish
│   ├── Chiqish: shahar tanlash → joy qidirish (mahalliy nom/sheva qo'llab-quvvatlanadi)
│   ├── Borish: shahar tanlash → joy qidirish (mahalliy nom/sheva qo'llab-quvvatlanadi)
│   ├── Sana/vaqt
│   ├── O'rin turi: "Butun mashina" | "N ta o'rin"
│   ├── Bagaj: yo'q | kichik | katta
│   ├── Narx kiritish + o'rtacha bozor narxi maslahat sifatida
│   └── Tasdiqlash
├── Takliflar sahifasi (buyurtma bo'yicha)
│   ├── Takliflar ro'yxati (narx bo'yicha o'sish tartibi)
│   │   └── Karta: ism, narx, reyting, ⭐ (sevimli bo'lsa)
│   └── Tanlash → telefon raqami ochiladi
├── Buyurtmalarim
│   ├── Faol — timeline holati bilan (ko'rdi / taklif / tanlandi)
│   └── Tarix
├── Sevimli haydovchilar
│   ├── Saqlangan haydovchilar ro'yxati
│   └── To'g'ridan-to'g'ri buyurtma yuborish
└── Profil
    ├── Shaxsiy ma'lumotlar
    └── Baholar
```

---

## 8. Bot Buyruqlari (Haydovchi)

```
/start       — Ro'yxatdan o'tish / Bosh menyu
/routes      — Obuna bo'lgan marshrutlarim (qo'shish / o'chirish)
/onroad      — "Hozir yo'ldaman" holatini yoqish
/offroad     — "Hozir yo'ldaman" holatini o'chirish
/offers      — Mening takliflarim (holat: kutilmoqda / tanlandi / rad etildi)
/history     — Tarix
/earnings    — Daromad statistikasi
/profile     — Profil ma'lumotlari
/help        — Yordam
```

---

## 9. Bildirishnomalar (Notifications)

| Hodisa | Yo'lovchi | Haydovchi |
|--------|-----------|-----------|
| Yangi buyurtma (obuna marshrut bo'yicha) | — | ✅ Bot xabar |
| Haydovchi taklif berdi | ✅ Mini App badge yangilanadi | — |
| Sevimli haydovchi taklif berdi | ✅ Bot xabar (alohida) | — |
| Mijoz taklif tanladi | — | ✅ Bot xabar + mijoz telefoni |
| Buyurtma bekor qilindi | — | ✅ Bot xabar (taklif berib bo'lgan bo'lsa) |
| Buyurtma muddati tugashiga 15 daqiqa qoldi | ✅ Bot: "Uzaytirsinmi?" tugmasi | — |
| Buyurtma muddati tugadi (hech kim tanlanmadi) | ✅ Bot xabar | — |
| Narx so'rovi keldi | — | ✅ Bot xabar (javob berish ixtiyoriy) |
| "Tez ketaman" buyurtma keldi (yo'lda bo'lsa) | — | ✅ Bot xabar (ustuvor) |

---

## 10. Rivojlanish Bosqichlari (Faza)

### Faza 1 — MVP (6–8 hafta)
- Haydovchi bot: ro'yxatdan o'tish, marshrut obunasi, buyurtma ko'rish, narx taklif qilish
- Yo'lovchi Mini App: buyurtma yaratish (o'rin turi, bagaj, narx), takliflar ro'yxati, haydovchi tanlash
- Narx so'rovi tizimi: haydovchilardan marshrut narxlarini yig'ish, o'rtacha narxni hisoblash
- Sevimli haydovchilar: saqlash va to'g'ridan-to'g'ri buyurtma
- Admin: foydalanuvchilarni bloklash (Telegram orqali)

### Faza 2 — Takomillashtirish (4–6 hafta)
- Baho va izoh tizimi
- Statistika va daromad hisoboti
- Admin web panel
- SMS tasdiqlash (ixtiyoriy)

### Faza 3 — Kengaytirish (keyingi)
- To'lov integratsiyasi (Payme, Click)
- Push-notification tizimi
- Ko'p til qo'llab-quvvatlash
- Mobil ilova (ixtiyoriy)

---

## 11. Muvaffaqiyat Ko'rsatkichlari (KPI)

| Ko'rsatkich | Maqsad (3 oy) |
|-------------|---------------|
| Ro'yxatdan o'tgan haydovchilar | ≥ 200 |
| Faol yo'lovchilar (oylik) | ≥ 2,000 |
| Muvaffaqiyatli safarlar | ≥ 5,000 |
| O'rtacha reyting | ≥ 4.2 |
| Bekor qilish darajasi | ≤ 10% |

---

---

## 12. Qamrov Tashqarisidagi Xususiyatlar (Out of Scope)

Quyidagi xususiyatlar hozirgi versiyaga kirmaydi va keyingi bosqichlar uchun qayta ko'rib chiqilishi mumkin:

| Xususiyat | Sabab |
|-----------|-------|
| Haydovchi muntazam jadval belgilashi | Marshrut obunasi va "Hozir yo'lda" rejimi yetarli; jadval murakkablikni oshiradi |
| Qaytish yo'nalishi opsiyasi | Yo'lovchi alohida buyurtma orqali hal qila oladi |
| Sharh teglari (tag-based review) | Oddiy yulduz reyting MVP uchun yetarli |
| Jins imtiyozi (gender filter) | Keyingi bosqich uchun ko'rib chiqiladi |
| Ixtiyoriy avtomobil ma'lumoti | Keyingi bosqich uchun ko'rib chiqiladi |
| Haydovchi javob vaqti limiti | Keyingi bosqich uchun ko'rib chiqiladi |
| Safardan keyin avtomat xulosa xabari | Keyingi bosqich uchun ko'rib chiqiladi |
| Bloklash imkoniyati | Keyingi bosqich uchun ko'rib chiqiladi |
| Posylka/jo'natma xizmati | Alohida katta funksional blok; keyingi bosqich |
| Oraliq to'xtash nuqtalari (waypoints) | Murakkab marshrut logikasi; keyingi bosqich |
| "Keyingi safar xabardor qil" (watchlist) | Keyingi bosqich uchun ko'rib chiqiladi |
| Yo'lovchi profili haydovchiga ko'rinishi | Keyingi bosqich uchun ko'rib chiqiladi |
| Haydovchi oldindan mavjudligini e'lon qilishi | Keyingi bosqich uchun ko'rib chiqiladi |
| Boshqa kishi uchun buyurtma | Keyingi bosqich uchun ko'rib chiqiladi |
| Telegram orqali xavfsizlik ulashish | Keyingi bosqich uchun ko'rib chiqiladi |
| Narx taqqoslash maslahat (price anchor signal) | Keyingi bosqich uchun ko'rib chiqiladi |
| Buyurtmani Telegram tarmog'iga ulashish tugmasi | Keyingi bosqich uchun ko'rib chiqiladi |
| Haydovchi vaqtinchalik to'xtatish (pause rejimi) | Keyingi bosqich uchun ko'rib chiqiladi |
| Haydovchi avtomobil turi va sig'imi (sedan/minivan) | Keyingi bosqich uchun ko'rib chiqiladi |

---

*Hujjat mualliflari: Loyiha jamoasi*
*Keyingi ko'rib chiqish: Texnik arxitektura hujjati (TAD)*
