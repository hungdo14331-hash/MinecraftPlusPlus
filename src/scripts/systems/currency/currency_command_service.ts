import { system, type Player } from "@minecraft/server";
import { CurrencyRegistry } from "../../core/registry/registries";
import { log } from "../../core/utils/logger";
import { ARCANE_COIN_ID, CurrencyService } from "./currency_service";

const COMMAND_ID = "mcpp:currency";

export function initCurrencyCommandService(): void {
  system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id !== COMMAND_ID || ev.sourceEntity?.typeId !== "minecraft:player") return;
    try {
      handleCommand(ev.sourceEntity as Player, ev.message);
    } catch (e) {
      log.error("CurrencyCommandService loi:", e);
      (ev.sourceEntity as Player).sendMessage(`§cCurrency error: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}

function handleCommand(player: Player, message: string): void {
  const [rawAction = "balance", rawAmount] = message.trim().toLowerCase().split(/\s+/);
  const action = rawAction || "balance";
  const currency = CurrencyRegistry.get(ARCANE_COIN_ID);
  if (!currency) throw new Error("Arcane Coin chua duoc dang ky");

  if (action === "balance") {
    showBalance(player);
    return;
  }

  const amount = Number(rawAmount);
  if (!Number.isInteger(amount) || amount < 0) {
    player.sendMessage("§cSo tien phai la so nguyen khong am.");
    return;
  }

  if (action === "add") {
    CurrencyService.add(player, amount, ARCANE_COIN_ID, "command:add");
  } else if (action === "remove") {
    if (!CurrencyService.trySpend(player, amount, ARCANE_COIN_ID, "command:remove")) {
      player.sendMessage("§cKhong du Arcane Coin.");
      return;
    }
  } else if (action === "set") {
    CurrencyService.setBalance(player, amount, ARCANE_COIN_ID, "command:set");
  } else {
    player.sendMessage("§eDung: /scriptevent mcpp:currency balance|add|remove|set [so tien]");
    return;
  }

  showBalance(player);
}

function showBalance(player: Player): void {
  const currency = CurrencyRegistry.get(ARCANE_COIN_ID);
  if (!currency) return;
  const balance = CurrencyService.getBalance(player, ARCANE_COIN_ID);
  player.sendMessage(`§d${currency.symbol} ${currency.displayName}: §f${balance.toLocaleString("en-US")}`);
  try {
    player.onScreenDisplay.setActionBar(`§d${currency.symbol} ${balance.toLocaleString("en-US")} ${currency.displayName}`);
  } catch {
    // Chat message o tren van la fallback day du.
  }
}
