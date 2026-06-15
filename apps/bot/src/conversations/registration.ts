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
    prisma.location.findMany({ where: { parentId: null }, orderBy: { id: "asc" } })
  );

  const selectedRouteIds: number[] = [];
  let fromLocationId: number | null = null;
  let fromLabel: string | null = null;
  let pendingParentId: number | null = null;
  let step: "from_parent" | "from_child" | "to_parent" | "to_child" = "from_parent";

  await ctx.reply("Qaysi viloyatdan chiqasiz? (1-qadam)", {
    reply_markup: {
      inline_keyboard: toRows(
        regions.map((r) => ({ text: r.name, callback_data: `reg_from_parent:${r.id}` })),
        1
      ),
    },
  });

  while (true) {
    const cbCtx = await conversation.waitFor("callback_query:data");
    const data = cbCtx.callbackQuery.data;
    await cbCtx.answerCallbackQuery();

    if (step === "from_parent" && data.startsWith("reg_from_parent:")) {
      pendingParentId = Number(data.split(":")[1]);
      const parent = regions.find((r) => r.id === pendingParentId)!;
      const children = await conversation.external(() =>
        prisma.location.findMany({ where: { parentId: pendingParentId! }, orderBy: { name: "asc" } })
      );
      step = "from_child";
      await ctx.reply(`📍 ${parent.name} — qaysi tuman/shahar?`, {
        reply_markup: {
          inline_keyboard: toRows(
            children.map((c) => ({ text: c.name, callback_data: `reg_from_child:${c.id}` })),
            2
          ),
        },
      });
    } else if (step === "from_child" && data.startsWith("reg_from_child:")) {
      fromLocationId = Number(data.split(":")[1]);
      const children = await conversation.external(() =>
        prisma.location.findMany({ where: { parentId: pendingParentId! }, orderBy: { name: "asc" } })
      );
      fromLabel = children.find((c) => c.id === fromLocationId)?.name ?? String(fromLocationId);
      step = "to_parent";
      await ctx.reply("Qaysi viloyatga borasiz? (2-qadam)", {
        reply_markup: {
          inline_keyboard: toRows(
            regions.map((r) => ({ text: r.name, callback_data: `reg_to_parent:${r.id}` })),
            1
          ),
        },
      });
    } else if (step === "to_parent" && data.startsWith("reg_to_parent:")) {
      pendingParentId = Number(data.split(":")[1]);
      const parent = regions.find((r) => r.id === pendingParentId)!;
      const children = await conversation.external(() =>
        prisma.location.findMany({ where: { parentId: pendingParentId! }, orderBy: { name: "asc" } })
      );
      step = "to_child";
      await ctx.reply(`📍 ${parent.name} — qaysi tuman/shahar?`, {
        reply_markup: {
          inline_keyboard: toRows(
            children
              .filter((c) => c.id !== fromLocationId)
              .map((c) => ({ text: c.name, callback_data: `reg_to_child:${c.id}` })),
            2
          ),
        },
      });
    } else if (step === "to_child" && data.startsWith("reg_to_child:") && fromLocationId !== null) {
      const toLocationId = Number(data.split(":")[1]);
      const fId = fromLocationId;
      const route = await conversation.external(() =>
        prisma.route.upsert({
          where: { fromLocationId_toLocationId: { fromLocationId: fId, toLocationId } },
          update: {},
          create: { fromLocationId: fId, toLocationId },
        })
      );
      if (!selectedRouteIds.includes(route.id)) {
        selectedRouteIds.push(route.id);
      }
      fromLocationId = null;
      fromLabel = null;
      step = "from_parent";
      await ctx.reply("Marshrut qo'shildi ✅\nYana marshrut qo'shishni xohlaysizmi?", {
        reply_markup: {
          inline_keyboard: [[
            { text: "➕ Yana marshrut qo'shish", callback_data: "reg_more" },
            { text: "✅ Tayyor", callback_data: "reg_done" },
          ]],
        },
      });
    } else if (data === "reg_more") {
      step = "from_parent";
      fromLocationId = null;
      fromLabel = null;
      await ctx.reply("Qaysi viloyatdan chiqasiz?", {
        reply_markup: {
          inline_keyboard: toRows(
            regions.map((r) => ({ text: r.name, callback_data: `reg_from_parent:${r.id}` })),
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
