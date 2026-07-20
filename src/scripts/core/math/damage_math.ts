import { CombatConstants } from "../config/combat_constants";

export function computeArmorPenetrationBonus(
  rawDamageMcpp: number,
  postArmorDamageMcpp: number,
  penetrationPercent: number
): number {
  const cappedPct = Math.max(0, Math.min(penetrationPercent, CombatConstants.ARMOR_PENETRATION_CAP));
  const mitigated = Math.max(0, rawDamageMcpp - postArmorDamageMcpp);
  const bonus = mitigated * cappedPct;
  return Math.min(bonus, Math.max(0, rawDamageMcpp - postArmorDamageMcpp));
}

export function resolveCriticalMultiplier(
  mcppCritRolled: boolean,
  vanillaCritDetected: boolean,
  mcppMultiplier: number = CombatConstants.DEFAULT_CRIT_MULTIPLIER
): { multiplier: number; critical: boolean } {
  if (!mcppCritRolled) return { multiplier: 1, critical: false };
  const multiplier = vanillaCritDetected
    ? mcppMultiplier * CombatConstants.DOUBLE_CRIT_SECONDARY_MULTIPLIER
    : mcppMultiplier;
  return { multiplier, critical: true };
}

export function resolveAttackSpeedRatio(
  elapsedTicks: number,
  requiredTicks: number,
  floor: number = CombatConstants.ATTACK_SPEED_MIN_RATIO
): { ratio: number; canTrigger: boolean } {
  if (requiredTicks <= 0 || elapsedTicks >= requiredTicks) {
    return { ratio: 1, canTrigger: true };
  }
  const raw = elapsedTicks / requiredTicks;
  return { ratio: Math.max(floor, raw), canTrigger: false };
}

export function scalePvpBonus(bonusAmount: number, isPvp: boolean): number {
  return isPvp ? bonusAmount * CombatConstants.PVP_BONUS_MULTIPLIER : bonusAmount;
}
