import { EntityComponentTypes, system, type Entity, type Player, type Vector3 } from "@minecraft/server";
import { readMainhand } from "../../core/api/inventory_adapter";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { TickScheduler } from "../../core/scheduler/tick_scheduler";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";
import { isSwordItem } from "../../core/utils/item_types";

// Frostbite chu yeu la slow. Freeze hiem, ngan va co mien nhiem sau moi lan kich hoat.
const CHANCE = [0, 0.03, 0.05, 0.08] as const;
const SLOW_DURATION = [0, 20, 30, 40] as const;
const FREEZE_DURATION = [0, 8, 10, 12] as const;
const SPEED_FACTOR = [1, 0.9, 0.8, 0.7] as const;
const BOSS_IMMUNITY_TICKS = 160;
const FREEZE_IMMUNITY_TICKS = 120;
const BOSS_FROSTBITE_IMMUNITY_TICKS = 240;
const BOSSES = new Set(["minecraft:warden", "minecraft:wither", "minecraft:ender_dragon"]);

interface SlowRecord {
  entity: Entity;
  until: number;
  factor: number;
  originalMovement?: number;
}

interface MovementLockRecord {
  entity: Entity;
  until: number;
  anchor: Vector3;
  grantBossImmunity: boolean;
}

const slowRecords = new Map<string, SlowRecord>();
const movementLocks = new Map<string, MovementLockRecord>();
const bossImmuneUntil = new Map<string, number>();
const frostbiteImmuneUntil = new Map<string, number>();

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
  applySlow(target, SPEED_FACTOR[level], SLOW_DURATION[level]);

  const isBoss = BOSSES.has(target.typeId);
  const canFreeze = now >= (frostbiteImmuneUntil.get(target.id) ?? 0)
    && (!isBoss || now >= (bossImmuneUntil.get(target.id) ?? 0));
  const freezeChance = isBoss ? CHANCE[level] * 0.5 : CHANCE[level];
  if (!canFreeze || Math.random() >= freezeChance) return;

  const baseDuration = FREEZE_DURATION[level];
  const duration = isBoss ? Math.max(1, Math.floor(baseDuration / 2)) : baseDuration;
  setMovementLock(target, duration, false);
  const immunity = isBoss ? BOSS_FROSTBITE_IMMUNITY_TICKS : FREEZE_IMMUNITY_TICKS;
  frostbiteImmuneUntil.set(target.id, now + duration + immunity);
  if (isBoss) bossImmuneUntil.set(target.id, now + duration + immunity);
}

/**
 * Giam truc tiep movement attribute thay vi teleport moi tick. Teleport lam AI bi reset
 * duong di va trong game nhin giong nhu Freeze 100%.
 */
function applySlow(target: Entity, factor: number, durationTicks: number): void {
  const now = system.currentTick;
  const existing = slowRecords.get(target.id);
  const record: SlowRecord = existing ?? {
    entity: target,
    until: now,
    factor,
  };
  record.entity = target;
  record.until = Math.max(record.until, now + durationTicks);
  record.factor = Math.min(record.factor, factor);

  try {
    const movement = target.getComponent(EntityComponentTypes.Movement) as any;
    if (!movement || typeof movement.setCurrentValue !== "function") throw new Error("movement component unavailable");
    if (record.originalMovement === undefined) {
      const current = Number(movement.currentValue);
      const fallback = Number(movement.defaultValue);
      record.originalMovement = Number.isFinite(current) && current > 0
        ? current
        : Number.isFinite(fallback) && fallback > 0 ? fallback : undefined;
    }
    if (record.originalMovement === undefined || movement.setCurrentValue(record.originalMovement * record.factor) === false) {
      throw new Error("movement attribute rejected value");
    }
  } catch {
    // Fallback cho entity khong cung cap movement component. Slowness chi la du phong;
    // phan lon mob va player se dung attribute chinh xac 10/20/30%.
    try {
      const amplifier = factor <= 0.7 ? 1 : 0;
      target.addEffect("slowness", durationTicks, { amplifier, showParticles: false });
    } catch { /* Entity khong ho tro effect thi bo qua slow, khong khoa cung no. */ }
  }
  slowRecords.set(target.id, record);
}

function restoreMovement(record: SlowRecord): void {
  if (record.originalMovement === undefined || !record.entity.isValid) return;
  try {
    const movement = record.entity.getComponent(EntityComponentTypes.Movement) as any;
    movement?.setCurrentValue?.(record.originalMovement);
  } catch { /* Entity co the bi xoa dung luc slow het han. */ }
}

function setMovementLock(target: Entity, durationTicks: number, grantBossImmunity: boolean): void {
  const now = system.currentTick;
  const existing = movementLocks.get(target.id);
  movementLocks.set(target.id, {
    entity: target,
    until: Math.max(existing?.until ?? now, now + durationTicks),
    anchor: { ...target.location },
    grantBossImmunity: existing?.grantBossImmunity === true || grantBossImmunity,
  });
}

function updateMovement(): void {
  const now = system.currentTick;

  for (const [id, record] of slowRecords) {
    if (!record.entity.isValid || now > record.until) {
      restoreMovement(record);
      slowRecords.delete(id);
    }
  }

  for (const [id, record] of movementLocks) {
    const entity = record.entity;
    if (!entity.isValid) {
      movementLocks.delete(id);
      continue;
    }
    if (now > record.until) {
      if (record.grantBossImmunity) bossImmuneUntil.set(id, now + BOSS_IMMUNITY_TICKS);
      movementLocks.delete(id);
      continue;
    }
    try {
      entity.clearVelocity();
      entity.teleport(record.anchor);
    } catch (e) {
      movementLocks.delete(id);
      log.debug("Movement lock loi:", e);
    }
  }

  for (const [id, until] of bossImmuneUntil) if (now > until) bossImmuneUntil.delete(id);
  for (const [id, until] of frostbiteImmuneUntil) if (now > until) frostbiteImmuneUntil.delete(id);
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
  setMovementLock(target, effectiveDuration, useBossRules && isBoss);
  return true;
}
