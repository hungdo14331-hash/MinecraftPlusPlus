import { ADDON_NAME, ADDON_VERSION } from "../core/config/constants";
import { log } from "../core/utils/logger";
import { EventBus } from "../core/events/event_bus";
import { Events } from "../core/events/event_names";
import { initBedrockAdapter } from "../core/api/bedrock_adapter";
import { initDamageAdapter } from "../core/api/damage_adapter";
import { loadRegistries } from "./load_registries";
import { validateContent } from "./validate_content";
import { subscribeEvents } from "./subscribe_events";
import { initTargetHudSystem } from "../systems/targeting/target_hud_system";
import { initDamageService } from "../systems/combat/damage_service";
import { initHealingService } from "../systems/health/healing_service";
import { initVeinMinerService } from "../systems/mining/vein_miner_service";
import { initEarthshatterService } from "../systems/mining/earthshatter_service";
import { initLegendaryWeaponService } from "../systems/mastery/legendary_weapon_service";
import { initMasteryRewardService } from "../systems/mastery/mastery_reward_service";
import { initFastWeaponService } from "../systems/combat/fast_weapon_service";
import { initLifeStealService } from "../systems/combat/life_steal_service";
import { initEnchantCommandService } from "../systems/enchantments/enchant_command_service";
import { initMomentumService } from "../systems/combat/momentum_service";
import { initArcaneTableService } from "../systems/enchantments/arcane_table_service";
import { initCurrencyCommandService } from "../systems/currency/currency_command_service";
import { initMobRewardService } from "../systems/currency/mob_reward_service";
import { initDeathPenaltyService } from "../systems/currency/death_penalty_service";
import { initArcaneMerchantService } from "../systems/currency/arcane_merchant_service";
import { initTrueDamageService } from "../systems/combat/true_damage_service";
import { initDecayService } from "../systems/combat/decay_service";
import { initFrostbiteService } from "../systems/combat/frostbite_service";
import { initParryService } from "../systems/combat/parry_service";
import { initMasteryService } from "../systems/mastery/mastery_service";
import { initMasteryModifiers } from "../systems/mastery/mastery_modifiers";
import { initMasteryDefenseService } from "../systems/mastery/mastery_defense_service";
import { ensureWorldData } from "../core/data/migrations";
import { TickScheduler } from "../core/scheduler/tick_scheduler";

export function initialize(): void {
  log.info(`${ADDON_NAME} v${ADDON_VERSION} dang khoi dong...`);

  initBedrockAdapter();
  initDamageAdapter();

  loadRegistries();
  if (!validateContent()) {
    log.error("Content validation FAILED — kiem tra log tren, noi dung loi bi bo qua.");
  }

  subscribeEvents();
  initTargetHudSystem();
  initDamageService();
  initFastWeaponService();
  initHealingService();
  initLifeStealService();
  initTrueDamageService();
  initDecayService();
  initFrostbiteService();
  initParryService();
  initMasteryService();
  initMasteryModifiers();
  initMasteryDefenseService();
  initLegendaryWeaponService();
  initMasteryRewardService();
  initMomentumService();
  initEnchantCommandService();
  initArcaneTableService();
  initCurrencyCommandService();
  initMobRewardService();
  initDeathPenaltyService();
  initArcaneMerchantService();
  initVeinMinerService();
  initEarthshatterService();

  ensureWorldData();
  TickScheduler.start();

  EventBus.emit(Events.Lifecycle.Ready, {});
  log.info("San sang.");
}
