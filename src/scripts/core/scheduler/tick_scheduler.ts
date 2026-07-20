import { system } from "@minecraft/server";
import { log } from "../utils/logger";
import { TaskQueue } from "./task_queue";

interface RepeatingTask {
  name: string;
  every: number;
  fn: () => void;
}

class TickSchedulerImpl {
  private tasks: RepeatingTask[] = [];
  private handle: number | undefined;
  private tick = 0;

  every(name: string, everyTicks: number, fn: () => void): () => void {
    const t: RepeatingTask = { name, every: Math.max(1, everyTicks), fn };
    this.tasks.push(t);
    return () => {
      const i = this.tasks.indexOf(t);
      if (i >= 0) this.tasks.splice(i, 1);
    };
  }

  start(): void {
    if (this.handle !== undefined) return;
    this.handle = system.runInterval(() => {
      this.tick++;
      for (const t of [...this.tasks]) {
        if (this.tick % t.every !== 0) continue;
        try {
          t.fn();
        } catch (e) {
          log.error(`scheduler task "${t.name}" loi:`, e);
        }
      }
      TaskQueue.process();
    }, 1);
    log.debug("TickScheduler started");
  }
}

export const TickScheduler = new TickSchedulerImpl();
