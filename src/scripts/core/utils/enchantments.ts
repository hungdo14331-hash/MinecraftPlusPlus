import { ItemComponentTypes, type ItemStack } from "@minecraft/server";
import { log } from "./logger";

/** Tra ve level enchant tren item; chap nhan ca id co/khong co namespace minecraft:. */
export function getEnchantLevel(item: ItemStack | undefined, enchantId: string): number {
  if (!item) return 0;
  const expectedId = enchantId.replace(/^minecraft:/, "");

  try {
    const component = item.getComponent(ItemComponentTypes.Enchantable);
    if (!component) return 0;

    for (const enchantment of component.getEnchantments()) {
      const actualId = enchantment.type?.id?.replace(/^minecraft:/, "");
      if (actualId === expectedId) return enchantment.level;
    }
  } catch (error) {
    log.debug("getEnchantLevel loi (co the API khac phien ban):", error);
  }

  return 0;
}

export function hasEnchantment(item: ItemStack | undefined, enchantId: string): boolean {
  return getEnchantLevel(item, enchantId) > 0;
}
