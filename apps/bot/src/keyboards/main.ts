import { Keyboard } from "grammy";

export const driverKeyboard = new Keyboard()
  .text("🗺 Marshrutlarim").text("🚗 Hozir yo'ldaman")
  .row()
  .text("📋 Takliflar").text("📜 Tarix")
  .row()
  .text("👤 Profilim")
  .resized();

export const passengerKeyboard = new Keyboard()
  .text("📦 Buyurtma berish")
  .row()
  .text("📋 Buyurtmalarim")
  .row()
  .text("👤 Profilim")
  .resized();

export const mainKeyboard = driverKeyboard;
