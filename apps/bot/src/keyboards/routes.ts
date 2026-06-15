import { InlineKeyboard } from "grammy";
import type { Location } from "@taxi/db";

export function locationsKeyboard(locations: Location[], prefix: string, selected?: number[]) {
  const kb = new InlineKeyboard();
  let row: { text: string; callback_data: string }[] = [];

  for (const loc of locations) {
    const isSelected = selected?.includes(loc.id);
    row.push({
      text: isSelected ? `✅ ${loc.name}` : loc.name,
      callback_data: `${prefix}:${loc.id}`,
    });
    if (row.length === 2) {
      kb.row(...row.map((b) => ({ text: b.text, callback_data: b.callback_data })));
      row = [];
    }
  }
  if (row.length) {
    kb.row(...row.map((b) => ({ text: b.text, callback_data: b.callback_data })));
  }
  return kb;
}
