import { CurrencyRegistry } from "../../core/registry/registries";

export function register(): void {
  CurrencyRegistry.register({
    id: "mcpp:arcane_coin",
    displayName: "Arcane Coin",
    symbol: "✦",
  });
}
