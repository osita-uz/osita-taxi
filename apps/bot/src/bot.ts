import { Bot, session, Context } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import type { ConversationFlavor } from "@grammyjs/conversations";
import { Redis as IORedis } from "ioredis";
import { REDIS_KEYS } from "@taxi/shared";

import { registrationConversation } from "./conversations/registration.js";
import { addRouteConversation } from "./conversations/addRoute.js";
import { onroadConversation } from "./conversations/onroad.js";
import { createOrderConversation } from "./conversations/createOrder.js";

import { registerStartCommand } from "./commands/start.js";
import { registerRoutesCommand } from "./commands/routes.js";
import { registerOnroadCommands } from "./commands/onroad.js";
import { registerProfileCommand } from "./commands/profile.js";
import { registerPassengerOrderCommands } from "./commands/orders.js";

import { registerOrderHandlers } from "./handlers/newOrder.js";
import { registerOfferPriceHandler } from "./handlers/offerPrice.js";
import { registerSurveyHandler } from "./handlers/survey.js";

import {
  createNotifyWorker,
  createExpiryWorker,
  createWarnWorker,
  createSurveyWorker,
  createStatsWorker,
  ordersExpiryQueue,
  priceSurveyQueue,
  priceStatsQueue,
} from "@taxi/queue";
import { orderActionKeyboard, extendOrderKeyboard } from "./keyboards/order.js";
import { formatOrderMessage } from "./handlers/newOrder.js";

interface SessionData {
  pendingOfferOrderId?: number;
  pendingSurveyRouteId?: number;
}

export type MyContext = Context &
  ConversationFlavor & {
    session: SessionData;
  };

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required");

export const bot = new Bot<MyContext>(BOT_TOKEN);

bot.use(
  session({
    initial: (): SessionData => ({}),
    storage: {
      read: async (key) => {
        const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");
        const data = await redis.get(REDIS_KEYS.driverSession(key));
        redis.disconnect();
        return data ? JSON.parse(data) : undefined;
      },
      write: async (key, value) => {
        const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");
        await redis.set(REDIS_KEYS.driverSession(key), JSON.stringify(value));
        redis.disconnect();
      },
      delete: async (key) => {
        const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");
        await redis.del(REDIS_KEYS.driverSession(key));
        redis.disconnect();
      },
    },
  })
);

bot.use(conversations());
bot.use(createConversation(registrationConversation, "registration"));
bot.use(async (ctx, next) => {
  if (ctx.callbackQuery?.data === "route_add") {
    await ctx.conversation.exit("addRoute");
  }
  await next();
});
bot.use(createConversation(addRouteConversation, "addRoute"));
bot.use(createConversation(onroadConversation, "onroad"));
bot.use(createConversation(createOrderConversation, "createOrder"));

registerStartCommand(bot);
registerRoutesCommand(bot);
registerOnroadCommands(bot);
registerProfileCommand(bot);
registerOrderHandlers(bot);
registerOfferPriceHandler(bot);
registerSurveyHandler(bot);
registerPassengerOrderCommands(bot);

// Bot instance for workers to send messages
async function botSendOrderMessage(telegramId: string, text: string, orderId: number) {
  await bot.api.sendMessage(telegramId, text, {
    reply_markup: orderActionKeyboard(orderId),
  });
}

async function botSendWarnMessage(
  telegramId: string,
  text: string,
  orderId: number,
  canExtend: boolean
) {
  const markup = canExtend ? extendOrderKeyboard(orderId) : undefined;
  await bot.api.sendMessage(telegramId, text, { reply_markup: markup });
}

async function botSendSurveyMessage(telegramId: string, text: string, routeId: number) {
  const { InlineKeyboard } = await import("grammy");
  const kb = new InlineKeyboard()
    .text("Javob berish", `survey:answer:${routeId}`)
    .text("O'tkazib yuborish", `survey:skip:${routeId}`);
  await bot.api.sendMessage(telegramId, text, { reply_markup: kb });
}

async function botSendText(telegramId: string, text: string, _id: number, _canExtend?: boolean) {
  await bot.api.sendMessage(telegramId, text);
}

// Start workers
const notifyWorker = createNotifyWorker(botSendOrderMessage);
const expiryWorker = createExpiryWorker(botSendText);
const warnWorker = createWarnWorker(botSendWarnMessage);
const surveyWorker = createSurveyWorker(botSendSurveyMessage);
const statsWorker = createStatsWorker();

// Schedule cron jobs
ordersExpiryQueue.add("cron", {}, { repeat: { every: 60_000 } }); // every 1 min
priceSurveyQueue.add("cron", {}, { repeat: { pattern: "0 8 * * *", tz: "Asia/Tashkent" } }); // 08:00 UZT
priceStatsQueue.add("cron", {}, { repeat: { every: 6 * 60 * 60_000 } }); // every 6h

bot.catch((err) => {
  console.error("Bot error:", err.message, err.error);
});

bot.start({
  onStart: () => console.log("Bot started!"),
});
