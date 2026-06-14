import { Conversation } from "@grammyjs/conversations";
import { prisma } from "@taxi/db";
import { REDIS_KEYS } from "@taxi/shared";
import { redis } from "@taxi/queue";
import type { MyContext } from "../bot.js";

export async function onroadConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  const telegramId = BigInt(ctx.from!.id);
  const user = await conversation.external(() =>
    prisma.user.findUnique({
      where: { telegramId },
      include: {
        driver: { include: { routes: { include: { route: { include: { fromDistrict: true, toDistrict: true } } } } } },
      },
    })
  );

  if (!user?.driver || user.driver.routes.length === 0) {
    await ctx.reply("Sizda hech qanday marshrut yo'q. Avval /routes orqali marshrut qo'shing.");
    return;
  }

  const routeButtons = user.driver.routes.map((dr) => [
    {
      text: `${dr.route.fromDistrict.name} → ${dr.route.toDistrict.name}`,
      callback_data: `onroad_route:${dr.routeId}`,
    },
  ]);

  await ctx.reply("Qaysi yo'nalishda borasiz?", {
    reply_markup: { inline_keyboard: routeButtons },
  });

  const routeCtx = await conversation.waitFor("callback_query:data");
  const routeId = Number(routeCtx.callbackQuery.data.split(":")[1]);
  await routeCtx.answerCallbackQuery();

  await ctx.reply("Nechta bo'sh o'rin bor?", {
    reply_markup: {
      inline_keyboard: [
        [1, 2, 3, 4].map((n) => ({
          text: `${n}`,
          callback_data: `onroad_seats:${n}`,
        })),
      ],
    },
  });

  const seatsCtx = await conversation.waitFor("callback_query:data");
  const availableSeats = Number(seatsCtx.callbackQuery.data.split(":")[1]);
  await seatsCtx.answerCallbackQuery();

  await conversation.external(async () => {
    await prisma.driver.update({ where: { userId: user.id }, data: { isOnRoad: true } });
    await prisma.driverOnRoad.upsert({
      where: { driverId: user.id },
      update: { routeId, availableSeats, startedAt: new Date() },
      create: { driverId: user.id, routeId, availableSeats },
    });

    const todayKey = REDIS_KEYS.routeDriversToday(routeId);
    await redis.incr(todayKey);
    await redis.expireat(todayKey, Math.floor(new Date().setHours(23, 59, 59, 999) / 1000));
  });

  await ctx.reply(
    "✅ Hozir yo'ldaman rejimi yoqildi!\n/offroad orqali o'chirish mumkin.",
    { reply_markup: { remove_keyboard: true } }
  );
}
