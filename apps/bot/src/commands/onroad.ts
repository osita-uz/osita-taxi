import { Bot } from "grammy";
import { prisma } from "@taxi/db";
import { driverKeyboard } from "../keyboards/main.js";
import type { MyContext } from "../bot.js";

export function registerOnroadCommands(bot: Bot<MyContext>) {
  bot.command("onroad", async (ctx) => {
    await ctx.conversation.enter("onroad");
  });

  bot.hears("🚗 Hozir yo'ldaman", async (ctx) => {
    await ctx.conversation.enter("onroad");
  });

  bot.command("offroad", async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;

    await prisma.driver.update({ where: { userId: user.id }, data: { isOnRoad: false } });
    await prisma.driverOnRoad.deleteMany({ where: { driverId: user.id } });

    await ctx.reply("🔴 Yo'ldan chiqdingiz.", { reply_markup: driverKeyboard });
  });
}
