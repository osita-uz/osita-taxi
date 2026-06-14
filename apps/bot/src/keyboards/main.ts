import { Keyboard } from "grammy";

export const mainKeyboard = new Keyboard()
  .text("🗺 Marshrutlarim").text("🚗 Hozir yo'ldaman")
  .row()
  .text("📋 Takliflar").text("📜 Tarix")
  .row()
  .text("👤 Profilim")
  .resized();
