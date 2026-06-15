import { Worker, Job } from "bullmq";
import { prisma } from "@taxi/db";
import { QUEUE_NAMES, REDIS_KEYS } from "@taxi/shared";
import { redis, connection } from "../redis.js";

async function sendOrderToDriver(
  driverTelegramId: bigint,
  order: {
    id: number;
    fromPlace: string;
    toPlace: string;
    travelDate: Date;
    seatType: string;
    seatCount: number | null;
    luggage: string;
    price: number;
    isUrgent: boolean;
    route: {
      from: { name: string; parentId: number | null };
      to: { name: string; parentId: number | null };
    };
  },
  botSendFn: (telegramId: string, text: string, orderId: number) => Promise<void>
) {
  const fromName = order.route.from.parentId === null
    ? `${order.route.from.name} (barchasi)`
    : order.route.from.name;
  const toName = order.route.to.parentId === null
    ? `${order.route.to.name} (barchasi)`
    : order.route.to.name;

  const date = order.travelDate.toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const seat =
    order.seatType === "PARTIAL" && order.seatCount
      ? `${order.seatCount} ta o'rin`
      : "To'liq salon";
  const luggage =
    order.luggage === "NONE"
      ? ""
      : ` | ${order.luggage === "SMALL" ? "Kichik bagaj" : "Katta bagaj"}`;

  const text =
    `🆕 Yangi buyurtma\n\n` +
    `📍 ${fromName}, ${order.fromPlace} → ${toName}, ${order.toPlace}\n` +
    `📅 ${date}\n` +
    `💺 ${seat}${luggage}\n` +
    `💰 Mijoz narxi: ${order.price.toLocaleString()} so'm` +
    (order.isUrgent ? `\n⚡️ Tez ketaman!` : "");

  await botSendFn(driverTelegramId.toString(), text, order.id);
  await redis.incr(REDIS_KEYS.orderViews(order.id));
}

export function createNotifyWorker(
  botSendFn: (telegramId: string, text: string, orderId: number) => Promise<void>
) {
  return new Worker(
    QUEUE_NAMES.ordersNotify,
    async (job: Job<{ orderId: number }>) => {
      const { orderId } = job.data;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { route: { include: { from: true, to: true } } },
      });

      if (!order || order.status !== "ACTIVE") return;

      const driverRoutes = await prisma.driverRoute.findMany({
        where: { routeId: order.routeId },
        include: { driver: { include: { user: true } } },
      });

      const promises = driverRoutes.map((dr) =>
        sendOrderToDriver(dr.driver.user.telegramId, order, botSendFn)
      );

      if (order.isUrgent) {
        const onRoadDrivers = await prisma.driverOnRoad.findMany({
          where: { routeId: order.routeId },
          include: { driver: { include: { user: true } } },
        });

        const onRoadTelegramIds = new Set(
          driverRoutes.map((dr) => dr.driver.user.telegramId.toString())
        );

        for (const d of onRoadDrivers) {
          if (!onRoadTelegramIds.has(d.driver.user.telegramId.toString())) {
            promises.push(
              sendOrderToDriver(d.driver.user.telegramId, order, botSendFn)
            );
          }
        }
      }

      await Promise.allSettled(promises);
    },
    { connection }
  );
}
