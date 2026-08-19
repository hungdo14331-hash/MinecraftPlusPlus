import { system, type Entity, type Player } from "@minecraft/server";
import { getAllPlayers } from "../../core/api/world_adapter";
import { readMainhand } from "../../core/api/inventory_adapter";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { TickScheduler } from "../../core/scheduler/tick_scheduler";
import { TaskQueue } from "../../core/scheduler/task_queue";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";
import { isSwordItem } from "../../core/utils/item_types";
import { applyMovementLock } from "./frostbite_service";

const WINDOW_TICKS = [0, 4, 5, 6] as const;
const COOLDOWN_TICKS = [0, 60, 50, 40] as const;
const REFLECT_RATIO = [0, 0.3, 0.5, 0.7] as const;
const STAGGER_TICKS = 10;
const PARRY_III_FREEZE_CHANCE = 0.1;
const PARRY_III_FREEZE_TICKS = 20;

interface ParryState {
  wasSneaking: boolean;
  windowUntil: number;
  cooldownUntil: number;
  level: 0 | 1 | 2 | 3;
}

const states = new Map<string, ParryState>();
const parriedHits = new Map<string, number>();
const parrySuppressedUntil = new Map<string, number>();

export function wasHitParried(attacker: Entity, target: Entity): boolean {
  return system.currentTick <= (parriedHits.get(`${attacker.id}:${target.id}`) ?? -1);
}

/** Kỹ năng chủ động dùng chung thao tác cúi; khi đã kích hoạt, kỹ năng được ưu tiên hơn Parry. */
export function cancelParryWindow(player: Player): void {
  const now = system.currentTick;
  parrySuppressedUntil.set(player.id, now + 2);
  const state = states.get(player.id);
  if (state) {
    // Nếu cửa sổ vừa mở chỉ vì người chơi cúi để dùng kỹ năng, hoàn lại Parry.
    if (state.windowUntil >= now) state.cooldownUntil = now;
    state.windowUntil = -1;
  }
}

export function initParryService(): void {
  TickScheduler.every("parry_input", 1, pollParryInput);
  // DamageService xu ly damage truoc; Parry doc damage cuoi cung roi huy don.
  EventBus.on(Events.Combat.HurtBefore, handleIncomingHit, -100);
  TickScheduler.every("parry_prune", 100, pruneStates);
}

function pollParryInput(): void {
  const now = system.currentTick;
  for (const player of getAllPlayers()) {
    const state = states.get(player.id) ?? {
      wasSneaking: false,
      windowUntil: -1,
      cooldownUntil: -1,
      level: 0,
    };
    const sneaking = player.isSneaking;
    if (
      sneaking
      && !state.wasSneaking
      && now >= state.cooldownUntil
      && now > (parrySuppressedUntil.get(player.id) ?? -1)
    ) {
      const weapon = readMainhand(player);
      const rawLevel = isSwordItem(weapon)
        ? getCustomEnchantLevel(weapon, "mcpp:parry")
        : 0;
      if (rawLevel > 0) {
        const level = Math.min(3, rawLevel) as 1 | 2 | 3;
        state.level = level;
        state.windowUntil = now + WINDOW_TICKS[level];
        state.cooldownUntil = now + COOLDOWN_TICKS[level];
        playParryReady(player);
      }
    }
    state.wasSneaking = sneaking;
    states.set(player.id, state);
  }
}

function handleIncomingHit(ev: any): void {
  try {
    if (ev.damageSource?.cause !== "entityAttack") return;
    const defender = ev.hurtEntity;
    if (defender?.typeId !== "minecraft:player") return;
    const attacker = ev.damageSource?.damagingEntity as Entity | undefined;
    if (!attacker?.isValid || attacker.id === defender.id) return;

    const state = states.get(defender.id);
    if (!state || state.level < 1 || system.currentTick > state.windowUntil) return;
    const blockedDamage = Number(ev.damage);
    if (!Number.isFinite(blockedDamage) || blockedDamage <= 0) return;

    state.windowUntil = -1;
    parriedHits.set(`${attacker.id}:${defender.id}`, system.currentTick + 1);
    ev.damage = 0;
    try {
      ev.cancel = true;
    } catch {
      // ev.damage = 0 van la lop bao ve du phong.
    }

    const level = state.level as 1 | 2 | 3;
    playParrySuccess(defender as Player);
    TaskQueue.defer(() => resolveCounter(defender as Player, attacker, blockedDamage, level));
  } catch (e) {
    log.error("ParryService loi:", e);
  }
}

function resolveCounter(defender: Player, attacker: Entity, blockedDamage: number, level: 1 | 2 | 3): void {
  if (!defender.isValid || !attacker.isValid) return;
  const reflectedDamage = blockedDamage * REFLECT_RATIO[level];
  try {
    attacker.applyDamage(reflectedDamage, {
      cause: "thorns" as any,
      damagingEntity: defender,
    });
  } catch (e) {
    log.debug("Parry reflect damage loi:", e);
  }

  const freezes = level === 3 && Math.random() < PARRY_III_FREEZE_CHANCE;
  applyMovementLock(attacker, freezes ? PARRY_III_FREEZE_TICKS : STAGGER_TICKS, freezes);
}

function playParryReady(player: Player): void {
  try {
    player.playSound("item.shield.block", { pitch: 1.35, volume: 0.35 });
  } catch {
    // Khong de audio compatibility lam hong Parry.
  }
}

function playParrySuccess(player: Player): void {
  try {
    player.dimension.playSound("item.shield.block", player.location, { pitch: 0.9, volume: 1 });
    player.dimension.spawnParticle("minecraft:critical_hit_emitter", player.location);
  } catch {
    // Gameplay van hoat dong neu resource feedback khong co san.
  }
}

function pruneStates(): void {
  const active = new Set(getAllPlayers().map((player) => player.id));
  for (const id of states.keys()) if (!active.has(id)) states.delete(id);
  const now = system.currentTick;
  for (const [key, until] of parriedHits) if (now > until) parriedHits.delete(key);
  for (const [id, until] of parrySuppressedUntil) if (now > until || !active.has(id)) parrySuppressedUntil.delete(id);
}
