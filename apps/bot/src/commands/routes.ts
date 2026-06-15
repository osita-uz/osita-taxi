import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "@taxi/db";
import type { MyContext } from "../bot.js";

function routeLabel(from: { name: string; parentId: number | null }, to: { name: string; parentId: number | null }): string {
  const fromName = from.parentId === null ? `${from.name} (barchasi)` : from.name;
  const toName = to.parentId === null ? `${to.name} (barchasi)` : to.name;
  return `${fromName} → ${toName}`;
}

export function registerRoutesCommand(bot: Bot<MyContext>) {
  bot.command("routes", async (ctx) => {
    await showRoutes(ctx);
  });

  bot.hears("🗺 Marshrutlarim", async (ctx) => {
    await showRoutes(ctx);
  });

  bot.callbackQuery(/^route_delete:(\d+)$/, async (ctx) => {
    const routeId = Number(ctx.match[1]);
    const telegramId = BigInt(ctx.from.id);
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return ctx.answerCallbackQuery();

    await prisma.driverRoute.deleteMany({
      where: { driverId: user.id, routeId },
    });

    await ctx.answerCallbackQuery("Marshrut o'chirildi");
    await showRoutes(ctx as any);
  });

  bot.callbackQuery("route_add", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter("addRoute", { overwrite: true });
  });
}

async function showRoutes(ctx: any) {
  const telegramId = BigInt(ctx.from!.id);
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: {
      driver: {
        include: {
          routes: {
            include: { route: { include: { from: true, to: true } } },
          },
        },
      },
    },
  });

  if (!user?.driver || user.driver.routes.length === 0) {
    const kb = new InlineKeyboard().text("➕ Marshrut qo'shish", "route_add");
    return ctx.reply("Sizda hali marshrut yo'q.", { reply_markup: kb });
  }

  const kb = new InlineKeyboard();
  for (const dr of user.driver.routes) {
    kb.text(routeLabel(dr.route.from, dr.route.to), "noop")
      .text("❌", `route_delete:${dr.routeId}`)
      .row();
  }
  kb.text("➕ Marshrut qo'shish", "route_add");

  await ctx.reply("Marshrutlaringiz:", { reply_markup: kb });
}
