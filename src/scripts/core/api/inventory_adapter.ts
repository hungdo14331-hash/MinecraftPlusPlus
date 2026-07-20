import { EntityComponentTypes, EquipmentSlot, Player, ItemStack } from "@minecraft/server";

export function readMainhand(player: Player): ItemStack | undefined {
  const eq = player.getComponent(EntityComponentTypes.Equippable);
  return eq?.getEquipment(EquipmentSlot.Mainhand);
}
