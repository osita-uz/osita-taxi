import { Worker, Job } from "bullmq";
import { prisma } from "@taxi/db";
import { QUEUE_NAMES } from "@taxi/shared";
import { connection } from "../redis.js";

export function createWarnWorker(
  botSendFn: (telegramId: string, text: string, orderId: number, canExtend: boolean) => Promise<void>
) {
  return new Worker(
    QUEUE_NAMES.ordersWarn,
    async (job: Job<{ orderId: number }>) => {
      const { orderId } = job.data;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          passenger: true,
          route: { include: { from: true, to: true } },
        },
      });

      if (!order || order.status !== "ACTIVE") return;

      const dateStr = order.travelDate.toLocaleDateString("uz-UZ", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });

      const fromName = order.route.from.parentId === null
        ? `${order.route.from.name} (barchasi)`
        : order.route.from.name;
      const toName = order.route.to.parentId === null
        ? `${order.route.to.name} (barchasi)`
        : order.route.to.name;

      const text =
        `⏳ Buyurtmangizga 15 daqiqa qoldi!\n` +
        `${fromName} → ${toName} (${dateStr})`;

      await botSendFn(
        order.passenger.telegramId.toString(),
        text,
        orderId,
        !order.isExtended
      );
    },
    { connection }
  );
}
