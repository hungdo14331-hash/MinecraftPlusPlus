import type { ItemStack } from "@minecraft/server";
import { EnchantRegistry } from "../registry/registries";
import type { EnchantDefinition } from "../types";
import { matchesItemSuffix } from "./item_types";

const LORE_COLOR = "§r§5";
const ROMAN = ["", "I", "II", "III", "IV", "V"] as const;

function stripFormatting(value: string): string {
  return value.replace(/§[0-9a-fk-or]/gi, "").trim();
}

function levelFromLoreLine(line: string, displayName: string, maxLevel: number): number {
  const plain = stripFormatting(line).replace(/\s+/g, " ");
  const prefix = `${displayName} `.toLowerCase();
  if (!plain.toLowerCase().startsWith(prefix)) return 0;
  const encoded = plain.slice(prefix.length).trim().toUpperCase();
  const numeric = Number(encoded);
  const level = Number.isInteger(numeric) ? numeric : ROMAN.indexOf(encoded as (typeof ROMAN)[number]);
  return level >= 1 && level <= maxLevel ? level : 0;
}

function isEnchantLoreLine(line: string, displayName: string): boolean {
  const plain = stripFormatting(line).replace(/\s+/g, " ").toLowerCase();
  return plain.startsWith(`${displayName.toLowerCase()} `);
}

function lorePrefix(displayName: string): string {
  return `${LORE_COLOR}${displayName} `;
}

export function getCustomEnchantLevel(item: ItemStack | undefined, enchantId: string): number {
  if (!item) return 0;
  const definition = EnchantRegistry.get(enchantId);
  if (!definition) return 0;

  for (const line of item.getLore()) {
    const level = levelFromLoreLine(line, definition.displayName, definition.maxLevel);
    if (level > 0) return level;
  }

  {
    const base = `${enchantId}_book_`;
    if (item.typeId.startsWith(base)) {
      const encoded = Number(item.typeId.slice(base.length));
      return Number.isInteger(encoded) && encoded >= 1 && encoded <= definition.maxLevel ? encoded : 0;
    }
    return 0;
  }
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
  const lore = item.getLore().filter((entry) => !isEnchantLoreLine(entry, definition.displayName));
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
  const lore = book.getLore().filter((entry) => !isEnchantLoreLine(entry, definition.displayName));
  lore.push(`${prefix}${ROMAN[level]}`);
  book.setLore(lore);
}
