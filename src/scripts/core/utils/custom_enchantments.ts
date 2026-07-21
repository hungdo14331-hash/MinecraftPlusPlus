import type { ItemStack } from "@minecraft/server";
import { EnchantRegistry } from "../registry/registries";
import type { EnchantDefinition } from "../types";
import { matchesItemSuffix } from "./item_types";

const LORE_COLOR = "§r§5";
const ROMAN = ["", "I", "II", "III", "IV", "V"] as const;

function lorePrefix(displayName: string): string {
  return `${LORE_COLOR}${displayName} `;
}

export function getCustomEnchantLevel(item: ItemStack | undefined, enchantId: string): number {
  if (!item) return 0;
  const definition = EnchantRegistry.get(enchantId);
  if (!definition) return 0;

  const prefix = lorePrefix(definition.displayName);
  const line = item.getLore().find((entry) => entry.startsWith(prefix));
  if (!line) {
    const base = `${enchantId}_book_`;
    if (item.typeId.startsWith(base)) {
      const encoded = Number(item.typeId.slice(base.length));
      return Number.isInteger(encoded) && encoded >= 1 && encoded <= definition.maxLevel ? encoded : 0;
    }
    return 0;
  }

  const roman = line.slice(prefix.length);
  const level = ROMAN.indexOf(roman as (typeof ROMAN)[number]);
  return level >= 1 && level <= definition.maxLevel ? level : 0;
}

export function isCustomEnchantBook(item: ItemStack | undefined, enchantId: string): boolean {
  return !!item && (item.typeId === `${enchantId}_book` || item.typeId.startsWith(`${enchantId}_book_`));
}

export function findCustomEnchant(
  item: ItemStack | undefined
): { definition: EnchantDefinition; level: number } | undefined {
  if (!item) return undefined;
  for (const definition of EnchantRegistry.all()) {
    const level = getCustomEnchantLevel(item, definition.id);
    if (level > 0) return { definition, level };
  }
  return undefined;
}

export function setCustomEnchantLevel(item: ItemStack, enchantId: string, level: number): void {
  const definition = EnchantRegistry.get(enchantId);
  if (!definition) throw new Error(`Enchant khong ton tai: ${enchantId}`);
  if (!Number.isInteger(level) || level < 1 || level > definition.maxLevel || !ROMAN[level]) {
    throw new Error(`Cap enchant khong hop le: ${level}`);
  }
  if (
    definition.allowedItemSuffixes?.length &&
    !definition.allowedItemSuffixes.some((suffix) => matchesItemSuffix(item.typeId,suffix))
  ) {
    throw new Error(`${definition.displayName} khong ap dung duoc cho ${item.typeId}`);
  }

  const prefix = lorePrefix(definition.displayName);
  const lore = item.getLore().filter((entry) => !entry.startsWith(prefix));
  lore.push(`${prefix}${ROMAN[level]}`);
  item.setLore(lore);
}

/** Gan cap enchant vao sach custom; bo qua rang buoc loai item vi day la vat mang enchant. */
export function setCustomEnchantBookLevel(book: ItemStack, enchantId: string, level: number): void {
  const definition = EnchantRegistry.get(enchantId);
  if (!definition) throw new Error(`Enchant khong ton tai: ${enchantId}`);
  if (!Number.isInteger(level) || level < 1 || level > definition.maxLevel || !ROMAN[level]) {
    throw new Error(`Cap enchant khong hop le: ${level}`);
  }

  const prefix = lorePrefix(definition.displayName);
  const lore = book.getLore().filter((entry) => !entry.startsWith(prefix));
  lore.push(`${prefix}${ROMAN[level]}`);
  book.setLore(lore);
}
