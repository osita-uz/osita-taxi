import { FastifyInstance } from "fastify";
import { prisma } from "@taxi/db";
import { redis } from "@taxi/queue";
import { REDIS_KEYS } from "@taxi/shared";

export async function citiesRoutes(app: FastifyInstance) {
  app.get("/locations", async () => {
    return prisma.location.findMany({
      where: { parentId: null },
      orderBy: { id: "asc" },
      include: {
        children: { orderBy: { name: "asc" } },
      },
    });
  });

  app.get<{ Params: { locationId: string } }>(
    "/locations/:locationId/children",
    async (request) => {
      const locationId = Number(request.params.locationId);
      return prisma.location.findMany({
        where: { parentId: locationId },
        orderBy: { name: "asc" },
      });
    }
  );

  // Mini App uchun: fromLocationId + toLocationId dan route topish yoki yaratish
  app.get<{ Querystring: { fromLocationId: string; toLocationId: string } }>(
    "/routes/lookup",
    async (request, reply) => {
      const fromId = Number(request.query.fromLocationId);
      const toId = Number(request.query.toLocationId);

      if (!fromId || !toId) {
        return reply.code(400).send({ error: "fromLocationId and toLocationId are required" });
      }

      let route = await prisma.route.findFirst({
        where: { fromLocationId: fromId, toLocationId: toId },
      });

      if (!route) {
        route = await prisma.route.create({
          data: { fromLocationId: fromId, toLocationId: toId },
        });
      }

      return { id: route.id };
    }
  );

  app.get<{ Params: { routeId: string } }>(
    "/routes/:routeId/stats",
    async (request) => {
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
