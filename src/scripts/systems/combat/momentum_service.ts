import { system, type Player } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { readMainhand } from "../../core/api/inventory_adapter";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { isSwordItem } from "../../core/utils/item_types";
import { log } from "../../core/utils/logger";
import { TaskQueue } from "../../core/scheduler/task_queue";

const MOMENTUM_DURATION_TICKS = 80;
const activationTokens = new Map<string, number>();

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
  const token = (activationTokens.get(player.id) ?? 0) + 1;
  activationTokens.set(player.id, token);

  const segmentTicks = MOMENTUM_DURATION_TICKS / level;
  applySpeed(player, level, MOMENTUM_DURATION_TICKS);

  // Ha tung cap deu nhau trong tong 4 giay. Token ngan timer cu pha lan kich hoat moi.
  for (let nextLevel = level - 1; nextLevel >= 1; nextLevel--) {
    const stagesElapsed = level - nextLevel;
    const delay = Math.round(segmentTicks * stagesElapsed);
    const remaining = Math.max(1, MOMENTUM_DURATION_TICKS - delay);
    system.runTimeout(() => {
      if (activationTokens.get(player.id) !== token || !player.isValid) return;
      // Xoa cap Speed cao hon truoc; Bedrock co the tu choi ghi de effect manh bang effect yeu.
      try {
        player.removeEffect("speed");
      } catch {
        // Neu effect vua het dung tick nay thi khong can xu ly them.
      }
      applySpeed(player, nextLevel, remaining);
    }, delay);
  }

  system.runTimeout(() => {
    if (activationTokens.get(player.id) === token) activationTokens.delete(player.id);
  }, MOMENTUM_DURATION_TICKS + 1);
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
