import { TickScheduler } from "../../core/scheduler/tick_scheduler";
import { GameplayConfig } from "../../core/config/gameplay_config";
import { getAllPlayers } from "../../core/api/world_adapter";
import { scanTarget } from "./target_scanner";
import { renderTargetHud, pruneHudCache } from "./target_hud";
import { log } from "../../core/utils/logger";

export function initTargetHudSystem(): void {
  const cfg = GameplayConfig.targetHud;
  if (!cfg) {
    log.info("TargetHUD: tat (chua co config duoc chot)");
    return;
  }
  TickScheduler.every("target_hud", cfg.refreshTicks, () => {
    for (const p of getAllPlayers()) renderTargetHud(p, scanTarget(p));
  });
  TickScheduler.every("target_hud_prune", 100, () => {
    pruneHudCache(new Set(getAllPlayers().map((p) => p.id)));
  });
  log.info(`TargetHUD: bat (style=${cfg.style}, range=${cfg.rangeBlocks} block, refresh=${cfg.refreshTicks} tick)`);
}
