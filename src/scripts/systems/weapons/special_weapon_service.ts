import { EntityComponentTypes, EntityDamageCause, system, type Entity, type Player } from "@minecraft/server";
import { readMainhand } from "../../core/api/inventory_adapter";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { log } from "../../core/utils/logger";
import { TaskQueue } from "../../core/scheduler/task_queue";
import { applyTrueDamage } from "../combat/true_damage_service";
import { applyBonusKnockback } from "../combat/knockback_service";
import { pushHudNotification } from "../targeting/hud_notification_service";
import { consumeRuneMark } from "./active_weapon_skill_service";

const counters=new Map<string,number>();
const cooldowns=new Map<string,number>();

export function initSpecialWeaponService():void{
  EventBus.on(Events.Combat.Hurt,(ev:any)=>{try{handleHurt(ev);}catch(e){log.error("SpecialWeaponService loi:",e);}});
}

function handleHurt(ev:any):void{
  if(ev.damageSource?.cause!=="entityAttack"||Number(ev.damage)<=0)return;
  const player=ev.damageSource?.damagingEntity as Player|undefined;
  const target=ev.hurtEntity as Entity|undefined;
  if(player?.typeId!=="minecraft:player"||!target?.isValid)return;
  const weapon=readMainhand(player);if(!weapon)return;
  TaskQueue.defer(()=>triggerWeapon(player,target,weapon.typeId));
}

function triggerWeapon(player:Player,target:Entity,weaponId:string):void{
  if(!player.isValid||!target.isValid||readMainhand(player)?.typeId!==weaponId)return;
  switch(weaponId){
    case "mcpp:arcane_spear":if(every(player,weaponId,3)){applyTrueDamage(target,player,pvpScale(target,2.5));proc(player,target,"§b✦ Xuyên Kích Arcane","random.orb",1.35);}break;
    case "mcpp:frost_hammer":if(ready(player,weaponId,100)){frostSlam(player,target);proc(player,target,"§3❄ Chấn Động Băng Giá","random.glass",0.7);}break;
    case "mcpp:shadow_dagger":if(every(player,weaponId,4)){applyTrueDamage(target,player,pvpScale(target,2));player.addEffect("speed",30,{amplifier:1,showParticles:false});proc(player,target,"§5◆ Bước Bóng","mob.endermen.portal",1.35);}break;
    case "mcpp:runeblade":if(every(player,weaponId,3)){const empowered=consumeRuneMark(player,target);applyTrueDamage(target,player,pvpScale(target,empowered?5:2));proc(player,target,empowered?"§9ᚱ Đại Ấn Cộng Hưởng":"§bᚱ Dội Âm Cổ Ngữ","random.orb",empowered?0.65:0.85);}break;
    case "mcpp:titan_maul":if(ready(player,weaponId,120)){seismicImpact(player,target);proc(player,target,"§6◆ Địa Chấn Titan","random.explode",0.65);}break;
    case "mcpp:gale_glaive":windstep(player,target,weaponId);break;
    case "mcpp:ember_cleaver":hellfire(player,target,weaponId);break;
    case "mcpp:void_reaper":soulHarvest(player,target,weaponId);break;
  }
}

function every(player:Player,weaponId:string,count:number):boolean{
  const key=`${player.id}:${weaponId}`;const next=(counters.get(key)??0)+1;
  if(next>=count){counters.set(key,0);return true;}counters.set(key,next);return false;
}
function ready(player:Player,weaponId:string,ticks:number):boolean{
  const key=`${player.id}:${weaponId}`;const now=system.currentTick;if(now<(cooldowns.get(key)??0))return false;cooldowns.set(key,now+ticks);return true;
}
function pvpScale(target:Entity,damage:number):number{return target.typeId==="minecraft:player"?damage*0.5:damage;}
function isSecondaryTarget(entity:Entity,player:Player,primary:Entity):boolean{
  return entity.isValid&&entity.id!==player.id&&entity.id!==primary.id&&entity.typeId!=="minecraft:player"&&entity.typeId!=="minecraft:item"&&entity.typeId!=="minecraft:xp_orb"&&!entity.typeId.startsWith("mcpp:arcane_");
}
function proc(player:Player,target:Entity,message:string,sound="random.orb",pitch=1):void{
  pushHudNotification(player,message,35,3);
  try{player.dimension.spawnParticle("minecraft:critical_hit_emitter",{x:target.location.x,y:target.location.y+0.8,z:target.location.z});}catch{}
  try{player.playSound(sound,{volume:0.55,pitch});}catch{}
}
function frostSlam(player:Player,primary:Entity):void{
  for(const entity of player.dimension.getEntities({location:primary.location,maxDistance:3})){
    if(entity.id!==primary.id&&!isSecondaryTarget(entity,player,primary))continue;
    try{entity.addEffect("slowness",40,{amplifier:1,showParticles:false});if(entity.id!==primary.id)entity.applyDamage(2,{cause:EntityDamageCause.magic,damagingEntity:player});}catch{}
  }
}
function seismicImpact(player:Player,primary:Entity):void{
  for(const entity of player.dimension.getEntities({location:primary.location,maxDistance:3.5})){
    if(!isSecondaryTarget(entity,player,primary))continue;
    try{entity.applyDamage(3,{cause:EntityDamageCause.entityExplosion,damagingEntity:player});applyBonusKnockback(player,entity,1.2);}catch{}
  }
  try{player.dimension.spawnParticle("minecraft:huge_explosion_emitter",primary.location);}catch{}
}
function windstep(player:Player,target:Entity,weaponId:string):void{
  try{player.addEffect("speed",35,{amplifier:1,showParticles:false});}catch{}
  if(every(player,weaponId,4)){applyBonusKnockback(player,target,1.3);proc(player,target,"§b➤ Phong Bộ","random.orb",1.65);}
}
function hellfire(player:Player,target:Entity,weaponId:string):void{
  try{(target as any).setOnFire?.(4,true);}catch{}
  if(!ready(player,weaponId,80))return;
  for(const entity of player.dimension.getEntities({location:target.location,maxDistance:2.75})){
    if(!isSecondaryTarget(entity,player,target))continue;
    try{entity.applyDamage(2,{cause:EntityDamageCause.fire,damagingEntity:player});(entity as any).setOnFire?.(3,true);}catch{}
  }
  proc(player,target,"§c🔥 Hỏa Ngục","mob.blaze.shoot",0.8);
}
function soulHarvest(player:Player,target:Entity,weaponId:string):void{
  try{
    const health=target.getComponent(EntityComponentTypes.Health);if(!health||health.currentValue>health.effectiveMax*0.3)return;
    if(!ready(player,weaponId,40))return;
    if(!applyTrueDamage(target,player,pvpScale(target,4)))return;
    const playerHealth=player.getComponent(EntityComponentTypes.Health);playerHealth?.setCurrentValue(Math.min(playerHealth.effectiveMax,playerHealth.currentValue+2));
    proc(player,target,"§5☽ Thu Hoạch Linh Hồn","mob.endermen.portal",0.65);
  }catch{}
}
