import { Debug } from "../config/debug_config";

const PREFIX = "[MC++]";

export const log = {
  debug(...a: unknown[]) {
    if (Debug.enabled) console.warn(PREFIX, "[debug]", ...a);
  },
  info(...a: unknown[]) {
    console.warn(PREFIX, ...a);
  },
  warn(...a: unknown[]) {
    console.warn(PREFIX, "[WARN]", ...a);
  },
  error(...a: unknown[]) {
    console.error(PREFIX, "[ERROR]", ...a);
  },
};
