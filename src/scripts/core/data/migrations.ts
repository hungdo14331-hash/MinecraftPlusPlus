import type { Player } from "@minecraft/server";
import { WorldStore } from "./world_store";
import { PlayerStore } from "./player_store";
import { DataKeys } from "./data_keys";
import { log } from "../utils/logger";

export const CURRENT_DATA_VERSION = 1;

const worldMigrations: Record<number, () => void> = {};
const playerMigrations: Record<number, (p: Player) => void> = {};

export function ensureWorldData(): void {
  const v = WorldStore.getNumber(DataKeys.worldDataVersion) ?? 0;
  if (v === 0) {
    WorldStore.setNumber(DataKeys.worldDataVersion, CURRENT_DATA_VERSION);
    return;
  }
  runChain(
    v,
    CURRENT_DATA_VERSION,
    (from) => {
      const fn = worldMigrations[from];
      if (!fn) return false;
      fn();
      WorldStore.setNumber(DataKeys.worldDataVersion, from + 1);
      return true;
    },
    "world"
  );
}

export function ensurePlayerData(p: Player): void {
  const v = PlayerStore.getNumber(p, DataKeys.playerDataVersion) ?? 0;
  if (v === 0) {
    PlayerStore.setNumber(p, DataKeys.playerDataVersion, CURRENT_DATA_VERSION);
    return;
  }
  runChain(
    v,
    CURRENT_DATA_VERSION,
    (from) => {
      const fn = playerMigrations[from];
      if (!fn) return false;
      fn(p);
      PlayerStore.setNumber(p, DataKeys.playerDataVersion, from + 1);
      return true;
    },
    `player ${p.name}`
  );
}

function runChain(from: number, to: number, step: (from: number) => boolean, label: string): void {
  let v = from;
  while (v < to) {
    if (!step(v)) {
      log.error(`thieu migration ${v}->${v + 1} cho ${label}`);
      return;
    }
    v++;
  }
}
