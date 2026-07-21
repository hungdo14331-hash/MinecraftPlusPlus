import { system, type Entity, type Player, type Vector3 } from "@minecraft/server";
import { readMainhand } from "../../core/api/inventory_adapter";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { TickScheduler } from "../../core/scheduler/tick_scheduler";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";
import { isSwordItem } from "../../core/utils/item_types";

const CHANCE = [0, 0.1, 0.15, 0.2] as const;
const DURATION = [0, 20, 30, 40] as const;
const SPEED_FACTOR = [1, 0.9, 0.8, 0.7] as const;
const BOSS_IMMUNITY_TICKS = 160;
const BOSSES = new Set(["minecraft:warden", "minecraft:wither", "minecraft:ender_dragon"]);

interface FrostbiteRecord {
  entity: Entity;
  slowUntil: number;
  speedFactor: number;
  previous: Vector3;
  freezeUntil: number;
  freezeAnchor?: Vector3;
  grantBossImmunity?: boolean;
}

const records = new Map<string, FrostbiteRecord>();
const bossImmuneUntil = new Map<string, number>();

export function initFrostbiteService(): void {
  EventBus.on(Events.Combat.Hurt, (ev: any) => {
    try {
      applyFromHit(ev);
    } catch (e) {
      log.error("FrostbiteService loi:", e);
    }
  });
  TickScheduler.every("frostbite_movement", 1, updateMovement);
}

function applyFromHit(ev: any): void {
  if (ev.damageSource?.cause !== "entityAttack" || Number(ev.damage) <= 0) return;
  const attackerEntity = ev.damageSource?.damagingEntity;
  if (attackerEntity?.typeId !== "minecraft:player") return;
  const attacker = attackerEntity as Player;
  const weapon = readMainhand(attacker);
  if (!isSwordItem(weapon)) return;
  const rawLevel = getCustomEnchantLevel(weapon, "mcpp:frostbite");
  if (rawLevel < 1) return;
  const level = Math.min(3, rawLevel) as 1 | 2 | 3;
  applyFrostbite(ev.hurtEntity as Entity, level);
}

function applyFrostbite(target: Entity, level: 1 | 2 | 3): void {
  const now = system.currentTick;
  const duration = DURATION[level];
  const existing = records.get(target.id);
  const record: FrostbiteRecord = existing ?? {
    entity: target,
    slowUntil: now,
    speedFactor: SPEED_FACTOR[level],
    previous: { ...target.location },
    freezeUntil: now,
  };

  // Moi don Frostbite luon slow; cap moi thay the bang muc slow manh hon trong thoi gian moi.
  record.entity = target;
  record.slowUntil = now + duration;
  record.speedFactor = SPEED_FACTOR[level];
  record.previous = { ...target.location };

  const isBoss = BOSSES.has(target.typeId);
  const canFreeze = !isBoss || now >= (bossImmuneUntil.get(target.id) ?? 0);
  if (canFreeze && Math.random() < CHANCE[level]) {
    const freezeDuration = isBoss ? Math.max(1, Math.floor(duration / 2)) : duration;
    record.freezeUntil = Math.max(record.freezeUntil, now + freezeDuration);
    record.freezeAnchor = { ...target.location };
    record.grantBossImmunity = isBoss;
  }
  records.set(target.id, record);
}

function updateMovement(): void {
  const now = system.currentTick;
  for (const [id, record] of records) {
    const entity = record.entity;
    if (!entity.isValid || now > record.slowUntil) {
      records.delete(id);
      continue;
    }
    try {
      if (now <= record.freezeUntil && record.freezeAnchor) {
        entity.clearVelocity();
        entity.teleport(record.freezeAnchor);
        record.previous = { ...record.freezeAnchor };
        continue;
      }
      if (record.freezeAnchor) {
        if (record.grantBossImmunity) bossImmuneUntil.set(id, now + BOSS_IMMUNITY_TICKS);
        record.freezeAnchor = undefined;
        record.grantBossImmunity = false;
      }

      const current = entity.location;
      const corrected = {
        x: record.previous.x + (current.x - record.previous.x) * record.speedFactor,
        y: current.y,
        z: record.previous.z + (current.z - record.previous.z) * record.speedFactor,
      };
      entity.teleport(corrected);
      record.previous = corrected;
    } catch (e) {
      records.delete(id);
      log.debug("Frostbite movement loi:", e);
    }
  }
  for (const [id, until] of bossImmuneUntil) if (now > until) bossImmuneUntil.delete(id);
}

/** Khoa chuyen dong dung chung cho Stagger/Freeze cua cac ability khac. */
export function applyMovementLock(target: Entity, durationTicks: number, useBossRules = false): boolean {
  if (!target?.isValid || durationTicks <= 0) return false;
  const now = system.currentTick;
  const isBoss = BOSSES.has(target.typeId);
  if (useBossRules && isBoss && now < (bossImmuneUntil.get(target.id) ?? 0)) return false;
  const effectiveDuration = useBossRules && isBoss
    ? Math.max(1, Math.floor(durationTicks / 2))
    : durationTicks;
  const existing = records.get(target.id);
  const record: FrostbiteRecord = existing ?? {
    entity: target,
    slowUntil: now,
    speedFactor: 1,
    previous: { ...target.location },
    freezeUntil: now,
  };
  record.entity = target;
  record.slowUntil = Math.max(record.slowUntil, now + effectiveDuration);
  record.freezeUntil = Math.max(record.freezeUntil, now + effectiveDuration);
  record.freezeAnchor = { ...target.location };
  record.grantBossImmunity = useBossRules && isBoss;
  records.set(target.id, record);
  return true;
}
