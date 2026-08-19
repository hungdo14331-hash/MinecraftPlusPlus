import { EntityComponentTypes, EquipmentSlot, type ItemStack, type Player } from "@minecraft/server";
import { getAllPlayers } from "../../core/api/world_adapter";
import { ADDON_VERSION } from "../../core/config/constants";
import { TickScheduler } from "../../core/scheduler/tick_scheduler";
import { SPECIAL_WEAPON_BY_ID } from "../../content/weapon_catalog";
import { pushHudNotification } from "../targeting/hud_notification_service";
import { PlayerStore } from "../../core/data/player_store";

const INFO_START="§r§8╔═ §5MINECRAFT++ §8═╗";
const INFO_END="§r§8╚══════════════╝";
const DISCOVERY_KEY="mcpp:weapon_discoveries";
const heldWeapon=new Map<string,string>();
const discoveries=new Map<string,Set<string>>();

export function initWeaponIdentityService():void{
  TickScheduler.every("weapon_identity",10,()=>{
    const active=new Set<string>();
    for(const player of getAllPlayers()){
      active.add(player.id);
      refreshInventoryLore(player);
      announceHeldWeapon(player);
    }
    for(const id of heldWeapon.keys())if(!active.has(id))heldWeapon.delete(id);
    for(const id of discoveries.keys())if(!active.has(id))discoveries.delete(id);
  });
}

function refreshInventoryLore(player:Player):void{
  const container=player.getComponent(EntityComponentTypes.Inventory)?.container;
  if(!container)return;
  const known=discoverySet(player);const found:string[]=[];
  for(let slot=0;slot<container.size;slot++){
    const item=container.getItem(slot);if(!item||!SPECIAL_WEAPON_BY_ID.has(item.typeId))continue;
    if(applyIdentityLore(item))container.setItem(slot,item);
    if(!known.has(item.typeId)){known.add(item.typeId);found.push(item.typeId);}
  }
  if(found.length>0){
    PlayerStore.setJson(player,DISCOVERY_KEY,[...known]);
    if(found.length===1){
      const weapon=SPECIAL_WEAPON_BY_ID.get(found[0]);
      if(weapon)pushHudNotification(player,`${weapon.rarityColor}✦ ĐÃ KHÁM PHÁ: ${weapon.name}`,60,3);
    }else pushHudNotification(player,`§d✦ Đã khám phá ${found.length} vũ khí đặc biệt`,60,3);
    try{player.playSound("random.levelup",{volume:0.7,pitch:1.15});}catch{}
  }
}

function discoverySet(player:Player):Set<string>{
  let value=discoveries.get(player.id);
  if(!value){value=new Set(PlayerStore.getJson<string[]>(player,DISCOVERY_KEY)??[]);discoveries.set(player.id,value);}
  return value;
}

export function getDiscoveredWeaponIds(player:Player):ReadonlySet<string>{return discoverySet(player);}

function applyIdentityLore(item:ItemStack):boolean{
  const weapon=SPECIAL_WEAPON_BY_ID.get(item.typeId);if(!weapon)return false;
  const kept:string[]=[];let inside=false;
  for(const line of item.getLore()){
    if(line===INFO_START){inside=true;continue;}
    if(inside&&line===INFO_END){inside=false;continue;}
    if(!inside)kept.push(line);
  }
  const identity=[
    INFO_START,
    `§r§8[${weapon.rarityColor}${weapon.rarity}§8] §f${weapon.weaponClass}`,
    `§r§d✦ Nội tại: ${weapon.ability} §8• §7${weapon.trigger}`,
    `§r§7${weapon.description}`,
    `§r§6◆ Chủ động: ${weapon.activeSkill} §8• §7${weapon.activeTrigger}`,
    `§r§7${weapon.activeDescription}`,
    `§r§8${weapon.combatInfo}`,
    `§r§8Nguồn: §7${weapon.source}`,
    `§r§8Minecraft++ v${ADDON_VERSION}`,
    INFO_END,
  ];
  const next=[...kept,...identity];const current=item.getLore();
  if(current.length===next.length&&current.every((line,index)=>line===next[index]))return false;
  item.setLore(next);return true;
}

function announceHeldWeapon(player:Player):void{
  const item=player.getComponent(EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Mainhand);
  const current=item?.typeId??"";const previous=heldWeapon.get(player.id)??"";
  if(current===previous)return;heldWeapon.set(player.id,current);
  const weapon=SPECIAL_WEAPON_BY_ID.get(current);if(!weapon)return;
  pushHudNotification(player,`${weapon.rarityColor}⚔ ${weapon.name} §8• §d${weapon.ability}`,45,1);
}
