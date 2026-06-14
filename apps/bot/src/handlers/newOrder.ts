import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "@taxi/db";
import { orderActionKeyboard } from "../keyboards/order.js";
import type { MyContext } from "../bot.js";

export function registerOrderHandlers(bot: Bot<MyContext>) {
  // "Rozi bo'laman" — haydovchi mijoz narxiga rozi
  bot.callbackQuery(/^offer:accept:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match[1]);
    const telegramId = BigInt(ctx.from.id);

    const user = await prisma.user.findUnique({ where: { telegramId }, include: { driver: true } });
    if (!user?.driver) return ctx.answerCallbackQuery("Ruxsat yo'q");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "ACTIVE") {
      return ctx.answerCallbackQuery("Buyurtma mavjud emas");
    }

    await prisma.offer.upsert({
      where: { orderId_driverId: { orderId, driverId: user.id } },
      update: { price: order.price },
      create: { orderId, driverId: user.id, price: order.price },
    });

    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.answerCallbackQuery("✅ Taklifingiz yuborildi!");
    await ctx.reply("✅ Taklifingiz yuborildi. Yo'lovchi siz bilan bog'lanadi.");
  });

  // "Narx taklif qilaman" — haydovchi o'z narxini kiritadi
  bot.callbackQuery(/^offer:price:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match[1]);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `Buyurtma #${orderId} uchun narxingizni kiriting (so'mda):`,
      { reply_markup: { force_reply: true } }
    );

    ctx.session.pendingOfferOrderId = orderId;
  });

  // Extend order callback (from warn worker)
  bot.callbackQuery(/^order:extend:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match[1]);
    const telegramId = BigInt(ctx.from.id);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return ctx.answerCallbackQuery();

    const order = await prisma.order.findFirst({
      where: { id: orderId, passengerId: user.id, status: "ACTIVE", isExtended: false },
    });

    if (!order) {
      return ctx.answerCallbackQuery("Uzaytirish mumkin emas");
    }

    const newExpiry = new Date(order.expiresAt);
    newExpiry.setHours(newExpiry.getHours() + 1);

    await prisma.order.update({
      where: { id: orderId },
      data: { isExtended: true, expiresAt: newExpiry },
    });

    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.answerCallbackQuery("✅ Buyurtma 1 soatga uzaytirildi!");
  });

  bot.callbackQuery(/^order:dismiss:(\d+)$/, async (ctx) => {
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.answerCallbackQuery("OK");
  });
}

export function formatOrderMessage(order: {
  id: number;
  fromPlace: string;
  toPlace: string;
  travelDate: Date;
  seatType: string;
  seatCount: number | null;
  luggage: string;
  price: number;
  isUrgent: boolean;
  route: { fromCity: { name: string }; toCity: { name: string } };
}): string {
  const date = order.travelDate.toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const seat =
    order.seatType === "PARTIAL" && order.seatCount
      ? `${order.seatCount} ta o'rin`
      : "To'liq salon";
  const luggage =
    order.luggage === "NONE"
      ? ""
      : ` | ${order.luggage === "SMALL" ? "🧳 Kichik bagaj" : "🧳 Katta bagaj"}`;

  return (
    `🆕 Yangi buyurtma\n\n` +
    `📍 ${order.route.fromCity.name}, ${order.fromPlace} → ${order.route.toCity.name}, ${order.toPlace}\n` +
    `📅 ${date}\n` +
    `💺 ${seat}${luggage}\n` +
    `💰 Mijoz narxi: ${order.price.toLocaleString()} so'm` +
    (order.isUrgent ? `\n⚡️ Tez ketaman!` : "")
  );
}
