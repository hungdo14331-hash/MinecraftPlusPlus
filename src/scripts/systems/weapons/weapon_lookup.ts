import type { ItemStack } from "@minecraft/server";
import { WeaponRegistry } from "../../core/registry/registries";
import type { WeaponDefinition } from "../../core/types";

/**
 * SUA (v0.3.2): ban goc goi WeaponRegistry.get(item.typeId), nhung registry luu theo
 * def.id (bat buoc dang "mcpp:xxx" do Registry.register() ep assertValidId). item.typeId
 * la id vanilla (vd "minecraft:iron_sword") nen se KHONG BAO GIO khop khoa "mcpp:xxx" —
 * dieu nay chua lo ra vi WeaponRegistry truoc gio luon rong (register() la stub).
 * Sua: duyet WeaponRegistry.all() va so khop theo itemTypeId.
 */
export function resolveWeaponDefinition(item: ItemStack | undefined): WeaponDefinition | undefined {
  if (!item) return undefined;
  return WeaponRegistry.all().find((w) => w.itemTypeId === item.typeId);
}
