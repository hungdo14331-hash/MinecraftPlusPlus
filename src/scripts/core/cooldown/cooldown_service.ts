import { system, type Entity } from "@minecraft/server";

class CooldownServiceImpl {
  private expiry = new Map<string, number>();

  private key(e: Entity, id: string): string {
    return `${e.id}|${id}`;
  }

  start(e: Entity, id: string, ticks: number): void {
    this.expiry.set(this.key(e, id), system.currentTick + Math.max(0, ticks));
  }

  isReady(e: Entity, id: string): boolean {
    const t = this.expiry.get(this.key(e, id));
    return t === undefined || system.currentTick >= t;
  }

  remainingTicks(e: Entity, id: string): number {
    const t = this.expiry.get(this.key(e, id));
    return t === undefined ? 0 : Math.max(0, t - system.currentTick);
  }

  /** Goi dinh ky de don entry het han (chong phinh Map). */
  sweep(): void {
    const now = system.currentTick;
    for (const [k, t] of this.expiry) if (now >= t) this.expiry.delete(k);
  }
}

export const CooldownService = new CooldownServiceImpl();
