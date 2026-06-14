# CLAUDE.md — Taxi Service

## Loyiha haqida

Shaharlararo taxi xizmati. pnpm workspaces bilan qurilgan TypeScript monorepo.

- **Bot** (`apps/bot`) — Haydovchilar uchun Telegram bot (grammY)
- **API** (`apps/api`) — Yo'lovchilar Mini App uchun Fastify REST API
- **packages/db** — Prisma ORM + PostgreSQL
- **packages/queue** — BullMQ workers + Redis
- **packages/shared** — Umumiy types, constants, utils

Texnik talablar to'liq `docs/TRD_001.md` da. Yangi feature yozishdan oldin shu hujjatni o'qing.

---

## Monorepo qoidalari

**Package import:** `@taxi/db`, `@taxi/queue`, `@taxi/shared` — relative import ishlatmang.

**Har bir package `src/index.ts` orqali eksport qiladi.** Ichki fayllarni to'g'ridan import qilmang:
```ts
// To'g'ri
import { prisma } from "@taxi/db";

// Noto'g'ri
import { prisma } from "../../packages/db/src/index.js";
```

**ESM:** Barcha import `.js` extension bilan tugaydi (TypeScript yozilsa ham):
```ts
import { registerStartCommand } from "./commands/start.js";
```

**Build:** `pnpm -r build` — barcha packagelarni ketma-ket build qiladi. Bitta packageni alohida build qilish uchun `pnpm --filter <name> build`.

---

## Loyiha strukturasi

```
taxi-service/
├── apps/
│   ├── api/src/
│   │   ├── app.ts          ← buildApp() — barcha plugin va routelar shu yerda
│   │   ├── index.ts        ← server start
│   │   ├── routes/         ← har bir file = bir resurs (auth, orders, offers, ...)
│   │   └── types.d.ts      ← Fastify type augmentation (authenticate decorator)
│   └── bot/src/
│       ├── bot.ts          ← Bot instance, session, conversations, worker start
│       ├── commands/       ← /start, /routes, /onroad, /profile — har biri register* funksiya
│       ├── conversations/  ← grammY conversations (multi-step dialog)
│       ├── handlers/       ← callback_query va message handlerlar
│       └── keyboards/      ← InlineKeyboard/ReplyKeyboard factory funksiyalar
├── packages/
│   ├── db/src/
│   │   ├── index.ts        ← prisma instance + re-export @prisma/client
│   │   └── seed.ts
│   ├── queue/src/
│   │   ├── index.ts        ← barcha eksportlar
│   │   ├── queues.ts       ← BullMQ Queue instancelari
│   │   ├── redis.ts        ← IORedis connection
│   │   └── workers/        ← har bir worker alohida file
│   └── shared/src/
│       ├── constants.ts    ← REDIS_KEYS, QUEUE_NAMES, biznes konstantalar
│       ├── types.ts        ← DTO interfacelari va shared typlar
│       └── telegram.ts     ← initData verification
└── docs/
    ├── TRD_001.md          ← Texnik talablar (asosiy manba)
    └── BRD.md
```

---

## Tech Stack va versiyalar

| | |
|---|---|
| Runtime | Node.js 20 LTS |
| Til | TypeScript 5.x |
| Paket menejeri | pnpm 9.x (npm/yarn ishlatmang) |
| Bot | grammY (latest) |
| API | Fastify 5.x |
| ORM | Prisma 6.x |
| DB | PostgreSQL 16 |
| Cache / Queue | Redis 7 + BullMQ 5.x |
| Konteyner | Docker + Compose |

---

## Bot (`apps/bot`) qoidalari

### MyContext

`bot.ts` da aniqlangan `MyContext` ni import qilish:
```ts
import type { MyContext } from "../bot.js";
```
Yangi session field qo'shish kerak bo'lsa — faqat `SessionData` interface ni `bot.ts` da kengaytiring.

### Commands

Har bir command `register*` pattern bilan eksport qilinadi:
```ts
export function registerRoutesCommand(bot: Bot<MyContext>) {
  bot.command("routes", async (ctx) => { ... });
  bot.callbackQuery(/^route_delete:/, async (ctx) => { ... });
}
```
`bot.ts` da faqat `registerXxx(bot)` chaqiriladi — logika command faylida.

### Conversations

`conversation.external()` ichida barcha side effect (DB, Redis, API call) bajariladi. Conversation funksiyasi sof bo'lishi kerak — faqat `conversation.waitFor()` va `ctx.reply()`:
```ts
// To'g'ri
const cities = await conversation.external(() => prisma.city.findMany(...));

// Noto'g'ri — conversation ichida to'g'ridan DB call
const cities = await prisma.city.findMany(...);
```

### Keyboards

Keyboard factory funksiyalar `keyboards/` papkasida. Inline keyboard callback data formati: `action:param` yoki `action:subaction:param`.

### Workers

Workerlar `bot.ts` da yaratiladi va bot API ga kirish uchun closure orqali `botSendXxx` funksiyalar uzatiladi. Worker fayllarining o'zi bot API ni import qilmaydi.

---

## API (`apps/api`) qoidalari

### Route fayllari

Har bir resurs alohida file, `buildApp()` da prefix bilan register qilinadi:
```ts
await app.register(ordersRoutes, { prefix: "/orders" });
```

### Autentifikatsiya

`preHandler: [app.authenticate]` bilan himoyalangan routelar uchun user `request.user` dan olinadi (tip `JwtPayload` — `packages/shared/src/types.ts` da):
```ts
const { userId } = request.user as JwtPayload;
```

### Rate limiting

Global rate limit o'chirilgan (`global: false`). Har bir endpoint o'zi uchun limit belgilaydi:
```ts
{ config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }
```

---

## Database (`packages/db`) qoidalari

Schema faqat `packages/db/prisma/schema.prisma` da. Schema o'zgartirilganda:
1. `pnpm db:migrate` — migration yaratish
2. `pnpm db:seed` — zarur bo'lsa seed qayta ishlatish

`prisma` instance singleton — `packages/db/src/index.ts` da global pattern orqali.

**Enum lar ikki joyda mavjud:** Prisma schemada va `packages/shared/src/types.ts` da string union sifatida. Ikkalasini sinxron holda saqlang.

---

## Queue (`packages/queue`) qoidalari

Queue nomlari faqat `QUEUE_NAMES` konstantasidan olinadi (`packages/shared/src/constants.ts`):
```ts
import { QUEUE_NAMES } from "@taxi/shared";
new Queue(QUEUE_NAMES.ordersNotify, { connection });
```

Har bir worker `create*Worker` factory funksiya sifatida eksport qilinadi. Worker bot API ga bog'liq bo'lsa — bot funksiyasi argument sifatida uzatiladi (dependency injection).

---

## Shared (`packages/shared`) qoidalari

Bu packagega faqat ikki yoki undan ortiq app/package ishlatadigan narsalar kiradi:
- **types.ts** — DTO interfacelari, enum string unionlari
- **constants.ts** — `REDIS_KEYS`, `QUEUE_NAMES`, biznes raqamlari
- **telegram.ts** — `verifyInitData` funksiyasi

App-specific logika shu yerga kirmaydi.

---

## Redis kalitlari

Yangi Redis kalit qo'shish kerak bo'lsa — faqat `REDIS_KEYS` obyektiga qo'shing (`packages/shared/src/constants.ts`). Raw string ishlatmang:
```ts
// To'g'ri
redis.get(REDIS_KEYS.routeStats(routeId))

// Noto'g'ri
redis.get(`route:stats:${routeId}`)
```

---

## Environment variables

Barcha env var `.env.example` da hujjatlashtirilgan bo'lishi shart. Yangi env var qo'shilganda:
1. `.env.example` ga qo'shing (bo'sh qiymat bilan)
2. TRD yoki bu faylda qayerda ishlatilishini ko'rsating

```
DATABASE_URL=
REDIS_URL=
BOT_TOKEN=
JWT_SECRET=
JWT_EXPIRES_IN=24h
API_PORT=3000
NODE_ENV=development
MINI_APP_URL=
```

---

## Ishga tushirish

```bash
# Infrastructure
docker-compose up -d

# Migration va seed (birinchi marta)
pnpm db:migrate
pnpm db:seed

# Development
pnpm dev:api    # Fastify :3000
pnpm dev:bot    # grammY bot

# Typecheck (CI da ham ishlatiladi)
pnpm typecheck
```

---

## Nima qilmaslik kerak

- `npm` yoki `yarn` ishlatmang — faqat `pnpm`
- `packages/` ichidagi fayllarni to'g'ridan import qilmang — `@taxi/*` packagelardan foydalaning
- Bot workerlarida `bot` ni to'g'ridan import qilmang — factory funksiya argumenti orqali uzating
- Yangi Redis kalit qo'shishda raw string yozmang — `REDIS_KEYS` ga qo'shing
- Schema va shared types ni alohida o'zgartirmang — ikkalasini birga yangilang
- `conversation.external()` siz conversation ichida DB call qilmang
