import { system, type Entity, type Player } from "@minecraft/server";
import { GameplayConfig } from "../../core/config/gameplay_config";
import { readHp } from "../health/health_service";
import { toDisplay } from "../health/health_scaler";
import { log } from "../../core/utils/logger";
import { ARCANE_COIN_ID, CurrencyService } from "../currency/currency_service";
import { CurrencyRegistry } from "../../core/registry/registries";

const RESEND_TICKS = 40;
const cache = new Map<string, { key: string; lastSentTick: number }>();
const currencyVisibleUntil = new Map<string, number>();
const CURRENCY_NOTICE_TICKS = 60;

export function notifyCurrencyChanged(player: Player): void {
  currencyVisibleUntil.set(player.id, system.currentTick + CURRENCY_NOTICE_TICKS);
}

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

  const parts: unknown[] = [];
  if (target) {
    const hp = readHp(target);
    if (hp) {
      const d = toDisplay(hp, cfg.rounding);
      const frac = hp.maxVanilla > 0 ? hp.currentVanilla / hp.maxVanilla : 0;
      if (cfg.showMobName) {
        parts.push({ text: WHITE }, nameOf(target), { text: ` ${GRAY}| ` });
      }
      parts.push({ text: `${hpColor(frac)}${d.cur}${GRAY}/${WHITE}${d.max} ${GRAY}HP` });
    }
  }

  const showCurrency = GameplayConfig.currencyHud.enabled &&
    (parts.length > 0 || system.currentTick <= (currencyVisibleUntil.get(viewer.id) ?? -1));
  if (showCurrency) {
    if (parts.length > 0) parts.push({ text: ` ${GRAY}| ` });
    const currency = CurrencyRegistry.get(ARCANE_COIN_ID);
    const balance = CurrencyService.getBalance(viewer, ARCANE_COIN_ID);
    parts.push({ text: `§d${currency?.symbol ?? "✦"} ${WHITE}${balance.toLocaleString("en-US")}` });
  }

  if (parts.length === 0) parts.push({ text: " " });

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
    if (!activePlayerIds.has(id)) {
      cache.delete(id);
      currencyVisibleUntil.delete(id);
    }
  }
}
