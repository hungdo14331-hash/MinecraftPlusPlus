import type { Entity, Player } from "@minecraft/server";
import { GameplayConfig } from "../../core/config/gameplay_config";
import { isDisplayableTarget } from "./target_filter";

export function scanTarget(viewer: Player): Entity | undefined {
  const cfg = GameplayConfig.targetHud;
  if (!cfg) return undefined;
  try {
    const hits = viewer.getEntitiesFromViewDirection({ maxDistance: cfg.rangeBlocks });
    for (const hit of hits) {
      if (isDisplayableTarget(viewer, hit.entity)) return hit.entity;
    }
  } catch {
    // im lang — HUD khong quan trong bang gameplay
  }
  return undefined;
}
