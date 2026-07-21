import type { Player } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { log } from "../../core/utils/logger";
import { masteryBonus } from "./mastery_modifiers";
import { hasActiveMasteryReward } from "./mastery_reward_service";
import { system, EntityComponentTypes } from "@minecraft/server";

const BYPASS = new Set(["override", "void", "suicide"]);
const immortalCooldown=new Map<string,number>();
export function initMasteryDefenseService(): void {
  EventBus.on(Events.Combat.HurtBefore, (ev: any) => {
    try {
      if (ev.hurtEntity?.typeId !== "minecraft:player" || BYPASS.has(ev.damageSource?.cause)) return;
      const player=ev.hurtEntity as Player;
      const defense = masteryBonus(player, "defense")+(hasActiveMasteryReward(player,"defense")?0.1:0);
      if (defense > 0) ev.damage *= 1 - defense;
      const health=player.getComponent(EntityComponentTypes.Health);
      const ready=(immortalCooldown.get(player.id)??-99999)<=system.currentTick;
      if(health&&ready&&hasActiveMasteryReward(player,"vitality")&&health.currentValue-ev.damage<=health.effectiveMax*0.2){
        ev.damage*=0.6;immortalCooldown.set(player.id,system.currentTick+1800);
        player.sendMessage("§c❤ Trái Tim Bất Diệt đã giảm 40% sát thương! §7(Hồi 90 giây)");
      }
    } catch (e) { log.error("MasteryDefenseService loi:", e); }
  }, -50);
}
