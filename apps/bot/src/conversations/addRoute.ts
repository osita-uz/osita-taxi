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

function locationLabel(loc: { name: string; parentId: number | null }): string {
  return loc.parentId === null ? `${loc.name} (barchasi)` : loc.name;
}

async function pickLocation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  msgId: number,
  prefix: string,
  prompt: string
): Promise<{ id: number; label: string }> {
  const regions = await conversation.external(() =>
    prisma.location.findMany({ where: { parentId: null }, orderBy: { id: "asc" } })
  );

  await ctx.api.editMessageText(ctx.chat!.id, msgId, prompt, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: toRows(
        regions.map((r) => ({ text: r.name, callback_data: `${prefix}_parent:${r.id}` })),
        1
      ),
    },
  });

  while (true) {
    const cbCtx = await conversation.waitFor("callback_query:data");
    const data = cbCtx.callbackQuery.data;
    await cbCtx.answerCallbackQuery();

    if (data.startsWith(`${prefix}_parent:`)) {
      const parentId = Number(data.split(":")[1]);
      const parent = regions.find((r) => r.id === parentId)!;
      const children = await conversation.external(() =>
        prisma.location.findMany({ where: { parentId }, orderBy: { name: "asc" } })
      );

      await ctx.api.editMessageText(
        ctx.chat!.id,
        msgId,
        `📍 <b>${parent.name}</b> — qaysi tuman/shahar?`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Hammasi (butun viloyat)", callback_data: `${prefix}_all:${parent.id}` }],
              ...toRows(
                children.map((c) => ({ text: c.name, callback_data: `${prefix}_child:${c.id}` })),
                2
              ),
            ],
          },
        }
      );
    } else if (data.startsWith(`${prefix}_all:`)) {
      const parentId = Number(data.split(":")[1]);
      const parent = regions.find((r) => r.id === parentId)!;
      return { id: parentId, label: `${parent.name} (barchasi)` };
    } else if (data.startsWith(`${prefix}_child:`)) {
      const childId = Number(data.split(":")[1]);
      const children = await conversation.external(() =>
        prisma.location.findMany({ where: { parentId: { not: null } } })
      );
      const child = children.find((c) => c.id === childId);
      return { id: childId, label: child?.name ?? String(childId) };
    }
  }
}

export async function addRouteConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
) {
  const msg = await ctx.reply("Qaysi viloyatdan chiqasiz?");

  const from = await pickLocation(conversation, ctx, msg.message_id, "ar_from", "Qaysi viloyatdan chiqasiz?");
  const to = await pickLocation(
    conversation, ctx, msg.message_id, "ar_to",
    `📍 <b>${from.label}</b> dan — qaysi yo'nalishga borasiz?`
  );

  await conversation.external(async () => {
    const telegramId = BigInt(ctx.from!.id);
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;
    const driver = await prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) return;

    const upsertRoute = (fromLocationId: number, toLocationId: number) =>
      prisma.route.upsert({
        where: { fromLocationId_toLocationId: { fromLocationId, toLocationId } },
        update: {},
        create: { fromLocationId, toLocationId },
      });

    const [route, reverseRoute] = await Promise.all([
      upsertRoute(from.id, to.id),
      upsertRoute(to.id, from.id),
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
    `✅ Marshrut qo'shildi: <b>${from.label} → ${to.label}</b>\n` +
      `↩️ Teskari marshrut ham qo'shildi: <b>${to.label} → ${from.label}</b>`,
    { parse_mode: "HTML" }
  );
}
