import { GameMode, type Player } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { log } from "../../core/utils/logger";
import { CurrencyService } from "./currency_service";

export function initDeathPenaltyService(): void {
  EventBus.on(Events.Combat.Death, (ev: any) => {
    try {
      applyDeathPenalty(ev);
    } catch (e) {
      log.error("DeathPenaltyService loi:", e);
    }
  });
}

function applyDeathPenalty(ev: any): void {
  const dead = ev.deadEntity;
  if (dead?.typeId !== "minecraft:player") return;
  const player = dead as Player;
  try {
    if (player.getGameMode() === GameMode.Creative) return;
  } catch {
    // Neu runtime khong doc duoc game mode, van ap dung quy tac survival mac dinh.
  }

  const balance = CurrencyService.getBalance(player);
  if (balance <= 0) return;
  const percentLoss = Math.floor(balance * 0.2);
  const randomLoss = Math.floor(Math.random() * 501);
  const loss = Math.min(balance, percentLoss + randomLoss);
  if (!CurrencyService.trySpend(player, loss, undefined, "death_penalty")) return;
  player.sendMessage(`§cBan da mat ${loss.toLocaleString("en-US")} Arcane Coin khi chet.`);
}
