import { Bot } from "grammy";
import { prisma } from "@taxi/db";
import type { MyContext } from "../bot.js";

export function registerOfferPriceHandler(bot: Bot<MyContext>) {
  bot.on("message:text", async (ctx, next) => {
    const orderId = ctx.session.pendingOfferOrderId;
    if (!orderId) return next();

    const price = Number(ctx.message.text.replace(/\s/g, "").replace(/,/g, ""));
    if (isNaN(price) || price <= 0) {
      return ctx.reply("Iltimos, to'g'ri narx kiriting (masalan: 150000)");
    }

    const telegramId = BigInt(ctx.from.id);
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user?.driver) return;

    const order = await prisma.order.findFirst({
      where: { id: orderId, status: "ACTIVE" },
    });
    if (!order) {
      ctx.session.pendingOfferOrderId = undefined;
      return ctx.reply("Buyurtma topilmadi yoki muddati o'tgan.");
    }

    await prisma.offer.upsert({
      where: { orderId_driverId: { orderId, driverId: user.id } },
      update: { price },
      create: { orderId, driverId: user.id, price },
    });

    ctx.session.pendingOfferOrderId = undefined;
    await ctx.reply(`✅ Taklifingiz yuborildi: ${price.toLocaleString()} so'm`);
  });
}
