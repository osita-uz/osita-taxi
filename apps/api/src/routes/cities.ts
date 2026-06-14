import { FastifyInstance } from "fastify";
import { prisma } from "@taxi/db";
import { redis } from "@taxi/queue";
import { REDIS_KEYS } from "@taxi/shared";

export async function citiesRoutes(app: FastifyInstance) {
  app.get("/cities", async () => {
    return prisma.city.findMany({ orderBy: { name: "asc" } });
  });

  app.get<{ Params: { routeId: string } }>(
    "/routes/:routeId/stats",
    async (request, reply) => {
      const routeId = Number(request.params.routeId);
      const cached = await redis.get(REDIS_KEYS.routeStats(routeId));

      if (cached === "null" || cached === null) {
        return { min: null, avg: null, max: null, hasEnoughData: false };
      }

      const stats = JSON.parse(cached) as { min: number; avg: number; max: number };
      return { ...stats, hasEnoughData: true };
    }
  );

  app.get<{ Params: { routeId: string } }>(
    "/routes/:routeId/drivers/count",
    async (request) => {
      const routeId = Number(request.params.routeId);
      const key = REDIS_KEYS.routeDriversToday(routeId);
      const count = await redis.get(key);
      return { count: Number(count ?? 0) };
    }
  );
}
