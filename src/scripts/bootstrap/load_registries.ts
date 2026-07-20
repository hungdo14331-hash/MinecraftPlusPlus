import { register as registerWeapons } from "../content/weapons/index";
import { register as registerAbilities } from "../content/abilities/index";
import { register as registerEnchants } from "../content/enchantments/index";
import { register as registerCurrencies } from "../content/currencies/index";
import { register as registerStructures } from "../content/structures/index";
import {
  WeaponRegistry,
  AbilityRegistry,
  EnchantRegistry,
  CurrencyRegistry,
  StructureRegistry,
} from "../core/registry/registries";
import { log } from "../core/utils/logger";

export function loadRegistries(): void {
  registerWeapons();
  registerAbilities();
  registerEnchants();
  registerCurrencies();
  registerStructures();

  for (const r of [WeaponRegistry, AbilityRegistry, EnchantRegistry, CurrencyRegistry, StructureRegistry]) {
    r.freeze();
  }

  log.info(
    `registries: weapons=${WeaponRegistry.size} abilities=${AbilityRegistry.size} enchants=${EnchantRegistry.size} currencies=${CurrencyRegistry.size} structures=${StructureRegistry.size}`
  );
}
