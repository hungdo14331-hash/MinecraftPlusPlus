import type { Player } from "@minecraft/server";
import { log } from "../utils/logger";
import { MAX_DYNPROP_JSON } from "../config/constants";

export const PlayerStore = {
  getNumber(p: Player, key: string): number | undefined {
    const v = p.getDynamicProperty(key);
    return typeof v === "number" ? v : undefined;
  },
  setNumber(p: Player, key: string, value: number): void {
    p.setDynamicProperty(key, value);
  },
  getJson<T = unknown>(p: Player, key: string): T | undefined {
    const v = p.getDynamicProperty(key);
    if (typeof v !== "string") return undefined;
    try {
      return JSON.parse(v) as T;
    } catch {
      log.warn(`player json hong: ${key}`);
      return undefined;
    }
  },
  setJson(p: Player, key: string, value: unknown): boolean {
    const s = JSON.stringify(value);
    if (s.length > MAX_DYNPROP_JSON) {
      log.error(`player json qua lon: ${key} = ${s.length}`);
      return false;
    }
    p.setDynamicProperty(key, s);
    return true;
  },
};
