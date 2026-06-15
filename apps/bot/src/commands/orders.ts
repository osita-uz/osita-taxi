import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "@taxi/db";
import type { MyContext } from "../bot.js";

function routeLabel(from: { name: string; parentId: number | null }, to: { name: string; parentId: number | null }): string {
  const fromName = from.parentId === null ? `${from.name} (barchasi)` : from.name;
  const toName = to.parentId === null ? `${to.name} (barchasi)` : to.name;
  return `${fromName} → ${toName}`;
}

export function registerPassengerOrderCommands(bot: Bot<MyContext>) {
  bot.hears("📦 Buyurtma berish", async (ctx) => {
    await ctx.conversation.enter("createOrder");
  });

  bot.command("order", async (ctx) => {
    await ctx.conversation.enter("createOrder");
  });

  bot.hears("📋 Buyurtmalarim", async (ctx) => {
    await showOrders(ctx);
  });

  bot.command("myorders", async (ctx) => {
    await showOrders(ctx);
  });

  bot.callbackQuery("start_order", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter("createOrder");
  });

  bot.callbackQuery(/^order_offers:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match[1]);
    await ctx.answerCallbackQuery();
    await showOffers(ctx, orderId);
  });

  bot.callbackQuery(/^offer_pick:(\d+)$/, async (ctx) => {
    const offerId = Number(ctx.match[1]);
    const telegramId = BigInt(ctx.from.id);

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        order: { include: { passenger: true } },
        driver: { include: { user: true } },
      },
    });

    if (!offer || offer.order.passenger.telegramId !== telegramId) {
      return ctx.answerCallbackQuery("Ruxsat yo'q");
    }
    if (offer.order.status !== "ACTIVE") {
      return ctx.answerCallbackQuery("Buyurtma faol emas");
    }
    if (offer.status !== "PENDING") {
      return ctx.answerCallbackQuery("Bu taklif allaqachon ko'rib chiqilgan");
    }

    await prisma.$transaction([
      prisma.offer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } }),
      prisma.offer.updateMany({
        where: { orderId: offer.orderId, id: { not: offerId }, status: "PENDING" },
        data: { status: "REJECTED" },
      }),
    ]);

    await ctx.api.sendMessage(
      offer.driver.user.telegramId.toString(),
      `✅ Taklifingiz qabul qilindi!\n\n` +
      `Buyurtma #${offer.orderId} uchun ${offer.price.toLocaleString()} so'm tasdiqlandi.\n` +
      `Yo'lovchi: ${offer.order.passenger.name ?? "—"}`
    );

    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.answerCallbackQuery("✅ Taklif qabul qilindi!");
    await ctx.reply(
      `✅ Haydovchi bilan bog'laning!\n👤 ${offer.driver.user.name}`
    );
  });

  bot.callbackQuery(/^offer_reject:(\d+)$/, async (ctx) => {
    const offerId = Number(ctx.match[1]);
    const telegramId = BigInt(ctx.from.id);

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { order: { include: { passenger: true } } },
    });

    if (!offer || offer.order.passenger.telegramId !== telegramId) {
      return ctx.answerCallbackQuery("Ruxsat yo'q");
    }
    if (offer.status !== "PENDING") {
      return ctx.answerCallbackQuery("Bu taklif allaqachon ko'rib chiqilgan");
    }

    await prisma.offer.update({ where: { id: offerId }, data: { status: "REJECTED" } });
    await ctx.answerCallbackQuery("❌ Taklif rad etildi");
    await showOffers(ctx, offer.orderId);
  });
}

async function showOrders(ctx: any) {
  const telegramId = BigInt(ctx.from!.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return ctx.reply("Foydalanuvchi topilmadi.");

  const orders = await prisma.order.findMany({
    where: { passengerId: user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      route: { include: { from: true, to: true } },
      _count: { select: { offers: { where: { status: "PENDING" } } } },
    },
  });

  if (orders.length === 0) {
    return ctx.reply("Sizda hali buyurtma yo'q.", {
      reply_markup: {
        inline_keyboard: [[{ text: "📦 Buyurtma berish", callback_data: "start_order" }]],
      },
    });
  }

  const kb = new InlineKeyboard();
  for (const order of orders) {
    const label = routeLabel(order.route.from, order.route.to);
    const icon = order.status === "ACTIVE" ? "🟢" : "✅";
    const offerBadge = order._count.offers > 0 ? ` (${order._count.offers} taklif)` : "";
    kb.text(`${icon} ${label}${offerBadge}`, `order_offers:${order.id}`).row();
  }

  await ctx.reply("📋 Buyurtmalaringiz:", { reply_markup: kb });
}

async function showOffers(ctx: any, orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      route: { include: { from: true, to: true } },
      offers: {
        where: { status: "PENDING" },
        include: { driver: { include: { user: true } } },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!order) return ctx.reply("Buyurtma topilmadi.");

  const label = routeLabel(order.route.from, order.route.to);

  if (order.offers.length === 0) {
    return ctx.reply(
      `📍 ${label}\n💰 Sizning narxingiz: ${order.price.toLocaleString()} so'm\n\nHali taklif yo'q. Haydovchilar ko'rib chiqmoqda...`
    );
  }

  const kb = new InlineKeyboard();
  let text =
    `📍 <b>${label}</b>\n` +
    `💰 Sizning narxingiz: ${order.price.toLocaleString()} so'm\n\n` +
    `<b>Takliflar (${order.offers.length} ta):</b>\n\n`;

  for (const offer of order.offers) {
    text += `👤 ${offer.driver.user.name} ⭐ ${offer.driver.rating.toFixed(1)}\n`;
    text += `💰 ${offer.price.toLocaleString()} so'm\n\n`;
    kb.text(`✅ ${offer.driver.user.name} — ${offer.price.toLocaleString()}`, `offer_pick:${offer.id}`)
      .text("❌", `offer_reject:${offer.id}`)
      .row();
  }

  await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
}
