import { HEALTH_SCALE } from "../../core/config/constants";
import type { HpSnapshot } from "../../core/types";

export function toMcpp(vanillaHp: number): number {
  return vanillaHp * HEALTH_SCALE;
}

export function toVanilla(mcppHp: number): number {
  return mcppHp / HEALTH_SCALE;
}

export function toDisplay(s: HpSnapshot, rounding: "integer" | "tenth"): { cur: number; max: number } {
  const round = rounding === "integer" ? (n: number) => Math.round(n) : (n: number) => Math.round(n * 10) / 10;
  let cur = round(toMcpp(s.currentVanilla));
  const max = round(toMcpp(s.maxVanilla));
  if (s.currentVanilla > 0 && cur <= 0) cur = rounding === "integer" ? 1 : 0.5;
  return { cur, max };
}
