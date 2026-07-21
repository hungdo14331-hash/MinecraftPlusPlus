import { EntityComponentTypes, EquipmentSlot, Player, ItemStack } from "@minecraft/server";

export function readMainhand(player: Player): ItemStack | undefined {
  const eq = player.getComponent(EntityComponentTypes.Equippable);
  return eq?.getEquipment(EquipmentSlot.Mainhand);
}

export function writeMainhand(player: Player, item: ItemStack): boolean {
  const eq = player.getComponent(EntityComponentTypes.Equippable);
  if (!eq) return false;
  eq.setEquipment(EquipmentSlot.Mainhand, item);
  return true;
}
