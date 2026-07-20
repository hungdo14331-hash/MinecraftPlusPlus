import { EventBus } from "../core/events/event_bus";
import { Events } from "../core/events/event_names";
import { ensurePlayerData } from "../core/data/migrations";
import { TickScheduler } from "../core/scheduler/tick_scheduler";
import { CooldownService } from "../core/cooldown/cooldown_service";
import { InternalEffectGuard } from "../systems/combat/internal_effect_guard";
import { AntiHealService } from "../systems/combat/anti_heal_service";

export function subscribeEvents(): void {
  EventBus.on(Events.Lifecycle.PlayerSpawn, (ev: any) => {
    if (ev.initialSpawn) ensurePlayerData(ev.player);
  });

  TickScheduler.every("cooldown_sweep", 100, () => CooldownService.sweep());
  TickScheduler.every("internal_effect_guard_sweep", 100, () => InternalEffectGuard.sweep());
  TickScheduler.every("anti_heal_sweep", 100, () => AntiHealService.sweep());
}
