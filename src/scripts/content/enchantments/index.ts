import { EnchantRegistry } from "../../core/registry/registries";

export function register(): void {
  EnchantRegistry.register({
    id: "mcpp:vampire",
    displayName: "Vampire",
    maxLevel: 5,
    allowedItemSuffixes: ["_sword"],
  });

  EnchantRegistry.register({
    id: "mcpp:sloth",
    displayName: "Sloth",
    maxLevel: 3,
    allowedItemSuffixes: ["_sword"],
  });

  EnchantRegistry.register({
    id: "mcpp:momentum",
    displayName: "Momentum",
    maxLevel: 3,
    allowedItemSuffixes: ["_sword"],
  });

  EnchantRegistry.register({
    id: "mcpp:bounty",
    displayName: "Bounty",
    maxLevel: 5,
    allowedItemSuffixes: ["_sword"],
  });

  EnchantRegistry.register({
    id: "mcpp:piercing",
    displayName: "Piercing",
    maxLevel: 3,
    allowedItemSuffixes: ["_sword"],
  });

  EnchantRegistry.register({
    id: "mcpp:decay",
    displayName: "Decay",
    maxLevel: 3,
    allowedItemSuffixes: ["_sword"],
  });

  EnchantRegistry.register({
    id: "mcpp:frostbite",
    displayName: "Frostbite",
    maxLevel: 3,
    allowedItemSuffixes: ["_sword"],
  });

  EnchantRegistry.register({
    id: "mcpp:critical",
    displayName: "Critical",
    maxLevel: 5,
    allowedItemSuffixes: ["_sword"],
  });

  EnchantRegistry.register({
    id: "mcpp:parry",
    displayName: "Parry",
    maxLevel: 3,
    allowedItemSuffixes: ["_sword"],
  });

  EnchantRegistry.register({
    id: "mcpp:earthshatter",
    displayName: "Địa Chấn",
    maxLevel: 3,
    allowedItemSuffixes: ["_pickaxe"],
  });

  EnchantRegistry.register({
    id: "mcpp:vein_miner",
    displayName: "Vein Miner",
    maxLevel: 1,
    allowedItemSuffixes: ["_pickaxe", "_axe"],
  });
}
