import type { Player } from "@minecraft/server";
import { DataKeys } from "../../core/data/data_keys";
import { PlayerStore } from "../../core/data/player_store";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { CurrencyRegistry } from "../../core/registry/registries";

export const ARCANE_COIN_ID = "mcpp:arcane_coin";
const MAX_BALANCE = Number.MAX_SAFE_INTEGER;

export interface CurrencyChange {
  player: Player;
  currencyId: string;
  previousBalance: number;
  balance: number;
  delta: number;
  reason?: string;
}

function requireCurrency(currencyId: string): void {
  if (!CurrencyRegistry.has(currencyId)) throw new Error(`Currency khong ton tai: ${currencyId}`);
}

function keyOf(currencyId: string): string {
  if (currencyId === ARCANE_COIN_ID) return DataKeys.arcaneCoinBalance;
  return `mcpp:currency_${currencyId.replace(/[^a-z0-9_]/g, "_")}`;
}

function normalizeAmount(value: number): number {
  if (!Number.isFinite(value)) throw new Error("So tien phai la so huu han");
  return Math.max(0, Math.min(MAX_BALANCE, Math.floor(value)));
}

function writeBalance(
  player: Player,
  currencyId: string,
  nextBalance: number,
  reason?: string
): CurrencyChange {
  requireCurrency(currencyId);
  const previousBalance = CurrencyService.getBalance(player, currencyId);
  const balance = normalizeAmount(nextBalance);
  PlayerStore.setNumber(player, keyOf(currencyId), balance);

  const change: CurrencyChange = {
    player,
    currencyId,
    previousBalance,
    balance,
    delta: balance - previousBalance,
    reason,
  };
  if (change.delta !== 0) EventBus.emit(Events.Currency.BalanceChanged, change);
  return change;
}

export const CurrencyService = {
  getBalance(player: Player, currencyId = ARCANE_COIN_ID): number {
    requireCurrency(currencyId);
    const stored = PlayerStore.getNumber(player, keyOf(currencyId));
    return stored === undefined ? 0 : normalizeAmount(stored);
  },

  setBalance(player: Player, amount: number, currencyId = ARCANE_COIN_ID, reason?: string): CurrencyChange {
    return writeBalance(player, currencyId, amount, reason);
  },

  add(player: Player, amount: number, currencyId = ARCANE_COIN_ID, reason?: string): CurrencyChange {
    const normalized = normalizeAmount(amount);
    return writeBalance(player, currencyId, this.getBalance(player, currencyId) + normalized, reason);
  },

  canAfford(player: Player, amount: number, currencyId = ARCANE_COIN_ID): boolean {
    return this.getBalance(player, currencyId) >= normalizeAmount(amount);
  },

  trySpend(player: Player, amount: number, currencyId = ARCANE_COIN_ID, reason?: string): CurrencyChange | undefined {
    const normalized = normalizeAmount(amount);
    const balance = this.getBalance(player, currencyId);
    if (balance < normalized) return undefined;
    return writeBalance(player, currencyId, balance - normalized, reason);
  },
};
