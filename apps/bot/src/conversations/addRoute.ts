import { Conversation } from "@grammyjs/conversations";
import { prisma } from "@taxi/db";
import type { MyContext } from "../bot.js";

export async function addRouteConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  const cities = await conversation.external(() =>
    prisma.city.findMany({ orderBy: { name: "asc" } })
  );

  await ctx.reply("Qaysi shahardan chiqasiz?", {
    reply_markup: {
      inline_keyboard: cities.map((c) => [
        { text: c.name, callback_data: `ar_from:${c.id}` },
      ]),
    },
  });

  const fromCtx = await conversation.waitFor("callback_query:data");
  const fromId = Number(fromCtx.callbackQuery.data.split(":")[1]);
  await fromCtx.answerCallbackQuery();

  await ctx.reply("Qaysi shaharga borasiz?", {
    reply_markup: {
      inline_keyboard: cities
        .filter((c) => c.id !== fromId)
        .map((c) => [{ text: c.name, callback_data: `ar_to:${c.id}` }]),
    },
  });

  const toCtx = await conversation.waitFor("callback_query:data");
  const toId = Number(toCtx.callbackQuery.data.split(":")[1]);
  await toCtx.answerCallbackQuery();

  const telegramId = BigInt(ctx.from!.id);

  await conversation.external(async () => {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;

    const driver = await prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) return;

    const route = await prisma.route.findUnique({
      where: { fromCityId_toCityId: { fromCityId: fromId, toCityId: toId } },
    });
    if (!route) return;

    await prisma.driverRoute.upsert({
      where: { driverId_routeId: { driverId: driver.userId, routeId: route.id } },
      update: {},
      create: { driverId: driver.userId, routeId: route.id },
    });
  });

  const fromCity = cities.find((c) => c.id === fromId);
  const toCity = cities.find((c) => c.id === toId);
  await ctx.reply(`✅ Marshrut qo'shildi: ${fromCity?.name} → ${toCity?.name}`);
}
