import { FastifyInstance } from "fastify";
import { prisma } from "@taxi/db";
import type { JwtPayload } from "@taxi/shared";

export async function favoritesRoutes(app: FastifyInstance) {
  app.get(
    "/favorites",
    { preHandler: [app.authenticate] },
    async (request) => {
      const user = request.user as JwtPayload;
      return prisma.favoriteDriver.findMany({
        where: { passengerId: user.userId },
        include: { driver: { include: { user: true, driver: true } } },
      });
    }
  );

  app.post<{ Params: { driverId: string } }>(
    "/favorites/:driverId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const driverId = Number(request.params.driverId);

      await prisma.favoriteDriver.upsert({
        where: {
          passengerId_driverId: { passengerId: user.userId, driverId },
        },
        update: {},
        create: { passengerId: user.userId, driverId },
      });
      return { success: true };
    }
  );

  app.delete<{ Params: { driverId: string } }>(
    "/favorites/:driverId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const driverId = Number(request.params.driverId);

      await prisma.favoriteDriver.deleteMany({
        where: { passengerId: user.userId, driverId },
      });
      return { success: true };
    }
  );

  app.post<{ Params: { driverId: string }; Body: { orderId: number } }>(
    "/favorites/:driverId/order",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const driverId = Number(request.params.driverId);
      const { orderId } = request.body;

      const isFavorite = await prisma.favoriteDriver.findUnique({
        where: { passengerId_driverId: { passengerId: user.userId, driverId } },
      });
      if (!isFavorite) return reply.code(403).send({ error: "Not a favorite driver" });

      const order = await prisma.order.findFirst({
        where: { id: orderId, passengerId: user.userId, status: "ACTIVE" },
      });
      if (!order) return reply.code(404).send({ error: "Order not found" });

      const offer = await prisma.offer.upsert({
        where: { orderId_driverId: { orderId, driverId } },
        update: {},
        create: { orderId, driverId, price: order.price },
      });

      return offer;
    }
  );
}
