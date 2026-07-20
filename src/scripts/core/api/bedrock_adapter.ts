import { world } from "@minecraft/server";
import { EventBus } from "../events/event_bus";
import { Events } from "../events/event_names";
import { log } from "../utils/logger";

interface Capability {
  name: string;
  available: boolean;
}

const caps: Capability[] = [];

function probe(name: string, available: boolean): boolean {
  caps.push({ name, available });
  return available;
}

export function initBedrockAdapter(): void {
  world.afterEvents.entityHitEntity.subscribe((ev) => EventBus.emit(Events.Combat.Hit, ev));
  world.afterEvents.entityHurt.subscribe((ev) => EventBus.emit(Events.Combat.Hurt, ev));
  world.afterEvents.entityDie.subscribe((ev) => EventBus.emit(Events.Combat.Death, ev));
  world.afterEvents.playerBreakBlock.subscribe((ev) => EventBus.emit(Events.World.BreakBlock, ev));
  world.afterEvents.itemUse.subscribe((ev) => EventBus.emit(Events.World.ItemUse, ev));
  world.afterEvents.playerSpawn.subscribe((ev) => EventBus.emit(Events.Lifecycle.PlayerSpawn, ev));

  if (probe("beforeEvents.entityHurt", "entityHurt" in world.beforeEvents)) {
    world.beforeEvents.entityHurt.subscribe((ev) => EventBus.emit(Events.Combat.HurtBefore, ev));
  }
  if (probe("beforeEvents.entityHeal", "entityHeal" in world.beforeEvents)) {
    world.beforeEvents.entityHeal.subscribe((ev) => EventBus.emit(Events.Combat.HealBefore, ev));
  }

  for (const c of caps) log.info(`capability ${c.name}: ${c.available ? "OK" : "THIEU"}`);
}
