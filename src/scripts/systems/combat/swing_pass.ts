import { system, type Entity } from "@minecraft/server";

// 10 vu khi dac biet dung he thong "don vung theo animation" (SwingStrikeService).
// Don melee vanilla tuc thoi cua chung bi DamageService chan; chi don duoc cap
// sweep pass (dung tick) moi di tiep vao pipeline.
export const INTERCEPTED_WEAPONS = new Set([
  "mcpp:conqueror_greatsword",
  "mcpp:chronoblade",
  "mcpp:arcane_spear",
  "mcpp:frost_hammer",
  "mcpp:shadow_dagger",
  "mcpp:runeblade",
  "mcpp:titan_maul",
  "mcpp:gale_glaive",
  "mcpp:ember_cleaver",
  "mcpp:void_reaper",
]);

// Pass chi co gia tri trong DUNG tick cap (applyDamage kich hoat entityHurt dong bo
// cung tick) — giong co che fast_hit_guard.
const passes = new Map<string, number>();

const key = (attacker: Entity, target: Entity) => `${attacker.id}:${target.id}`;

export function grantSweepHit(attacker: Entity, target: Entity): void {
  passes.set(key(attacker, target), system.currentTick);
}

export function consumeSweepHit(attacker: Entity, target: Entity): boolean {
  const k = key(attacker, target);
  const matches = passes.get(k) === system.currentTick;
  if (matches) passes.delete(k);
  return matches;
}
