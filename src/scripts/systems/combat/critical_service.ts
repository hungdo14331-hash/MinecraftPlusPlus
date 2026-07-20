import type { Entity } from "@minecraft/server";
import { resolveCriticalMultiplier } from "../../core/math/damage_math";

export function rollMcppCrit(criticalChance: number | undefined): boolean {
  if (!criticalChance || criticalChance <= 0) return false;
  return Math.random() < criticalChance;
}

export function detectVanillaCrit(attacker: Entity): boolean {
  try {
    const a = attacker as any;
    return a.isFalling && !a.isOnGround && !a.isClimbing && !a.isInWater && !a.isSprinting;
  } catch {
    return false;
  }
}

export function resolveCritical(
  attacker: Entity,
  criticalChance: number | undefined,
  criticalMultiplier: number | undefined
): { multiplier: number; critical: boolean } {
  const mcppCritRolled = rollMcppCrit(criticalChance);
  const vanillaCritDetected = detectVanillaCrit(attacker);
  return resolveCriticalMultiplier(mcppCritRolled, vanillaCritDetected, criticalMultiplier);
}
