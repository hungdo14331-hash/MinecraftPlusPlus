import type { Entity, Player } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { readMainhand } from "../../core/api/inventory_adapter";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";
import { TaskQueue } from "../../core/scheduler/task_queue";
import { resolveWeaponDefinition } from "../weapons/weapon_lookup";
import { toVanilla } from "../health/health_scaler";
import { isSwordItem } from "../../core/utils/item_types";

const PIERCING_PERCENT_PER_LEVEL = 0.05;
const SWORD_DAMAGE_VANILLA: Record<string, number> = {
  "minecraft:wooden_sword": 4,
  "minecraft:golden_sword": 4,
  "minecraft:stone_sword": 5,
  "minecraft:iron_sword": 6,
  "minecraft:diamond_sword": 7,
  "minecraft:netherite_sword": 8,
};

export function initTrueDamageService(): void {
  EventBus.on(Events.Combat.Hurt, (ev: any) => {
    try {
      handlePiercing(ev);
    } catch (e) {
      log.error("TrueDamageService loi:", e);
    }
  });
}

function handlePiercing(ev: any): void {
  if (ev.damageSource?.cause !== "entityAttack" || Number(ev.damage) <= 0) return;
  const attackerEntity = ev.damageSource?.damagingEntity;
  if (attackerEntity?.typeId !== "minecraft:player") return;
  const attacker = attackerEntity as Player;
  const weapon = readMainhand(attacker);
  if (!isSwordItem(weapon)) return;

  const level = getCustomEnchantLevel(weapon, "mcpp:piercing");
  if (level <= 0) return;
  const weaponDefinition = resolveWeaponDefinition(weapon);
  const baseDamageVanilla = weaponDefinition?.stats.attackDamageMcpp !== undefined
    ? toVanilla(weaponDefinition.stats.attackDamageMcpp)
    : SWORD_DAMAGE_VANILLA[weapon.typeId];
  if (!baseDamageVanilla) return;

  const trueDamageVanilla = baseDamageVanilla * level * PIERCING_PERCENT_PER_LEVEL;
  const target = ev.hurtEntity as Entity;
  TaskQueue.defer(() => applyTrueDamage(target, attacker, trueDamageVanilla));
}

/** Damage cause override bo qua giap; damagingEntity giu kill attribution cho attacker. */
export function applyTrueDamage(target: Entity, attacker: Entity, damageVanilla: number): boolean {
  if (!target?.isValid || !attacker?.isValid || !Number.isFinite(damageVanilla) || damageVanilla <= 0) return false;
  try {
    return target.applyDamage(damageVanilla, {
      cause: "override" as any,
      damagingEntity: attacker,
    });
  } catch (e) {
    log.debug("True Damage applyDamage loi:", e);
    return false;
  }
}
