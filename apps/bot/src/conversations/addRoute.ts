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

export async function addRouteConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  const regions = await conversation.external(() =>
    prisma.region.findMany({ orderBy: { id: "asc" } })
  );

  const regionButtons = toRows(
    regions.map((r) => ({ text: r.name, callback_data: `ar_fromreg:${r.id}` })),
    1
  );

  const msg = await ctx.reply("Qaysi viloyatdan chiqasiz?", {
    reply_markup: { inline_keyboard: regionButtons },
  });

  let fromRegCtx = await conversation.waitFor("callback_query:data");
  while (!fromRegCtx.callbackQuery.data.startsWith("ar_fromreg:")) {
    await fromRegCtx.answerCallbackQuery();
    fromRegCtx = await conversation.waitFor("callback_query:data");
  }
  const fromRegionId = Number(fromRegCtx.callbackQuery.data.split(":")[1]);
  await fromRegCtx.answerCallbackQuery();

  const fromRegion = regions.find((r) => r.id === fromRegionId)!;

  const fromDistricts = await conversation.external(() =>
    prisma.district.findMany({
      where: { regionId: fromRegionId },
      orderBy: { name: "asc" },
    })
  );

  await ctx.api.editMessageText(
    ctx.chat!.id,
    msg.message_id,
    `📍 <b>${fromRegion.name}</b> — qaysi tuman/shahar?`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: toRows(
          fromDistricts.map((d) => ({ text: d.name, callback_data: `ar_from:${d.id}` })),
          2
        ),
      },
    }
  );

  let fromCtx = await conversation.waitFor("callback_query:data");
  while (!fromCtx.callbackQuery.data.startsWith("ar_from:")) {
    await fromCtx.answerCallbackQuery();
    fromCtx = await conversation.waitFor("callback_query:data");
  }
  const fromId = Number(fromCtx.callbackQuery.data.split(":")[1]);
  await fromCtx.answerCallbackQuery();

  const fromDistrict = fromDistricts.find((d) => d.id === fromId)!;

  const toRegionButtons = toRows(
    regions.map((r) => ({ text: r.name, callback_data: `ar_toreg:${r.id}` })),
    1
  );

  await ctx.api.editMessageText(
    ctx.chat!.id,
    msg.message_id,
    `📍 <b>${fromDistrict.name}</b> dan — qaysi viloyatga borasiz?`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: toRegionButtons },
    }
  );

  let toRegCtx = await conversation.waitFor("callback_query:data");
  while (!toRegCtx.callbackQuery.data.startsWith("ar_toreg:")) {
    await toRegCtx.answerCallbackQuery();
    toRegCtx = await conversation.waitFor("callback_query:data");
  }
  const toRegionId = Number(toRegCtx.callbackQuery.data.split(":")[1]);
  await toRegCtx.answerCallbackQuery();

  const toRegion = regions.find((r) => r.id === toRegionId)!;

  const toDistricts = await conversation.external(() =>
    prisma.district.findMany({
      where: { regionId: toRegionId },
      orderBy: { name: "asc" },
    })
  );

  await ctx.api.editMessageText(
    ctx.chat!.id,
    msg.message_id,
    `📍 <b>${fromDistrict.name} → ${toRegion.name}</b> — qaysi tuman/shahar?`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: toRows(
          toDistricts
            .filter((d) => d.id !== fromId)
            .map((d) => ({ text: d.name, callback_data: `ar_to:${d.id}` })),
          2
        ),
      },
    }
  );

  let toCtx = await conversation.waitFor("callback_query:data");
  while (!toCtx.callbackQuery.data.startsWith("ar_to:")) {
    await toCtx.answerCallbackQuery();
    toCtx = await conversation.waitFor("callback_query:data");
  }
  const toId = Number(toCtx.callbackQuery.data.split(":")[1]);
  await toCtx.answerCallbackQuery();

  const toDistrict = toDistricts.find((d) => d.id === toId)!;

  await conversation.external(async () => {
    const telegramId = BigInt(ctx.from!.id);
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;

    const driver = await prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) return;

    const [route, reverseRoute] = await Promise.all([
      prisma.route.upsert({
        where: { fromDistrictId_toDistrictId: { fromDistrictId: fromId, toDistrictId: toId } },
        update: {},
        create: { fromDistrictId: fromId, toDistrictId: toId },
      }),
      prisma.route.upsert({
        where: { fromDistrictId_toDistrictId: { fromDistrictId: toId, toDistrictId: fromId } },
        update: {},
        create: { fromDistrictId: toId, toDistrictId: fromId },
      }),
    ]);

    await Promise.all(
      [route, reverseRoute].map((r) =>
        prisma.driverRoute.upsert({
          where: { driverId_routeId: { driverId: driver.userId, routeId: r.id } },
          update: {},
          create: { driverId: driver.userId, routeId: r.id },
        })
      )
    );
  });

  await ctx.api.editMessageText(
    ctx.chat!.id,
    msg.message_id,
    `✅ Marshrut qo'shildi: <b>${fromDistrict.name} → ${toDistrict.name}</b>\n` +
      `↩️ Teskari marshrut ham qo'shildi: <b>${toDistrict.name} → ${fromDistrict.name}</b>`,
    { parse_mode: "HTML" }
  );
}
