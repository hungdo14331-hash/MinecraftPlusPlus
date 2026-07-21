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

/**
 * Cong cung (hard gate) cho toc danh: khac voi ban cu (thuong/phat theo ty le), ham nay
 * chi tra ve true/false. Neu chua du requiredTicks ke tu don THAT gan nhat, don nay bi
 * CHAN HOAN TOAN (khong damage, khong bonus, khong hieu ung) — du click nhanh den dau,
 * chi co 1 don duoc tinh la that moi requiredTicks tick. Xem attack_speed_service.ts:
 * dong ho chi duoc cap nhat khi don duoc CHAP NHAN, khong phai moi lan click.
 */
export function resolveAttackGate(elapsedTicks: number, requiredTicks: number): { allowed: boolean } {
  if (requiredTicks <= 0) return { allowed: true };
  return { allowed: elapsedTicks >= requiredTicks };
}

export function scalePvpBonus(bonusAmount: number, isPvp: boolean): number {
  return isPvp ? bonusAmount * CombatConstants.PVP_BONUS_MULTIPLIER : bonusAmount;
}
