import { Conversation } from "@grammyjs/conversations";
import { prisma } from "@taxi/db";
import type { MyContext } from "../bot.js";

export async function registrationConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  await ctx.reply(
    "Xush kelibsiz! Telefon raqamingizni ulashing:",
    {
      reply_markup: {
        keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );

  const contactCtx = await conversation.waitFor("message:contact");
  const phone = contactCtx.message.contact.phone_number;
  const telegramId = BigInt(ctx.from!.id);

  await conversation.external(async () => {
    await prisma.user.update({
      where: { telegramId },
      data: { phone },
    });
  });

  const cities = await conversation.external(() =>
    prisma.city.findMany({ orderBy: { name: "asc" } })
  );

  const selectedRouteIds: number[] = [];
  const selectedFromCityId: { value: number | null } = { value: null };

  await ctx.reply(
    "Qaysi shahardan chiqasiz? (Marshrut tanlash: 1-qadam)",
    {
      reply_markup: {
        inline_keyboard: cities.map((c) => [
          { text: c.name, callback_data: `reg_from:${c.id}` },
        ]),
      },
    }
  );

  while (true) {
    const cbCtx = await conversation.waitFor("callback_query:data");
    const data = cbCtx.callbackQuery.data;

    if (data.startsWith("reg_from:")) {
      const fromId = Number(data.split(":")[1]);
      selectedFromCityId.value = fromId;
      await cbCtx.answerCallbackQuery();
      await ctx.reply(
        "Qaysi shaharga borasiz? (Marshrut tanlash: 2-qadam)",
        {
          reply_markup: {
            inline_keyboard: cities
              .filter((c) => c.id !== fromId)
              .map((c) => [
                { text: c.name, callback_data: `reg_to:${c.id}` },
              ]),
          },
        }
      );
    } else if (data.startsWith("reg_to:") && selectedFromCityId.value) {
      const toId = Number(data.split(":")[1]);
      const route = await conversation.external(() =>
        prisma.route.findUnique({
          where: {
            fromCityId_toCityId: {
              fromCityId: selectedFromCityId.value!,
              toCityId: toId,
            },
          },
        })
      );
      if (route && !selectedRouteIds.includes(route.id)) {
        selectedRouteIds.push(route.id);
      }
      await cbCtx.answerCallbackQuery("Marshrut qo'shildi ✅");
      await ctx.reply(
        `Marshrut qo'shildi. Yana qo'shishni xohlaysizmi?`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "➕ Yana marshrut qo'shish", callback_data: "reg_more" },
                { text: "✅ Tayyor", callback_data: "reg_done" },
              ],
            ],
          },
        }
      );
    } else if (data === "reg_more") {
      selectedFromCityId.value = null;
      await cbCtx.answerCallbackQuery();
      await ctx.reply(
        "Qaysi shahardan chiqasiz?",
        {
          reply_markup: {
            inline_keyboard: cities.map((c) => [
              { text: c.name, callback_data: `reg_from:${c.id}` },
            ]),
          },
        }
      );
    } else if (data === "reg_done") {
      await cbCtx.answerCallbackQuery();
      break;
    }
  }

  if (selectedRouteIds.length > 0) {
    const driverUserId = await conversation.external(async () => {
      const user = await prisma.user.findUnique({ where: { telegramId } });
      if (!user) return null;
      await prisma.user.update({ where: { id: user.id }, data: { role: "DRIVER" } });
      const driver = await prisma.driver.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      for (const routeId of selectedRouteIds) {
        await prisma.driverRoute.upsert({
          where: { driverId_routeId: { driverId: driver.userId, routeId } },
          update: {},
          create: { driverId: driver.userId, routeId },
        });
      }
      return driver.userId;
    });
  }

  const { mainKeyboard } = await import("../keyboards/main.js");
  await ctx.reply(
    `✅ Ro'yxatdan o'tdingiz! ${selectedRouteIds.length} ta marshrut saqlandi.`,
    { reply_markup: mainKeyboard }
  );
}
