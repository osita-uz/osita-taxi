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
        inline_keyboard: [
          [{ text: "Hammasi", callback_data: "ar_from_all" }],
          ...toRows(
            fromDistricts.map((d) => ({ text: d.name, callback_data: `ar_from:${d.id}` })),
            2
          ),
        ],
      },
    }
  );

  let fromCtx = await conversation.waitFor("callback_query:data");
  while (
    !fromCtx.callbackQuery.data.startsWith("ar_from:") &&
    fromCtx.callbackQuery.data !== "ar_from_all"
  ) {
    await fromCtx.answerCallbackQuery();
    fromCtx = await conversation.waitFor("callback_query:data");
  }
  await fromCtx.answerCallbackQuery();

  let fromDistrictId: number | null;
  let fromLabel: string;
  if (fromCtx.callbackQuery.data === "ar_from_all") {
    fromDistrictId = null;
    fromLabel = `${fromRegion.name} (barchasi)`;
  } else {
    fromDistrictId = Number(fromCtx.callbackQuery.data.split(":")[1]);
    fromLabel = fromDistricts.find((d) => d.id === fromDistrictId)!.name;
  }

  const toRegionButtons = toRows(
    regions.map((r) => ({ text: r.name, callback_data: `ar_toreg:${r.id}` })),
    1
  );

  await ctx.api.editMessageText(
    ctx.chat!.id,
    msg.message_id,
    `📍 <b>${fromLabel}</b> dan — qaysi viloyatga borasiz?`,
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
    `📍 <b>${fromLabel} → ${toRegion.name}</b> — qaysi tuman/shahar?`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Hammasi", callback_data: "ar_to_all" }],
          ...toRows(
            toDistricts
              .filter((d) => d.id !== fromDistrictId)
              .map((d) => ({ text: d.name, callback_data: `ar_to:${d.id}` })),
            2
          ),
        ],
      },
    }
  );

  let toCtx = await conversation.waitFor("callback_query:data");
  while (
    !toCtx.callbackQuery.data.startsWith("ar_to:") &&
    toCtx.callbackQuery.data !== "ar_to_all"
  ) {
    await toCtx.answerCallbackQuery();
    toCtx = await conversation.waitFor("callback_query:data");
  }
  await toCtx.answerCallbackQuery();

  let toDistrictId: number | null;
  let toLabel: string;
  if (toCtx.callbackQuery.data === "ar_to_all") {
    toDistrictId = null;
    toLabel = `${toRegion.name} (barchasi)`;
  } else {
    toDistrictId = Number(toCtx.callbackQuery.data.split(":")[1]);
    toLabel = toDistricts.find((d) => d.id === toDistrictId)!.name;
  }

  await conversation.external(async () => {
    const telegramId = BigInt(ctx.from!.id);
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;

    const driver = await prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) return;

    const fwd = { fromRegionId, fromDistrictId, toRegionId, toDistrictId };
    const rev = {
      fromRegionId: toRegionId,
      fromDistrictId: toDistrictId,
      toRegionId: fromRegionId,
      toDistrictId: fromDistrictId,
    };

    // prisma compound unique where rejects null — use findFirst+create instead
    const findOrCreate = async (data: typeof fwd) =>
      (await prisma.route.findFirst({ where: data })) ?? prisma.route.create({ data });

    const [route, reverseRoute] = await Promise.all([
      findOrCreate(fwd),
      findOrCreate(rev),
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
    `✅ Marshrut qo'shildi: <b>${fromLabel} → ${toLabel}</b>\n` +
      `↩️ Teskari marshrut ham qo'shildi: <b>${toLabel} → ${fromLabel}</b>`,
    { parse_mode: "HTML" }
  );
}
