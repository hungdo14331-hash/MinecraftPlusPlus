import type { Entity } from "@minecraft/server";
import { log } from "../../core/utils/logger";

export function applyBonusKnockback(attacker: Entity, target: Entity, bonusStrength: number | undefined): void {
  if (!bonusStrength || bonusStrength <= 0) return;
  try {
    const from = attacker.location;
    const to = target.location;
    let dx = to.x - from.x;
    let dz = to.z - from.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) {
      dx = 0;
      dz = 1;
    } else {
      dx /= len;
      dz /= len;
    }
    (target as any).applyKnockback({ x: dx * bonusStrength, z: dz * bonusStrength }, Math.min(0.4, bonusStrength * 0.2));
  } catch (e) {
    log.debug("applyBonusKnockback loi:", e);
  }
}
