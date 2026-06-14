import { FastifyInstance } from "fastify";
import { prisma } from "@taxi/db";
import type { JwtPayload, OfferDto } from "@taxi/shared";

export async function offersRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    "/orders/:id/offers",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const orderId = Number(request.params.id);

      const order = await prisma.order.findFirst({
        where: { id: orderId, passengerId: user.userId },
      });
      if (!order) return reply.code(404).send({ error: "Order not found" });

      const favorites = await prisma.favoriteDriver.findMany({
        where: { passengerId: user.userId },
        select: { driverId: true },
      });
      const favoriteDriverIds = new Set(favorites.map((f) => f.driverId));

      const offers = await prisma.offer.findMany({
        where: { orderId },
        orderBy: { price: "asc" },
        include: { driver: { include: { user: true } } },
      });

      const result: OfferDto[] = offers.map((offer) => ({
        id: offer.id,
        price: offer.price,
        driverName: offer.driver.user.name,
        driverRating: offer.driver.rating,
        isFavorite: favoriteDriverIds.has(offer.driver.userId),
      }));

      return result;
    }
  );

  app.post<{ Params: { id: string; offerId: string } }>(
    "/orders/:id/offers/:offerId/accept",
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const orderId = Number(request.params.id);
      const offerId = Number(request.params.offerId);

      const order = await prisma.order.findFirst({
        where: { id: orderId, passengerId: user.userId, status: "ACTIVE" },
      });
      if (!order) return reply.code(404).send({ error: "Order not found" });

      const offer = await prisma.offer.findFirst({
        where: { id: offerId, orderId },
        include: { driver: { include: { user: true } } },
      });
      if (!offer) return reply.code(404).send({ error: "Offer not found" });

      await prisma.$transaction([
        prisma.offer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } }),
        prisma.offer.updateMany({
          where: { orderId, id: { not: offerId } },
          data: { status: "REJECTED" },
        }),
        prisma.order.update({ where: { id: orderId }, data: { status: "COMPLETED" } }),
        prisma.priceSurvey.create({
          data: {
            routeId: order.routeId,
            driverId: offer.driverId,
            price: offer.price,
            source: "ACCEPTED_OFFER",
          },
        }),
      ]);

      return { driverPhone: offer.driver.user.phone };
    }
  );
}
