import { system, type Entity } from "@minecraft/server";
import { resolveAttackGate } from "../../core/math/damage_math";

// QUAN TRONG: chi luu lai tick cua don DA DUOC CHAP NHAN (khong phai moi lan click).
// Neu luu ca don bi chan, spam-click lien tuc se lien tuc "reset dong ho", khien
// khong bao gio du thoi gian de mo cong — bug nghiem trong neu lam sai cho nay.
const lastAcceptedHitTick = new Map<string, number>();

export function getLastAcceptedHitTick(attacker:Entity):number {
  return lastAcceptedHitTick.get(attacker.id)??-Infinity;
}

export function markAttackAccepted(attacker:Entity):void {
  lastAcceptedHitTick.set(attacker.id,system.currentTick);
}

/** Sloth tang toc do danh 20% moi cap; toc do cao hon duoc doi thanh thoi gian cho ngan hon. */
export function applySlothToRequiredTicks(baseRequiredTicks: number, slothLevel: number, masteryBonus = 0): number {
  const safeBase = Math.max(1, baseRequiredTicks);
  const safeLevel = Math.max(0, Math.min(3, Math.floor(slothLevel)));
  const attackSpeedMultiplier = Math.min(2, 1 + safeLevel * 0.2 + Math.max(0, masteryBonus));
  return Math.max(1, Math.ceil(safeBase / attackSpeedMultiplier));
}

export function resolveAttackSpeed(attacker: Entity, requiredTicks: number | undefined): { allowed: boolean } {
  if (!requiredTicks || requiredTicks <= 0) {
    return { allowed: true };
  }
  const now = system.currentTick;
  const last = lastAcceptedHitTick.get(attacker.id) ?? -Infinity;
  const elapsed = now - last;
  const gate = resolveAttackGate(elapsed, requiredTicks);
  if (gate.allowed) {
    lastAcceptedHitTick.set(attacker.id, now);
  }
  return gate;
}
