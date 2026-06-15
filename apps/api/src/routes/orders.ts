import { FastifyInstance } from "fastify";
import { prisma } from "@taxi/db";
import { redis } from "@taxi/queue";
import { addOrderNotifyJob } from "@taxi/queue";
import { REDIS_KEYS, ORDER_LIFETIME_HOURS, ORDER_EXTEND_HOURS, CreateOrderBody } from "@taxi/shared";
import type { JwtPayload } from "@taxi/shared";

export async function ordersRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateOrderBody }>(
    "/orders",
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const body = request.body;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ORDER_LIFETIME_HOURS);

      const order = await prisma.order.create({
        data: {
          passengerId: user.userId,
          routeId: body.routeId,
          fromPlace: body.fromPlace,
          toPlace: body.toPlace,
          travelDate: new Date(body.travelDate),
          seatType: body.seatType,
          seatCount: body.seatCount ?? null,
          luggage: body.luggage,
          price: body.price,
          note: body.note ?? null,
          isUrgent: body.isUrgent ?? false,
          expiresAt,
        },
      });

      await addOrderNotifyJob(order.id);

      return order;
    }
  );

  app.get(
    "/orders",
    { preHandler: [app.authenticate] },
    async (request) => {
      const user = request.user as JwtPayload;
      return prisma.order.findMany({
        where: { passengerId: user.userId },
        orderBy: { createdAt: "desc" },
        include: { route: { include: { from: true, to: true } } },
      });
    }
  );

  app.get<{ Params: { id: string } }>(
    "/orders/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const id = Number(request.params.id);

      const order = await prisma.order.findFirst({
        where: { id, passengerId: user.userId },
        include: {
          route: { include: { from: true, to: true } },
          offers: { include: { driver: { include: { user: true } } } },
        },
      });

      if (!order) return reply.code(404).send({ error: "Order not found" });

      const viewCount = Number(await redis.get(REDIS_KEYS.orderViews(id)) ?? 0);
      return { ...order, viewCount };
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/orders/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const id = Number(request.params.id);

      const order = await prisma.order.findFirst({
        where: { id, passengerId: user.userId, status: "ACTIVE" },
      });
      if (!order) return reply.code(404).send({ error: "Order not found" });

      await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
      return { success: true };
    }
  );

  app.put<{ Params: { id: string } }>(
    "/orders/:id/extend",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const id = Number(request.params.id);

      const order = await prisma.order.findFirst({
        where: { id, passengerId: user.userId, status: "ACTIVE", isExtended: false },
      });
      if (!order) return reply.code(404).send({ error: "Cannot extend order" });

      const newExpiry = new Date(order.expiresAt);
      newExpiry.setHours(newExpiry.getHours() + ORDER_EXTEND_HOURS);

      const updated = await prisma.order.update({
        where: { id },
        data: { isExtended: true, expiresAt: newExpiry },
      });
      return updated;
    }
  );

  app.post<{ Params: { id: string }; Body: { rating: number; comment?: string } }>(
    "/orders/:id/rate",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const id = Number(request.params.id);
      const { rating, comment } = request.body;

      if (rating < 1 || rating > 5) {
        return reply.code(400).send({ error: "Rating must be 1-5" });
      }

      const order = await prisma.order.findFirst({
        where: { id, passengerId: user.userId, status: "COMPLETED" },
        include: { offers: { where: { status: "ACCEPTED" } } },
      });
      if (!order) return reply.code(404).send({ error: "Order not found" });

      const acceptedOffer = order.offers[0];
      if (!acceptedOffer) return reply.code(400).send({ error: "No accepted offer" });

      const driver = await prisma.driver.findUnique({ where: { userId: acceptedOffer.driverId } });
      if (!driver) return reply.code(404).send({ error: "Driver not found" });

      const newCount = driver.ratingCount + 1;
      const newRating = (driver.rating * driver.ratingCount + rating) / newCount;

      await prisma.driver.update({
        where: { userId: driver.userId },
        data: { rating: newRating, ratingCount: newCount },
      });

      return { success: true };
    }
  );
}
