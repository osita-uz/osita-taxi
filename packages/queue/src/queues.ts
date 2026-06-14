import { Queue } from "bullmq";
import { QUEUE_NAMES } from "@taxi/shared";
import { connection } from "./redis.js";

export const ordersNotifyQueue = new Queue(QUEUE_NAMES.ordersNotify, { connection });
export const ordersExpiryQueue = new Queue(QUEUE_NAMES.ordersExpiry, { connection });
export const ordersWarnQueue = new Queue(QUEUE_NAMES.ordersWarn, { connection });
export const priceSurveyQueue = new Queue(QUEUE_NAMES.priceSurvey, { connection });
export const priceStatsQueue = new Queue(QUEUE_NAMES.priceStats, { connection });

export async function addOrderNotifyJob(orderId: number) {
  await ordersNotifyQueue.add("notify", { orderId });
}

export async function addOrderWarnJob(orderId: number, delay: number) {
  await ordersWarnQueue.add("warn", { orderId }, { delay });
}
