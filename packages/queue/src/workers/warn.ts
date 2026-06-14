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
          route: { include: { fromRegion: true, fromDistrict: true, toRegion: true, toDistrict: true } },
        },
      });

      if (!order || order.status !== "ACTIVE") return;

      const dateStr = order.travelDate.toLocaleDateString("uz-UZ", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });

      const text =
        `⏳ Buyurtmangizga 15 daqiqa qoldi!\n` +
        `${order.route.fromDistrict?.name ?? order.route.fromRegion.name + " (barchasi)"} → ${order.route.toDistrict?.name ?? order.route.toRegion.name + " (barchasi)"} (${dateStr})`;

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
