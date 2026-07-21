import { EntityDamageCause, system, type Entity, type Player } from "@minecraft/server";
import { readMainhand } from "../../core/api/inventory_adapter";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { log } from "../../core/utils/logger";
import { hasActiveMasteryReward } from "./mastery_reward_service";
import { TaskQueue } from "../../core/scheduler/task_queue";
import { clearFastHit,markFastHit } from "../combat/fast_hit_guard";

const WEAPON_ID="mcpp:conqueror_greatsword";
const lastCleaveTick=new Map<string,number>();

export function initLegendaryWeaponService():void {
  EventBus.on(Events.Combat.ValidHit,(ev:any)=>{try{handleHit(ev);}catch(e){log.error("Conqueror Greatsword loi:",e);}});
}

function handleHit(ev:any):void {
  if(Number(ev.damage)<=0)return;
  const player=ev.attacker as Player;const primary=ev.target as Entity;
  if(player?.typeId!=="minecraft:player"||!primary?.isValid)return;
  if(readMainhand(player)?.typeId!==WEAPON_ID||!hasActiveMasteryReward(player,"strength"))return;
  const now=system.currentTick;if((lastCleaveTick.get(player.id)??-999)+20>now)return;
  lastCleaveTick.set(player.id,now);
  TaskQueue.defer(()=>executeCleave(player,primary));
}

function executeCleave(player:Player,primary:Entity):void{
  if(!player.isValid||!primary.isValid||!hasActiveMasteryReward(player,"strength")||readMainhand(player)?.typeId!==WEAPON_ID)return;
  let hitCount=0;
  for(const target of player.dimension.getEntities({location:primary.location,maxDistance:3})){
    if(target.id===player.id||target.id===primary.id||target.typeId==="minecraft:item"||target.typeId==="minecraft:xp_orb"||target.typeId==="minecraft:player")continue;
    markFastHit(player,target);
    try{if(target.applyDamage(4,{cause:EntityDamageCause.entityAttack,damagingEntity:player})){hitCount++;}}catch{}finally{clearFastHit(player,target);}
  }
  player.onScreenDisplay.setActionBar(`§6⚔ Chém Lan: §f${hitCount} mục tiêu phụ`);
  try{player.dimension.spawnParticle("minecraft:critical_hit_emitter",primary.location);}catch{}
  try{player.playSound("mob.warden.sonic_boom",{volume:0.35,pitch:1.5});}catch{}
}
