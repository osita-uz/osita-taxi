import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth.js";
import { citiesRoutes } from "./routes/cities.js";
import { ordersRoutes } from "./routes/orders.js";
import { offersRoutes } from "./routes/offers.js";
import { favoritesRoutes } from "./routes/favorites.js";

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  await app.register(fastifyCors, { origin: true });

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret",
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "24h" },
  });

  await app.register(fastifyRateLimit, {
    global: false,
  });

  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(citiesRoutes);
  await app.register(ordersRoutes);
  await app.register(offersRoutes);
  await app.register(favoritesRoutes);

  return app;
}
