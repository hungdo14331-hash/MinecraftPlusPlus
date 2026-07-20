import { log } from "../utils/logger";
import { SCHEDULER_OPS_PER_TICK } from "../config/constants";

interface Task {
  name: string;
  step: () => boolean;
}

class TaskQueueImpl {
  private queue: Task[] = [];
  private deferred: Array<() => void> = [];

  /** Chay fn o lan process ke tiep (dung de hoan side-effect tu before-event sang tick sau). */
  defer(fn: () => void): void {
    this.deferred.push(fn);
  }

  /** Task nhieu buoc; step tra ve true khi hoan tat. */
  enqueue(name: string, step: () => boolean): void {
    this.queue.push({ name, step });
  }

  process(): void {
    const jobs = this.deferred.splice(0);
    for (const fn of jobs) {
      try {
        fn();
      } catch (e) {
        log.error("deferred task loi:", e);
      }
    }

    let budget = SCHEDULER_OPS_PER_TICK;
    while (budget > 0 && this.queue.length > 0) {
      const task = this.queue[0];
      if (!task) break;
      let done = true;
      try {
        done = task.step();
      } catch (e) {
        log.error(`task "${task.name}" loi:`, e);
      }
      if (done) this.queue.shift();
      budget--;
    }
  }
}

export const TaskQueue = new TaskQueueImpl();
