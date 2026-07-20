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
  initHealingService();

  ensureWorldData();
  TickScheduler.start();

  EventBus.emit(Events.Lifecycle.Ready, {});
  log.info("San sang.");
}
