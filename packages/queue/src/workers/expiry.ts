import { Worker } from "bullmq";
import { prisma } from "@taxi/db";
import { QUEUE_NAMES, ORDER_WARN_BEFORE_MINUTES } from "@taxi/shared";
import { connection } from "../redis.js";
import { addOrderWarnJob } from "../queues.js";

export function createExpiryWorker(
  botSendFn: (telegramId: string, text: string, orderId: number, canExtend: boolean) => Promise<void>
) {
  return new Worker(
    QUEUE_NAMES.ordersExpiry,
    async () => {
      const now = new Date();
      const warnThreshold = new Date(now.getTime() + ORDER_WARN_BEFORE_MINUTES * 60 * 1000);

      // Orders soon expiring (warn)
      const soonExpiring = await prisma.order.findMany({
        where: {
          status: "ACTIVE",
          isExtended: false,
          expiresAt: { gt: now, lte: warnThreshold },
        },
        include: { passenger: true, route: { include: { fromDistrict: true, toDistrict: true } } },
      });

      for (const order of soonExpiring) {
        await addOrderWarnJob(order.id, 0);
      }

      // Expired orders
      const expired = await prisma.order.findMany({
        where: { status: "ACTIVE", expiresAt: { lte: now } },
        include: {
          offers: { include: { driver: { include: { user: true } } } },
          route: { include: { fromDistrict: true, toDistrict: true } },
        },
      });

      for (const order of expired) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "EXPIRED" },
        });

        const dateStr = order.travelDate.toLocaleDateString("uz-UZ", {
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        });

        const text =
          `❌ Buyurtma bekor qilindi\n\n` +
          `${order.route.fromDistrict.name} → ${order.route.toDistrict.name} (${dateStr})\n` +
          `Taklifingiz bekor bo'ldi.`;

        for (const offer of order.offers) {
          if (offer.status === "PENDING") {
            await botSendFn(offer.driver.user.telegramId.toString(), text, order.id, false);
          }
        }
      }
    },
    { connection }
  );
}
