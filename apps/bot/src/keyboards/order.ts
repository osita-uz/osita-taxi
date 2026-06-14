import { InlineKeyboard } from "grammy";

export function orderActionKeyboard(orderId: number) {
  return new InlineKeyboard()
    .text("✅ Rozi bo'laman", `offer:accept:${orderId}`)
    .text("💬 Narx taklif qilaman", `offer:price:${orderId}`);
}

export function extendOrderKeyboard(orderId: number) {
  return new InlineKeyboard()
    .text("🔄 1 soatga uzaytirish", `order:extend:${orderId}`)
    .text("Yopsin", `order:dismiss:${orderId}`);
}
