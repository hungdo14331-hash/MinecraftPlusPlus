import { EntityComponentTypes, EntityHealCause, type Entity, type Player } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { AntiHealService } from "../combat/anti_heal_service";
import { log } from "../../core/utils/logger";
import { toMcpp, toVanilla } from "./health_scaler";
import { masteryBonus } from "../mastery/mastery_modifiers";
import { hasActiveMasteryReward } from "../mastery/mastery_reward_service";

// TotemOfUndying co y khong nam trong scope; Absorption khong phai mot heal event.
const ANTI_HEAL_SCOPE = new Set<EntityHealCause>([
  EntityHealCause.Heal,
  EntityHealCause.Regeneration,
  EntityHealCause.SelfHeal,
]);

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
  const recovery = ev.healedEntity?.typeId === "minecraft:player" ? masteryBonus(ev.healedEntity, "recovery")+(hasActiveMasteryReward(ev.healedEntity,"recovery")?0.15:0) : 0;
  ev.healing = ev.healing * (1 + recovery) * (1 - reduction);
}

/**
 * Hoi mau noi bo theo thang HP MC++. Anti-Heal duoc ap sau khi tinh luong heal goc,
 * cung quy tac voi cac nguon SelfHeal khac. Tra ve luong HP MC++ thuc te da hoi.
 */
export function applySelfHealMcpp(entity: Entity, amountMcpp: number): number {
  if (!Number.isFinite(amountMcpp) || amountMcpp <= 0) return 0;

  try {
    const health = entity.getComponent(EntityComponentTypes.Health);
    if (!health) return 0;

    const reduction = AntiHealService.getReduction(entity);
    const recovery = entity.typeId === "minecraft:player" ? masteryBonus(entity as Player, "recovery")+(hasActiveMasteryReward(entity as Player,"recovery")?0.15:0) : 0;
    const requestedVanilla = toVanilla(amountMcpp * (1 + recovery) * (1 - reduction));
    const missingVanilla = Math.max(0, health.effectiveMax - health.currentValue);
    const appliedVanilla = Math.min(requestedVanilla, missingVanilla);
    if (appliedVanilla <= 0) return 0;

    health.setCurrentValue(health.currentValue + appliedVanilla);
    return toMcpp(appliedVanilla);
  } catch (e) {
    log.debug("applySelfHealMcpp loi:", e);
    return 0;
  }
}
