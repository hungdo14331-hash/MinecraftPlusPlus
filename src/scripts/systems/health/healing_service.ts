import { EntityHealCause } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { AntiHealService } from "../combat/anti_heal_service";
import { log } from "../../core/utils/logger";

const ANTI_HEAL_SCOPE = new Set<EntityHealCause>([EntityHealCause.Regeneration, EntityHealCause.SelfHeal]);

export function initHealingService(): void {
  EventBus.on(Events.Combat.HealBefore, (ev) => {
    try {
      handleVanillaHealBefore(ev);
    } catch (e) {
      log.error("HealingService (vanilla heal) loi:", e);
    }
  });
}

function handleVanillaHealBefore(ev: any): void {
  const cause = ev.healSource.cause;
  if (!ANTI_HEAL_SCOPE.has(cause)) return;
  const reduction = AntiHealService.getReduction(ev.healedEntity);
  if (reduction <= 0) return;
  ev.healing = ev.healing * (1 - reduction);
}
