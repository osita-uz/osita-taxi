import { Redis } from "ioredis";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// bullmq pins ioredis@5.10.1 but this package resolves ^5.3.2 to 5.11.1.
// Both versions are wire-compatible; `any` sidesteps the structural type mismatch.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const connection: any = redis;
