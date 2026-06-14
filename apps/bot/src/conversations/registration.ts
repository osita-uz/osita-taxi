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
  const telegramId = BigInt(ctx.from!.id);

  // --- ROLE SELECTION ---
  await ctx.reply("Siz kim sifatida foydalanasiz?", {
    reply_markup: {
      inline_keyboard: [[
        { text: "🚗 Haydovchi", callback_data: "reg_role:driver" },
        { text: "🧳 Yo'lovchi", callback_data: "reg_role:passenger" },
      ]],
    },
  });

  let roleCtx = await conversation.waitFor("callback_query:data");
  while (!roleCtx.callbackQuery.data.startsWith("reg_role:")) {
    await roleCtx.answerCallbackQuery();
    roleCtx = await conversation.waitFor("callback_query:data");
  }
  const isDriver = roleCtx.callbackQuery.data === "reg_role:driver";
  await roleCtx.answerCallbackQuery();

  await conversation.external(() =>
    prisma.user.update({
      where: { telegramId },
      data: { role: isDriver ? "DRIVER" : "PASSENGER" },
    })
  );

  // --- PHONE ---
  await ctx.reply("Telefon raqamingizni ulashing:", {
    reply_markup: {
      keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });

  const contactCtx = await conversation.waitFor("message:contact");
  const phone = contactCtx.message.contact.phone_number;

  await conversation.external(() =>
    prisma.user.update({ where: { telegramId }, data: { phone } })
  );

  // --- PASSENGER: done ---
  if (!isDriver) {
    const { passengerKeyboard } = await import("../keyboards/main.js");
    await ctx.reply("✅ Ro'yxatdan o'tdingiz!", { reply_markup: passengerKeyboard });
    return;
  }

  // --- DRIVER: route selection ---
  const regions = await conversation.external(() =>
    prisma.region.findMany({ orderBy: { id: "asc" } })
  );

  const selectedRouteIds: number[] = [];
  let fromDistrictId: number | null = null;
  let fromRegionId: number | null = null;
  let toRegionId: number | null = null;

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
      fromRegionId = Number(data.split(":")[1]);
      const fRid = fromRegionId;
      const fromRegion = regions.find((r) => r.id === fRid)!;
      const districts = await conversation.external(() =>
        prisma.district.findMany({
          where: { regionId: fRid },
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
      toRegionId = Number(data.split(":")[1]);
      const tRid = toRegionId;
      const toRegion = regions.find((r) => r.id === tRid)!;
      const districts = await conversation.external(() =>
        prisma.district.findMany({
          where: { regionId: tRid },
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
    } else if (data.startsWith("reg_to:") && fromDistrictId !== null && fromRegionId !== null && toRegionId !== null) {
      const toDistrictId = Number(data.split(":")[1]);
      const fRid = fromRegionId;
      const fDid = fromDistrictId;
      const tRid = toRegionId;
      const route = await conversation.external(() =>
        prisma.route.upsert({
          where: {
            fromRegionId_fromDistrictId_toRegionId_toDistrictId: {
              fromRegionId: fRid,
              fromDistrictId: fDid,
              toRegionId: tRid,
              toDistrictId,
            },
          },
          update: {},
          create: { fromRegionId: fRid, fromDistrictId: fDid, toRegionId: tRid, toDistrictId },
        })
      );
      if (!selectedRouteIds.includes(route.id)) {
        selectedRouteIds.push(route.id);
      }
      fromDistrictId = null;
      toRegionId = null;
      await ctx.reply("Marshrut qo'shildi ✅\nYana marshrut qo'shishni xohlaysizmi?", {
        reply_markup: {
          inline_keyboard: [[
            { text: "➕ Yana marshrut qo'shish", callback_data: "reg_more" },
            { text: "✅ Tayyor", callback_data: "reg_done" },
          ]],
        },
      });
    } else if (data === "reg_more") {
      fromRegionId = null;
      toRegionId = null;
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

  const { driverKeyboard } = await import("../keyboards/main.js");
  await ctx.reply(
    `✅ Ro'yxatdan o'tdingiz! ${selectedRouteIds.length} ta marshrut saqlandi.`,
    { reply_markup: driverKeyboard }
  );
}
