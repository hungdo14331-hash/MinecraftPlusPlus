import { EntityComponentTypes, type Player } from "@minecraft/server";
import { readMainhand } from "../../core/api/inventory_adapter";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";
import { AntiHealService } from "./anti_heal_service";
import { isSwordItem } from "../../core/utils/item_types";

const DECAY_BOSSES = new Set(["minecraft:warden", "minecraft:ender_dragon", "minecraft:wither"]);

export function initDecayService(): void {
  EventBus.on(Events.Combat.Hurt, (ev: any) => {
    try {
      applyDecayFromHit(ev);
      applyBossDecay(ev);
    } catch (e) {
      log.error("DecayService loi:", e);
    }
  });
}

function applyBossDecay(ev: any): void {
  if (!Number.isFinite(Number(ev.damage)) || Number(ev.damage) <= 0) return;
  const direct = ev.damageSource?.damagingEntity;
  const projectile = ev.damageSource?.damagingProjectile;
  const owner = projectile?.getComponent?.(EntityComponentTypes.Projectile)?.owner;
  const boss = DECAY_BOSSES.has(direct?.typeId) ? direct : owner;
  const target = ev.hurtEntity;
  if (!DECAY_BOSSES.has(boss?.typeId) || target?.typeId !== "minecraft:player") return;
  AntiHealService.apply(target, 2, false);
}

function applyDecayFromHit(ev: any): void {
  if (ev.damageSource?.cause !== "entityAttack" || Number(ev.damage) <= 0) return;
  const attackerEntity = ev.damageSource?.damagingEntity;
  if (attackerEntity?.typeId !== "minecraft:player") return;
  const attacker = attackerEntity as Player;
  const weapon = readMainhand(attacker);
  if (!isSwordItem(weapon)) return;

  const rawLevel = getCustomEnchantLevel(weapon, "mcpp:decay");
  if (rawLevel < 1) return;
  const level = Math.min(3, rawLevel) as 1 | 2 | 3;
  const target = ev.hurtEntity;
  const isPvp = target?.typeId === "minecraft:player" && target.id !== attacker.id;
  AntiHealService.apply(target, level, isPvp);
}
