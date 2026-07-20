import { EntityComponentTypes, type Entity } from "@minecraft/server";
import type { HpSnapshot } from "../../core/types";

export function readHp(entity: Entity): HpSnapshot | undefined {
  try {
    const h = entity.getComponent(EntityComponentTypes.Health);
    if (!h) return undefined;
    return { currentVanilla: h.currentValue, maxVanilla: h.effectiveMax };
  } catch {
    return undefined;
  }
}
