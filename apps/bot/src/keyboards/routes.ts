import { InlineKeyboard } from "grammy";
import type { District } from "@taxi/db";

export function districtsKeyboard(districts: District[], prefix: string, selected?: number[]) {
  const kb = new InlineKeyboard();
  let row: { text: string; callback_data: string }[] = [];

  for (const district of districts) {
    const isSelected = selected?.includes(district.id);
    row.push({
      text: isSelected ? `✅ ${district.name}` : district.name,
      callback_data: `${prefix}:${district.id}`,
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
