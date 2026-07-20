import { world } from "@minecraft/server";
import { log } from "../utils/logger";

let mode: "intercept" | "augment" = "augment";

export function initDamageAdapter(): void {
  mode = "entityHurt" in world.beforeEvents ? "intercept" : "augment";
  log.info(`DamageAdapter mode: ${mode}`);
}
