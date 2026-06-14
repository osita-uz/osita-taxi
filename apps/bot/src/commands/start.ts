import { Bot } from "grammy";
import { prisma } from "@taxi/db";
import { driverKeyboard, passengerKeyboard } from "../keyboards/main.js";
import type { MyContext } from "../bot.js";

export function registerStartCommand(bot: Bot<MyContext>) {
  bot.command("start", async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const user = await prisma.user.findUnique({ where: { telegramId } });

    if (user) {
      const kb = user.role === "DRIVER" ? driverKeyboard : passengerKeyboard;
      await ctx.reply(`Xush kelibsiz, ${user.name}!`, { reply_markup: kb });
    } else {
      const name = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ");
      await prisma.user.create({ data: { telegramId, name, role: "PASSENGER" } });
      await ctx.conversation.enter("registration");
    }
  });
}
