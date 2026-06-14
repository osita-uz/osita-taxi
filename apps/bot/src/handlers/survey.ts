import { Bot } from "grammy";
import { prisma } from "@taxi/db";
import type { MyContext } from "../bot.js";

export function registerSurveyHandler(bot: Bot<MyContext>) {
  bot.callbackQuery(/^survey:answer:(\d+)$/, async (ctx) => {
    const routeId = Number(ctx.match[1]);
    await ctx.answerCallbackQuery();
    await ctx.reply("Narxingizni kiriting (so'mda):", {
      reply_markup: { force_reply: true },
    });
    ctx.session.pendingSurveyRouteId = routeId;
  });

  bot.callbackQuery(/^survey:skip:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery("O'tkazib yuborildi");
  });
}
