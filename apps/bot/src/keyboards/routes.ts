import { InlineKeyboard } from "grammy";
import type { City } from "@taxi/db";

export function citiesKeyboard(cities: City[], prefix: string, selected?: number[]) {
  const kb = new InlineKeyboard();
  let row: { text: string; callback_data: string }[] = [];

  for (const city of cities) {
    const isSelected = selected?.includes(city.id);
    row.push({
      text: isSelected ? `✅ ${city.name}` : city.name,
      callback_data: `${prefix}:${city.id}`,
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
