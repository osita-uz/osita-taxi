import { Worker } from "bullmq";
import { prisma } from "@taxi/db";
import { QUEUE_NAMES, REDIS_KEYS, PRICE_STATS_MIN_DATA_POINTS, PRICE_STATS_LOOKBACK_DAYS } from "@taxi/shared";
import { redis, connection } from "../redis.js";

const STATS_TTL_SECONDS = 6 * 60 * 60; // 6 soat

export function createStatsWorker() {
  return new Worker(
    QUEUE_NAMES.priceStats,
    async () => {
      const routes = await prisma.route.findMany();
      const since = new Date();
      since.setDate(since.getDate() - PRICE_STATS_LOOKBACK_DAYS);

      for (const route of routes) {
        const surveys = await prisma.priceSurvey.findMany({
          where: { routeId: route.id, createdAt: { gte: since } },
          select: { price: true },
        });

        const key = REDIS_KEYS.routeStats(route.id);

        if (surveys.length < PRICE_STATS_MIN_DATA_POINTS) {
          await redis.set(key, "null", "EX", STATS_TTL_SECONDS);
          continue;
        }

        const prices = surveys.map((s) => s.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

        await redis.set(key, JSON.stringify({ min, avg, max }), "EX", STATS_TTL_SECONDS);
      }
    },
    { connection }
  );
}
