import { system, type Entity } from "@minecraft/server";
import { resolveAttackSpeedRatio } from "../../core/math/damage_math";

const lastAttackTick = new Map<string, number>();

export function resolveAttackSpeed(
  attacker: Entity,
  requiredTicks: number | undefined
): { ratio: number; canTrigger: boolean } {
  if (!requiredTicks || requiredTicks <= 0) {
    return { ratio: 1, canTrigger: true };
  }
  const now = system.currentTick;
  const last = lastAttackTick.get(attacker.id) ?? -Infinity;
  const elapsed = now - last;
  lastAttackTick.set(attacker.id, now);
  return resolveAttackSpeedRatio(elapsed, requiredTicks);
}
