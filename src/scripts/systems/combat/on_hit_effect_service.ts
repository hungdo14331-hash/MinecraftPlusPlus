import type { Entity } from "@minecraft/server";
import type { OnHitEffectDefinition } from "../../core/types";
import { log } from "../../core/utils/logger";

/**
 * Cluster moi (v0.3.2). Chi ho tro "self_speed" hien tai — cong hieu ung Speed len
 * chinh nguoi danh (khong phai target). Goi tu TaskQueue.defer trong damage_service,
 * cung nguyen tac voi applyBonusKnockback: khong dung API co side-effect ben trong
 * mot before-event handler.
 */
export function applyOnHitEffects(attacker: Entity, effects: OnHitEffectDefinition[] | undefined): void {
  if (!effects || effects.length === 0) return;
  for (const eff of effects) {
    try {
      if (eff.type === "self_speed") {
        (attacker as any).addEffect("speed", eff.durationTicks, {
          amplifier: eff.amplifier,
          showParticles: false,
        });
      }
    } catch (e) {
      log.debug("applyOnHitEffects loi:", e);
    }
  }
}
