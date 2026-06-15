import { FastifyInstance } from "fastify";
import { prisma } from "@taxi/db";
import { verifyInitData, parseTelegramUser } from "@taxi/shared";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/init",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const { initData } = request.body as { initData: string };

      if (!initData) {
        return reply.code(400).send({ error: "initData required" });
      }

      const botToken = process.env.BOT_TOKEN ?? "";
      const isDev = process.env.NODE_ENV !== "production";
      if (!isDev && botToken && !verifyInitData(initData, botToken)) {
        return reply.code(401).send({ error: "Invalid initData" });
      }

      const telegramUser = parseTelegramUser(initData);
      if (!telegramUser) {
        return reply.code(400).send({ error: "Cannot parse user from initData" });
      }

      const telegramId = BigInt(telegramUser.id);
      const name = [telegramUser.first_name, telegramUser.last_name]
        .filter(Boolean)
        .join(" ");

      let user = await prisma.user.findUnique({ where: { telegramId } });

      if (!user) {
        user = await prisma.user.create({
          data: { telegramId, name, role: "PASSENGER" },
        });
      }

      const token = await app.jwt.sign({
        userId: user.id,
        telegramId: user.telegramId.toString(),
        role: user.role,
      });

      return {
        token,
        user: {
          id: user.id,
          telegramId: user.telegramId.toString(),
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      };
    }
  );
}
