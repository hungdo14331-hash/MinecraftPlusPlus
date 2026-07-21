import { EntityComponentTypes, EquipmentSlot, ItemStack, system, type Player, type Vector3 } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { getEnchantLevel } from "../../core/utils/enchantments";
import { log } from "../../core/utils/logger";

const SAFE_EXACT = new Set([
  "minecraft:stone","minecraft:cobblestone","minecraft:deepslate","minecraft:cobbled_deepslate",
  "minecraft:netherrack","minecraft:end_stone","minecraft:tuff","minecraft:calcite","minecraft:dripstone_block",
  "minecraft:granite","minecraft:diorite","minecraft:andesite","minecraft:basalt","minecraft:blackstone",
  "minecraft:sandstone","minecraft:red_sandstone","minecraft:obsidian","minecraft:crying_obsidian",
]);

export function initEarthshatterService():void {
  EventBus.on(Events.World.BreakBlock,(ev:any)=>{try{handleBreak(ev);}catch(e){log.error("Earthshatter loi:",e);}});
}

function isMineable(typeId:string):boolean {
  return SAFE_EXACT.has(typeId)||typeId.endsWith("_ore")||typeId.includes("ore_");
}

function offsetsForView(view:Vector3):Vector3[] {
  const ax=Math.abs(view.x),ay=Math.abs(view.y),az=Math.abs(view.z);const out:Vector3[]=[];
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
    if(a===0&&b===0)continue;
    if(ay>=ax&&ay>=az)out.push({x:a,y:0,z:b});
    else if(ax>=az)out.push({x:0,y:a,z:b});
    else out.push({x:a,y:b,z:0});
  }
  return out;
}

function handleBreak(ev:any):void {
  const player=ev.player as Player;if(!player?.isSneaking)return;
  const tool=ev.itemStackBeforeBreak as ItemStack|undefined;
  const level=getCustomEnchantLevel(tool,"mcpp:earthshatter");
  if(level<=0||!tool?.typeId.endsWith("_pickaxe"))return;
  const silkTouch=getEnchantLevel(tool,"silk_touch")>0;
  const origin=ev.block.location as Vector3;const dimension=ev.dimension;
  let broken=0;
  for(const off of offsetsForView(player.getViewDirection())){
    const loc={x:origin.x+off.x,y:origin.y+off.y,z:origin.z+off.z};
    try{
      const block=dimension.getBlock(loc);if(!block||!isMineable(block.typeId))continue;
      if((block as any).getComponent?.("minecraft:inventory"))continue;
      if(silkTouch){
        const dropId=block.typeId;
        block.setType("minecraft:air");
        dimension.spawnItem(new ItemStack(dropId,1),{x:loc.x+0.5,y:loc.y+0.5,z:loc.z+0.5});
      }else{
        dimension.runCommand(`setblock ${loc.x} ${loc.y} ${loc.z} air destroy`);
      }
      broken++;
    }catch{/* Một block lỗi không được làm hỏng cả vùng đào. */}
  }
  if(broken<=0)return;
  damageHeldPickaxe(player,tool.typeId,broken,level);
  if(level>=2)system.runTimeout(()=>pullNearbyItems(player,origin),2);
  try{player.playSound("dig.stone",{volume:0.7,pitch:0.65});}catch{}
}

function damageHeldPickaxe(player:Player,typeId:string,blocks:number,level:number):void {
  const eq=player.getComponent(EntityComponentTypes.Equippable);const held=eq?.getEquipment(EquipmentSlot.Mainhand);
  if(!eq||held?.typeId!==typeId)return;
  const durability=held.getComponent("minecraft:durability") as any;if(!durability)return;
  let extra=0;for(let i=0;i<blocks;i++)if(level<3||Math.random()>=0.15)extra++;
  if(extra<=0)return;
  durability.damage=Math.min(durability.maxDurability,durability.damage+extra);
  if(durability.damage>=durability.maxDurability){eq.setEquipment(EquipmentSlot.Mainhand,undefined);try{player.playSound("random.break");}catch{}}
  else eq.setEquipment(EquipmentSlot.Mainhand,held);
}

function pullNearbyItems(player:Player,origin:Vector3):void {
  if(!player.isValid)return;
  for(const entity of player.dimension.getEntities({type:"minecraft:item",location:origin,maxDistance:5})){
    try{entity.teleport({x:player.location.x,y:player.location.y+0.5,z:player.location.z});}catch{}
  }
}
