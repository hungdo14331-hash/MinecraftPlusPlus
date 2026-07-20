import { system, world } from "@minecraft/server";
import { initialize } from "./bootstrap/initialize";
import { log } from "./core/utils/logger";

function boot(): void {
  try {
    initialize();
  } catch (e) {
    log.error("Khoi dong that bai:", e);
  }
}

if ("worldLoad" in world.afterEvents) {
  (world.afterEvents as any).worldLoad.subscribe(() => boot());
} else {
  system.run(boot);
}
