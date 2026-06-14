import { Bot } from "grammy";
import { prisma } from "@taxi/db";
import type { MyContext } from "../bot.js";

export function registerProfileCommand(bot: Bot<MyContext>) {
  bot.command("profile", async (ctx) => {
    await showProfile(ctx);
  });

  bot.hears("👤 Profilim", async (ctx) => {
    await showProfile(ctx);
  });
}

async function showProfile(ctx: any) {
  const telegramId = BigInt(ctx.from!.id);
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { driver: true },
  });

  if (!user) return ctx.reply("Foydalanuvchi topilmadi.");

  const rating = user.driver
    ? `⭐ Reyting: ${user.driver.rating.toFixed(1)} (${user.driver.ratingCount} ta)`
    : "";

  await ctx.reply(
    `👤 *Profil*\n\nIsm: ${user.name}\n📞 ${user.phone ?? "Kiritilmagan"}\n${rating}`.trim(),
    { parse_mode: "Markdown" }
  );
}
