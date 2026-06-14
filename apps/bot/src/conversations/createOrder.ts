import { Conversation } from "@grammyjs/conversations";
import { prisma } from "@taxi/db";
import { ORDER_LIFETIME_HOURS } from "@taxi/shared";
import { addOrderNotifyJob } from "@taxi/queue";
import type { MyContext } from "../bot.js";

function toRows<T>(items: T[], cols = 2): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return rows;
}

function parseDate(input: string): Date | null {
  const m = input.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const date = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]));
  if (isNaN(date.getTime()) || date <= new Date()) return null;
  return date;
}

export async function createOrderConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  const telegramId = BigInt(ctx.from!.id);

  const regions = await conversation.external(() =>
    prisma.region.findMany({ orderBy: { id: "asc" } })
  );

  // --- FROM REGION ---
  const msg = await ctx.reply("Qayerdan ketasiz? Viloyatni tanlang:", {
    reply_markup: {
      inline_keyboard: toRows(
        regions.map((r) => ({ text: r.name, callback_data: `co_fromreg:${r.id}` })),
        1
      ),
    },
  });

  let fromRegCtx = await conversation.waitFor("callback_query:data");
  while (!fromRegCtx.callbackQuery.data.startsWith("co_fromreg:")) {
    await fromRegCtx.answerCallbackQuery();
    fromRegCtx = await conversation.waitFor("callback_query:data");
  }
  const fromRegionId = Number(fromRegCtx.callbackQuery.data.split(":")[1]);
  await fromRegCtx.answerCallbackQuery();
  const fromRegion = regions.find((r) => r.id === fromRegionId)!;

  // --- FROM DISTRICT ---
  const fromDistricts = await conversation.external(() =>
    prisma.district.findMany({ where: { regionId: fromRegionId }, orderBy: { name: "asc" } })
  );
  await ctx.api.editMessageText(
    ctx.chat!.id, msg.message_id,
    `📍 <b>${fromRegion.name}</b> — qaysi tuman/shahar?`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: toRows(
          fromDistricts.map((d) => ({ text: d.name, callback_data: `co_from:${d.id}` })),
          2
        ),
      },
    }
  );

  let fromCtx = await conversation.waitFor("callback_query:data");
  while (!fromCtx.callbackQuery.data.startsWith("co_from:")) {
    await fromCtx.answerCallbackQuery();
    fromCtx = await conversation.waitFor("callback_query:data");
  }
  const fromDistrictId = Number(fromCtx.callbackQuery.data.split(":")[1]);
  await fromCtx.answerCallbackQuery();
  const fromDistrict = fromDistricts.find((d) => d.id === fromDistrictId)!;

  // --- TO REGION ---
  await ctx.api.editMessageText(
    ctx.chat!.id, msg.message_id,
    `📍 <b>${fromDistrict.name}</b> dan — qaysi viloyatga borasiz?`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: toRows(
          regions.map((r) => ({ text: r.name, callback_data: `co_toreg:${r.id}` })),
          1
        ),
      },
    }
  );

  let toRegCtx = await conversation.waitFor("callback_query:data");
  while (!toRegCtx.callbackQuery.data.startsWith("co_toreg:")) {
    await toRegCtx.answerCallbackQuery();
    toRegCtx = await conversation.waitFor("callback_query:data");
  }
  const toRegionId = Number(toRegCtx.callbackQuery.data.split(":")[1]);
  await toRegCtx.answerCallbackQuery();
  const toRegion = regions.find((r) => r.id === toRegionId)!;

  // --- TO DISTRICT ---
  const toDistricts = await conversation.external(() =>
    prisma.district.findMany({ where: { regionId: toRegionId }, orderBy: { name: "asc" } })
  );
  await ctx.api.editMessageText(
    ctx.chat!.id, msg.message_id,
    `📍 <b>${fromDistrict.name} → ${toRegion.name}</b> — qaysi tuman/shahar?`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: toRows(
          toDistricts
            .filter((d) => d.id !== fromDistrictId)
            .map((d) => ({ text: d.name, callback_data: `co_to:${d.id}` })),
          2
        ),
      },
    }
  );

  let toCtx = await conversation.waitFor("callback_query:data");
  while (!toCtx.callbackQuery.data.startsWith("co_to:")) {
    await toCtx.answerCallbackQuery();
    toCtx = await conversation.waitFor("callback_query:data");
  }
  const toDistrictId = Number(toCtx.callbackQuery.data.split(":")[1]);
  await toCtx.answerCallbackQuery();
  const toDistrict = toDistricts.find((d) => d.id === toDistrictId)!;

  // --- FROM PLACE ---
  await ctx.api.editMessageText(
    ctx.chat!.id, msg.message_id,
    `📍 <b>${fromDistrict.name} → ${toDistrict.name}</b>\n\nAniq joy yoki manzilni kiriting\n(masalan: Yunusobod 7-mavze, avtobekati):`,
    { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
  );
  const fromPlaceCtx = await conversation.waitFor("message:text");
  const fromPlace = fromPlaceCtx.message.text;

  // --- TO PLACE ---
  await ctx.reply("Boradigan aniq joyingizni kiriting:");
  const toPlaceCtx = await conversation.waitFor("message:text");
  const toPlace = toPlaceCtx.message.text;

  // --- DATE ---
  await ctx.reply(
    "Sana va vaqtni kiriting:\n<code>KK.OO.YYYY SS:MM</code>\n(masalan: 16.06.2026 09:00)",
    { parse_mode: "HTML" }
  );
  let travelDate: Date | null = null;
  while (!travelDate) {
    const dateCtx = await conversation.waitFor("message:text");
    travelDate = parseDate(dateCtx.message.text);
    if (!travelDate) {
      await ctx.reply("❌ Format noto'g'ri yoki o'tgan vaqt. Qaytadan kiriting (masalan: 16.06.2026 09:00):");
    }
  }
  const finalDate = travelDate;

  // --- SEATS ---
  await ctx.reply("Nechta o'rin kerak?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚌 To'liq salon", callback_data: "co_seat:full" }],
        [
          { text: "1 ta", callback_data: "co_seat:1" },
          { text: "2 ta", callback_data: "co_seat:2" },
          { text: "3 ta", callback_data: "co_seat:3" },
          { text: "4 ta", callback_data: "co_seat:4" },
        ],
      ],
    },
  });
  let seatCtx = await conversation.waitFor("callback_query:data");
  while (!seatCtx.callbackQuery.data.startsWith("co_seat:")) {
    await seatCtx.answerCallbackQuery();
    seatCtx = await conversation.waitFor("callback_query:data");
  }
  await seatCtx.answerCallbackQuery();
  const seatRaw = seatCtx.callbackQuery.data.split(":")[1];
  const seatType: "FULL" | "PARTIAL" = seatRaw === "full" ? "FULL" : "PARTIAL";
  const seatCount: number | null = seatRaw === "full" ? null : Number(seatRaw);

  // --- LUGGAGE ---
  await ctx.reply("Bagaj bor?", {
    reply_markup: {
      inline_keyboard: [[
        { text: "Yo'q", callback_data: "co_lug:NONE" },
        { text: "Kichik 🧳", callback_data: "co_lug:SMALL" },
        { text: "Katta 📦", callback_data: "co_lug:LARGE" },
      ]],
    },
  });
  let lugCtx = await conversation.waitFor("callback_query:data");
  while (!lugCtx.callbackQuery.data.startsWith("co_lug:")) {
    await lugCtx.answerCallbackQuery();
    lugCtx = await conversation.waitFor("callback_query:data");
  }
  await lugCtx.answerCallbackQuery();
  const luggage = lugCtx.callbackQuery.data.split(":")[1] as "NONE" | "SMALL" | "LARGE";

  // --- PRICE ---
  await ctx.reply("Narx taklifingizni kiriting (so'mda):");
  let price: number | null = null;
  while (!price) {
    const priceCtx = await conversation.waitFor("message:text");
    const p = Number(priceCtx.message.text.replace(/\s/g, "").replace(/,/g, ""));
    if (!isNaN(p) && p > 0) price = p;
    else await ctx.reply("❌ To'g'ri narx kiriting (masalan: 150000):");
  }
  const finalPrice = price;

  // --- NOTE ---
  await ctx.reply("Izoh (ixtiyoriy):", {
    reply_markup: {
      inline_keyboard: [[{ text: "O'tkazib yuborish ➡️", callback_data: "co_skip_note" }]],
    },
  });
  let note: string | null = null;
  while (true) {
    const noteUpd = await conversation.waitFor(["message:text", "callback_query:data"]);
    if (noteUpd.callbackQuery?.data === "co_skip_note") {
      await noteUpd.answerCallbackQuery();
      break;
    }
    if (noteUpd.message?.text) { note = noteUpd.message.text; break; }
  }

  // --- URGENT ---
  await ctx.reply("Tezkor buyurtma (haydovchi darhol topiladi)?", {
    reply_markup: {
      inline_keyboard: [[
        { text: "⚡️ Ha", callback_data: "co_urgent:yes" },
        { text: "Yo'q", callback_data: "co_urgent:no" },
      ]],
    },
  });
  let urgentCtx = await conversation.waitFor("callback_query:data");
  while (!urgentCtx.callbackQuery.data.startsWith("co_urgent:")) {
    await urgentCtx.answerCallbackQuery();
    urgentCtx = await conversation.waitFor("callback_query:data");
  }
  await urgentCtx.answerCallbackQuery();
  const isUrgent = urgentCtx.callbackQuery.data === "co_urgent:yes";

  // --- CONFIRM ---
  const dateStr = finalDate.toLocaleDateString("uz-UZ", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
  const seatStr = seatType === "FULL" ? "To'liq salon" : `${seatCount} ta o'rin`;
  const lugStr = luggage === "NONE" ? "Yo'q" : luggage === "SMALL" ? "Kichik 🧳" : "Katta 📦";

  await ctx.reply(
    `📋 <b>Buyurtmangiz:</b>\n\n` +
    `📍 ${fromDistrict.name}, ${fromPlace}\n    → ${toDistrict.name}, ${toPlace}\n` +
    `📅 ${dateStr}\n` +
    `💺 ${seatStr} | 🧳 ${lugStr}\n` +
    `💰 ${finalPrice.toLocaleString()} so'm` +
    (note ? `\n📝 ${note}` : "") +
    (isUrgent ? "\n⚡️ Tezkor" : ""),
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Tasdiqlash", callback_data: "co_confirm:yes" },
          { text: "❌ Bekor qilish", callback_data: "co_confirm:no" },
        ]],
      },
    }
  );

  let confirmCtx = await conversation.waitFor("callback_query:data");
  while (!confirmCtx.callbackQuery.data.startsWith("co_confirm:")) {
    await confirmCtx.answerCallbackQuery();
    confirmCtx = await conversation.waitFor("callback_query:data");
  }
  await confirmCtx.answerCallbackQuery();

  const { passengerKeyboard } = await import("../keyboards/main.js");

  if (confirmCtx.callbackQuery.data === "co_confirm:no") {
    await ctx.reply("Buyurtma bekor qilindi.", { reply_markup: passengerKeyboard });
    return;
  }

  // --- CREATE ORDER ---
  const orderId = await conversation.external(async () => {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return null;

    const route =
      (await prisma.route.findFirst({
        where: { fromRegionId, fromDistrictId, toRegionId, toDistrictId },
      })) ??
      (await prisma.route.create({
        data: { fromRegionId, fromDistrictId, toRegionId, toDistrictId },
      }));

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ORDER_LIFETIME_HOURS);

    const order = await prisma.order.create({
      data: {
        passengerId: user.id,
        routeId: route.id,
        fromPlace,
        toPlace,
        travelDate: finalDate,
        seatType,
        seatCount,
        luggage,
        price: finalPrice,
        note,
        isUrgent,
        expiresAt,
      },
    });

    await addOrderNotifyJob(order.id);
    return order.id;
  });

  await ctx.reply(
    orderId
      ? `✅ Buyurtma #${orderId} yaratildi!\nHaydovchilar siz bilan bog'lanadi.`
      : "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.",
    { reply_markup: passengerKeyboard }
  );
}
