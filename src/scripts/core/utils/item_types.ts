import type { ItemStack } from "@minecraft/server";

const CUSTOM_SWORDS=new Set(["mcpp:conqueror_greatsword","mcpp:chronoblade","mcpp:shadow_dagger"]);
export function isSwordItem(item:ItemStack|undefined):boolean{
  return !!item&&(item.typeId.endsWith("_sword")||CUSTOM_SWORDS.has(item.typeId));
}

export function matchesItemSuffix(itemTypeId:string,suffix:string):boolean{
  return itemTypeId.endsWith(suffix)||(suffix==="_sword"&&CUSTOM_SWORDS.has(itemTypeId));
}
