import { system, type Entity, type Player } from "@minecraft/server";
import { GameplayConfig } from "../../core/config/gameplay_config";
import { readHp } from "../health/health_service";
import { toDisplay } from "../health/health_scaler";
import { log } from "../../core/utils/logger";

const RESEND_TICKS = 40;
const cache = new Map<string, { key: string; lastSentTick: number }>();

function nameOf(entity: Entity): { text: string } | { translate: string } {
  const tag = entity.nameTag;
  if (tag && tag.length > 0) return { text: tag };
  const typeId = entity.typeId;
  const key = typeId.startsWith("minecraft:") ? `entity.${typeId.slice("minecraft:".length)}.name` : `entity.${typeId}.name`;
  return { translate: key };
}

function hpColor(fraction: number): string {
  if (fraction >= 0.6) return "\u00A7a";
  if (fraction >= 0.3) return "\u00A7e";
  return "\u00A7c";
}

const GRAY = "\u00A77";
const WHITE = "\u00A7f";

export function renderTargetHud(viewer: Player, target: Entity | undefined): void {
  const cfg = GameplayConfig.targetHud;
  if (!cfg) return;
  const entry = cache.get(viewer.id);
  if (!target) {
    if (entry && entry.key !== "") {
      trySend(viewer, { text: " " });
      cache.set(viewer.id, { key: "", lastSentTick: system.currentTick });
    }
    return;
  }
  const hp = readHp(target);
  if (!hp) return;
  const d = toDisplay(hp, cfg.rounding);
  const frac = hp.maxVanilla > 0 ? hp.currentVanilla / hp.maxVanilla : 0;

  const parts: unknown[] = [];
  if (cfg.showMobName) {
    parts.push({ text: WHITE }, nameOf(target), { text: ` ${GRAY}| ` });
  }
  parts.push({ text: `${hpColor(frac)}${d.cur}${GRAY}/${WHITE}${d.max} ${GRAY}HP` });

  const payload = { rawtext: parts };
  const key = JSON.stringify(payload);
  const now = system.currentTick;
  if (entry && entry.key === key && now - entry.lastSentTick < RESEND_TICKS) return;

  trySend(viewer, payload);
  cache.set(viewer.id, { key, lastSentTick: now });
}

function trySend(viewer: Player, payload: unknown): void {
  try {
    viewer.onScreenDisplay.setActionBar(payload as any);
  } catch (e) {
    log.debug("actionbar loi:", e);
  }
}

export function pruneHudCache(activePlayerIds: Set<string>): void {
  for (const id of [...cache.keys()]) {
    if (!activePlayerIds.has(id)) cache.delete(id);
  }
}
