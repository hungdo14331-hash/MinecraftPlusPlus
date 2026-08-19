import type { Player } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { readMainhand } from "../../core/api/inventory_adapter";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { isSwordItem } from "../../core/utils/item_types";
import { log } from "../../core/utils/logger";
import { TaskQueue } from "../../core/scheduler/task_queue";

const MOMENTUM_DURATION_TICKS = 80;

export function initMomentumService(): void {
  EventBus.on(Events.Combat.Hurt, (ev: any) => {
    try {
      handleHurtAfter(ev);
    } catch (e) {
      log.error("MomentumService loi:", e);
    }
  });
}

function handleHurtAfter(ev: any): void {
  if (ev.damageSource?.cause !== "entityAttack") return;
  if (!Number.isFinite(Number(ev.damage)) || Number(ev.damage) <= 0) return;

  const attackerEntity = ev.damageSource?.damagingEntity;
  if (attackerEntity?.typeId !== "minecraft:player") return;
  const attacker = attackerEntity as Player;

  const weapon = readMainhand(attacker);
  if (!isSwordItem(weapon)) return;

  const level = getCustomEnchantLevel(weapon, "mcpp:momentum");
  if (level <= 0) return;

  TaskQueue.defer(() => activateMomentum(attacker, level));
}

function activateMomentum(player: Player, level: number): void {
  // Giu mot cap Speed on dinh trong 4 giay. Khong remove/re-add giua chung vi thao tac
  // do co the ngat trang thai sprint va xoa nham Speed tu potion/beacon.
  applySpeed(player, Math.max(1, Math.min(3, level)), MOMENTUM_DURATION_TICKS);
}

function applySpeed(player: Player, level: number, durationTicks: number): void {
  try {
    // Speed amplifier 0/1/2 tuong ung +20%/+40%/+60%.
    player.addEffect("speed", durationTicks, {
      amplifier: level - 1,
      showParticles: false,
    });
  } catch (e) {
    log.debug("Momentum apply Speed loi:", e);
  }
}
