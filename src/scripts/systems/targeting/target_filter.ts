import type { Entity } from "@minecraft/server";
import { GameplayConfig } from "../../core/config/gameplay_config";
import { readHp } from "../health/health_service";

const DENYLIST = new Set(["minecraft:armor_stand"]);

export function isDisplayableTarget(viewer: Entity, entity: Entity): boolean {
  const cfg = GameplayConfig.targetHud;
  if (!cfg) return false;
  if (entity.id === viewer.id) return false;
  if (DENYLIST.has(entity.typeId)) return false;
  if (entity.typeId === "minecraft:player" && !cfg.showPlayers) return false;
  const hp = readHp(entity);
  if (!hp || hp.currentVanilla <= 0) return false;
  return true;
}
