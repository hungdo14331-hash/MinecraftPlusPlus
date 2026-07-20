import { Debug } from "../config/debug_config";
import { log } from "../utils/logger";

type Handler = (payload: any) => void;
interface Sub {
  fn: Handler;
  priority: number;
}

class EventBusImpl {
  private subs = new Map<string, Sub[]>();

  on(name: string, fn: Handler, priority = 0): () => void {
    const list = this.subs.get(name) ?? [];
    const sub: Sub = { fn, priority };
    list.push(sub);
    list.sort((a, b) => b.priority - a.priority);
    this.subs.set(name, list);
    return () => {
      const cur = this.subs.get(name);
      if (!cur) return;
      const i = cur.indexOf(sub);
      if (i >= 0) cur.splice(i, 1);
    };
  }

  emit(name: string, payload: any): void {
    if (Debug.logEvents) log.debug("event:", name);
    const list = this.subs.get(name);
    if (!list) return;
    for (const s of [...list]) {
      try {
        s.fn(payload);
      } catch (e) {
        log.error(`handler loi tai event ${name}:`, e);
      }
    }
  }
}

export const EventBus = new EventBusImpl();
