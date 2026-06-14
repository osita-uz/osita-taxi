import { Worker } from "bullmq";
import { prisma } from "@taxi/db";
import { QUEUE_NAMES, PRICE_SURVEY_SAMPLE_RATE } from "@taxi/shared";
import { connection } from "../redis.js";

export function createSurveyWorker(
  botSendFn: (telegramId: string, text: string, routeId: number) => Promise<void>
) {
  return new Worker(
    QUEUE_NAMES.priceSurvey,
    async () => {
      const routes = await prisma.route.findMany({
        include: {
          fromDistrict: true,
          toDistrict: true,
          driverRoutes: { include: { driver: { include: { user: true } } } },
        },
      });

      for (const route of routes) {
        const drivers = route.driverRoutes.map((dr) => dr.driver);
        const sampleSize = Math.ceil(drivers.length * PRICE_SURVEY_SAMPLE_RATE);
        const shuffled = drivers.sort(() => Math.random() - 0.5).slice(0, sampleSize);

        const text =
          `📊 Narx so'rovi\n\n` +
          `${route.fromDistrict.name} → ${route.toDistrict.name} yo'nalishi uchun\n` +
          `hozirgi narxingiz qanday? (so'mda)`;

        for (const driver of shuffled) {
          await botSendFn(driver.user.telegramId.toString(), text, route.id);
        }
      }
    },
    { connection }
  );
}
