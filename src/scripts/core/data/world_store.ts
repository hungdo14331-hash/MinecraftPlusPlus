import { world } from "@minecraft/server";
import { log } from "../utils/logger";
import { MAX_DYNPROP_JSON } from "../config/constants";

export const WorldStore = {
  getNumber(key: string): number | undefined {
    const v = world.getDynamicProperty(key);
    return typeof v === "number" ? v : undefined;
  },
  setNumber(key: string, value: number): void {
    world.setDynamicProperty(key, value);
  },
  getJson<T = unknown>(key: string): T | undefined {
    const v = world.getDynamicProperty(key);
    if (typeof v !== "string") return undefined;
    try {
      return JSON.parse(v) as T;
    } catch {
      log.warn(`world json hong o key ${key}`);
      return undefined;
    }
  },
  setJson(key: string, value: unknown): boolean {
    const s = JSON.stringify(value);
    if (s.length > MAX_DYNPROP_JSON) {
      log.error(`world json qua lon o key ${key}: ${s.length}`);
      return false;
    }
    world.setDynamicProperty(key, s);
    return true;
  },
};
