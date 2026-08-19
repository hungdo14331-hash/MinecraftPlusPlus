import type { Player } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { readMainhand } from "../../core/api/inventory_adapter";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";
import { toMcpp } from "../health/health_scaler";
import { applySelfHealMcpp } from "../health/healing_service";
import { TaskQueue } from "../../core/scheduler/task_queue";
import { isSwordItem } from "../../core/utils/item_types";
import { pushHudNotification } from "../targeting/hud_notification_service";

const LIFE_STEAL_PER_VAMPIRE_LEVEL = 0.05;
const PVP_LIFE_STEAL_MULTIPLIER = 0.6;
const SCOPE_CAUSES = new Set(["entityAttack", "projectile"]);

export function initLifeStealService(): void {
  EventBus.on(Events.Combat.Hurt, (ev: any) => {
    try {
      handleHurtAfter(ev);
    } catch (e) {
      log.error("LifeStealService loi:", e);
    }
  });
}

function handleHurtAfter(ev: any): void {
  if (!SCOPE_CAUSES.has(ev.damageSource?.cause)) return;

  const attackerEntity = ev.damageSource?.damagingEntity;
  if (attackerEntity?.typeId !== "minecraft:player") return;
  const attacker = attackerEntity as Player;

  const weapon = readMainhand(attacker);
  if (!isSwordItem(weapon)) return;

  const vampireLevel = getCustomEnchantLevel(weapon, "mcpp:vampire");
  if (vampireLevel <= 0) return;

  const damageVanilla = Number(ev.damage);
  if (!Number.isFinite(damageVanilla) || damageVanilla <= 0) return;

  const target = ev.hurtEntity;
  const isPvp = target?.typeId === "minecraft:player" && target.id !== attacker.id;
  const pvpMultiplier = isPvp ? PVP_LIFE_STEAL_MULTIPLIER : 1;
  const healMcpp =
    toMcpp(damageVanilla) * vampireLevel * LIFE_STEAL_PER_VAMPIRE_LEVEL * pvpMultiplier;

  // Hoan sang tick ke tiep de viec sua Health khong nam trong callback entityHurt.
  TaskQueue.defer(() => {
    const healedMcpp = applySelfHealMcpp(attacker, healMcpp);
    if (healedMcpp <= 0) return;

    // Phan hoi truc tiep de nguoi choi biet Life Steal da kich hoat.
    pushHudNotification(attacker,`§c❤ Life Steal +${healedMcpp.toFixed(1)} HP`,30,2);
  });
}
