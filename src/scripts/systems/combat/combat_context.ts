import type { Entity, ItemStack } from "@minecraft/server";
import type { CombatContext } from "../../core/types";
import { InternalEffectGuard } from "./internal_effect_guard";

export function createCombatContext(
  attacker: Entity,
  target: Entity,
  weapon: ItemStack | undefined,
  damageSource: string,
  baseDamageMcpp: number
): CombatContext {
  return {
    attacker,
    target,
    weapon,
    damageSource,
    baseDamageMcpp,
    bonusDamageMcpp: 0,
    finalDamageMcpp: baseDamageMcpp,
    actualDamageMcpp: 0,
    critical: false,
    criticalMultiplier: 1,
    armor: 0,
    armorPenetration: 0,
    damageType: damageSource,
    lifeStealPercent: 0,
    lifeStealFlatMcpp: 0,
    healingReduction: 0,
    attackSpeedRatio: 1,
    canTriggerOnHit: true,
    isPvp:
      target.typeId === "minecraft:player" && attacker.typeId === "minecraft:player" && attacker.id !== target.id,
    tags: new Set(),
    flags: {},
    triggeredAbilities: [],
    triggeredEnchantments: [],
    internalEffect: {
      sourceId: "mcpp:combat_core",
      effectId: "attack",
      rootEventId: InternalEffectGuard.newRootEventId(),
    },
  };
}
