import { EntityDamageCause,Player,system,type Entity } from "@minecraft/server";
import { readMainhand } from "../../core/api/inventory_adapter";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { TaskQueue } from "../../core/scheduler/task_queue";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";
import { resolveWeaponDefinition } from "../weapons/weapon_lookup";
import { toVanilla } from "../health/health_scaler";
import { masteryBonus } from "../mastery/mastery_modifiers";
import { hasActiveMasteryReward } from "../mastery/mastery_reward_service";
import { resolveCritical } from "./critical_service";
import { applySlothToRequiredTicks,getLastAcceptedHitTick,markAttackAccepted } from "./attack_speed_service";
import { clearFastHit,markFastHit } from "./fast_hit_guard";
import { pushHudNotification } from "../targeting/hud_notification_service";
import { consumeChronoCharge,hasChronoCharge } from "../weapons/active_weapon_skill_service";
import { applyTrueDamage } from "./true_damage_service";

const FAST_WEAPONS=new Set(["mcpp:chronoblade","mcpp:shadow_dagger"]);

export function initFastWeaponService():void{
  EventBus.on(Events.Combat.Hit,(ev:any)=>{try{handleContact(ev);}catch(e){log.error("FastWeaponService loi:",e);}});
}

function handleContact(ev:any):void{
  const player=ev.damagingEntity as Player;const target=ev.hitEntity as Entity;
  if(player?.typeId!=="minecraft:player"||!target?.isValid)return;
  const weapon=readMainhand(player);if(!weapon||!FAST_WEAPONS.has(weapon.typeId))return;
  if(weapon.typeId==="mcpp:chronoblade"&&!hasActiveMasteryReward(player,"dexterity"))return;
  const definition=resolveWeaponDefinition(weapon);const baseTicks=definition?.stats.attackSpeed;if(!definition||baseTicks===undefined)return;
  const chronoBoost=weapon.typeId==="mcpp:chronoblade"&&hasChronoCharge(player);
  let required=applySlothToRequiredTicks(baseTicks,getCustomEnchantLevel(weapon,"mcpp:sloth"),masteryBonus(player,"dexterity"));
  // Thời Giới chỉ rút ngắn nhịp; không bao giờ làm chậm một build Sloth/Khéo Léo đã nhanh hơn.
  if(chronoBoost)required=Math.min(required,6);
  const now=system.currentTick;if(now-getLastAcceptedHitTick(player)<required)return;
  markAttackAccepted(player);
  const criticalLevel=getCustomEnchantLevel(weapon,"mcpp:critical");
  const chance=(definition.stats.criticalChance??0)+(criticalLevel>0?0.05+criticalLevel*0.05:0)+masteryBonus(player,"precision")+(hasActiveMasteryReward(player,"precision")?0.05:0);
  const crit=resolveCritical(player,Math.min(0.6,chance),definition.stats.criticalDamage);
  const baseDamage=toVanilla(definition.stats.attackDamageMcpp??0);
  const damage=baseDamage*crit.multiplier*(1+masteryBonus(player,"strength"));
  TaskQueue.defer(()=>applyFastHit(player,target,weapon.typeId,damage,required,crit.critical,chronoBoost));
}

function applyFastHit(player:Player,target:Entity,weaponId:string,damage:number,required:number,critical:boolean,chronoBoost:boolean):void{
  if(!player.isValid||!target.isValid||readMainhand(player)?.typeId!==weaponId||damage<=0)return;
  markFastHit(player,target);
  try{
    const applied=target.applyDamage(damage,{cause:EntityDamageCause.entityAttack,damagingEntity:player});
    if(applied){
      const empowered=chronoBoost&&consumeChronoCharge(player);
      if(empowered)applyTrueDamage(target,player,1);
      pushHudNotification(player,`${empowered?"§d⌛ Nhịp Thời Gian §8• ":""}§d⚡ Đòn nhanh ${required} tick${critical?" §6— Chí mạng!":""}`,25,critical?2:1);
    }
  }catch(e){log.debug("Fast weapon applyDamage loi:",e);}finally{clearFastHit(player,target);}
}
