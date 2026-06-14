import { Conversation } from "@grammyjs/conversations";
import { prisma } from "@taxi/db";
import type { MyContext } from "../bot.js";

function toRows<T>(items: T[], cols = 2): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols));
  }
  return rows;
}

export async function registrationConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  await ctx.reply("Xush kelibsiz! Telefon raqamingizni ulashing:", {
    reply_markup: {
      keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });

  const contactCtx = await conversation.waitFor("message:contact");
  const phone = contactCtx.message.contact.phone_number;
  const telegramId = BigInt(ctx.from!.id);

  await conversation.external(async () => {
    await prisma.user.update({ where: { telegramId }, data: { phone } });
  });

  const regions = await conversation.external(() =>
    prisma.region.findMany({ orderBy: { id: "asc" } })
  );

  const selectedRouteIds: number[] = [];
  let fromDistrictId: number | null = null;

  await ctx.reply("Qaysi viloyatdan chiqasiz? (1-qadam)", {
    reply_markup: {
      inline_keyboard: toRows(
        regions.map((r) => ({ text: r.name, callback_data: `reg_fromreg:${r.id}` })),
        1
      ),
    },
  });

  while (true) {
    const cbCtx = await conversation.waitFor("callback_query:data");
    const data = cbCtx.callbackQuery.data;
    await cbCtx.answerCallbackQuery();

    if (data.startsWith("reg_fromreg:")) {
      const fromRegionId = Number(data.split(":")[1]);
      const fromRegion = regions.find((r) => r.id === fromRegionId)!;
      const districts = await conversation.external(() =>
        prisma.district.findMany({
          where: { regionId: fromRegionId },
          orderBy: { name: "asc" },
        })
      );
      await ctx.reply(`📍 ${fromRegion.name} — qaysi tuman/shahar?`, {
        reply_markup: {
          inline_keyboard: toRows(
            districts.map((d) => ({ text: d.name, callback_data: `reg_from:${d.id}` })),
            2
          ),
        },
      });
    } else if (data.startsWith("reg_from:")) {
      fromDistrictId = Number(data.split(":")[1]);
      await ctx.reply("Qaysi viloyatga borasiz? (2-qadam)", {
        reply_markup: {
          inline_keyboard: toRows(
            regions.map((r) => ({ text: r.name, callback_data: `reg_toreg:${r.id}` })),
            1
          ),
        },
      });
    } else if (data.startsWith("reg_toreg:")) {
      const toRegionId = Number(data.split(":")[1]);
      const toRegion = regions.find((r) => r.id === toRegionId)!;
      const districts = await conversation.external(() =>
        prisma.district.findMany({
          where: { regionId: toRegionId },
          orderBy: { name: "asc" },
        })
      );
      await ctx.reply(`📍 ${toRegion.name} — qaysi tuman/shahar?`, {
        reply_markup: {
          inline_keyboard: toRows(
            districts
              .filter((d) => d.id !== fromDistrictId)
              .map((d) => ({ text: d.name, callback_data: `reg_to:${d.id}` })),
            2
          ),
        },
      });
    } else if (data.startsWith("reg_to:") && fromDistrictId !== null) {
      const toDistrictId = Number(data.split(":")[1]);
      const route = await conversation.external(() =>
        prisma.route.upsert({
          where: {
            fromDistrictId_toDistrictId: {
              fromDistrictId: fromDistrictId!,
              toDistrictId,
            },
          },
          update: {},
          create: { fromDistrictId: fromDistrictId!, toDistrictId },
        })
      );
      if (!selectedRouteIds.includes(route.id)) {
        selectedRouteIds.push(route.id);
      }
      fromDistrictId = null;
      await ctx.reply("Marshrut qo'shildi ✅\nYana marshrut qo'shishni xohlaysizmi?", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "➕ Yana marshrut qo'shish", callback_data: "reg_more" },
              { text: "✅ Tayyor", callback_data: "reg_done" },
            ],
          ],
        },
      });
    } else if (data === "reg_more") {
      await ctx.reply("Qaysi viloyatdan chiqasiz?", {
        reply_markup: {
          inline_keyboard: toRows(
            regions.map((r) => ({ text: r.name, callback_data: `reg_fromreg:${r.id}` })),
            1
          ),
        },
      });
    } else if (data === "reg_done") {
      break;
    }
  }

  if (selectedRouteIds.length > 0) {
    await conversation.external(async () => {
      const user = await prisma.user.findUnique({ where: { telegramId } });
      if (!user) return;
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
    });
  }

  const { mainKeyboard } = await import("../keyboards/main.js");
  await ctx.reply(
    `✅ Ro'yxatdan o'tdingiz! ${selectedRouteIds.length} ta marshrut saqlandi.`,
    { reply_markup: mainKeyboard }
  );
}
