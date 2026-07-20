import { computeArmorPenetrationBonus } from "../../core/math/damage_math";

export function computeArmorPenBonus(
  observedDamageMcpp: number,
  declaredRawDamageMcpp: number | undefined,
  armorPenetrationPercent: number | undefined
): number {
  if (declaredRawDamageMcpp === undefined || !armorPenetrationPercent || armorPenetrationPercent <= 0) {
    return 0;
  }
  return computeArmorPenetrationBonus(declaredRawDamageMcpp, observedDamageMcpp, armorPenetrationPercent);
}
