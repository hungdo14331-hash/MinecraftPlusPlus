import type { ItemStack } from "@minecraft/server";

const CUSTOM_SWORDS=new Set([
  "mcpp:conqueror_greatsword","mcpp:chronoblade","mcpp:arcane_spear","mcpp:frost_hammer","mcpp:shadow_dagger",
  "mcpp:runeblade","mcpp:titan_maul","mcpp:gale_glaive","mcpp:ember_cleaver","mcpp:void_reaper",
]);
export function isSwordItem(item:ItemStack|undefined):boolean{
  return !!item&&(item.typeId.endsWith("_sword")||CUSTOM_SWORDS.has(item.typeId));
}

export function matchesItemSuffix(itemTypeId:string,suffix:string):boolean{
  return itemTypeId.endsWith(suffix)||(suffix==="_sword"&&CUSTOM_SWORDS.has(itemTypeId));
}
