import { Registry } from "./registry";
import type {
  WeaponDefinition,
  AbilityDefinition,
  EnchantDefinition,
  CurrencyDefinition,
  StructureDefinition,
  MobRewardDefinition,
} from "../types";

export const WeaponRegistry = new Registry<WeaponDefinition>("weapon");
export const AbilityRegistry = new Registry<AbilityDefinition>("ability");
export const EnchantRegistry = new Registry<EnchantDefinition>("enchant");
export const CurrencyRegistry = new Registry<CurrencyDefinition>("currency");
export const StructureRegistry = new Registry<StructureDefinition>("structure");
// Reward definitions target vanilla mobs, so this registry also accepts minecraft:* IDs.
export const MobRewardRegistry = new Registry<MobRewardDefinition>("mob_reward", true);
