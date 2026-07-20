import { system } from "@minecraft/server";
import { log } from "../../core/utils/logger";
import type { InternalEffectMeta } from "../../core/types";

const CHAIN_TTL_TICKS = 5;
const DEFAULT_MAX_DEPTH = 4;

interface ChainState {
  depth: number;
  expiresAtTick: number;
}

class InternalEffectGuardImpl {
  private counter = 0;
  private chains = new Map<string, ChainState>();

  /** Goi khi bat dau MOT combat context/root event that su (khong phai noi bo). */
  newRootEventId(): string {
    return `root_${system.currentTick}_${this.counter++}`;
  }

  /**
   * Goi TRUOC khi thuc thi bat ky damage/heal/effect noi bo nao.
   * Tra ve false = CHAN (da vuot do sau toi da trong chuoi nay, khong duoc thuc thi).
   */
  shouldProcess(meta: InternalEffectMeta | undefined, maxDepth = DEFAULT_MAX_DEPTH): boolean {
    if (!meta) return true;
    const existing = this.chains.get(meta.rootEventId);
    const depth = (existing?.depth ?? 0) + 1;
    if (depth > maxDepth) {
      log.warn(
        `InternalEffectGuard: CHAN vong lap — root=${meta.rootEventId} source=${meta.sourceId} effect=${meta.effectId} depth=${depth} (max=${maxDepth})`
      );
      return false;
    }
    this.chains.set(meta.rootEventId, { depth, expiresAtTick: system.currentTick + CHAIN_TTL_TICKS });
    return true;
  }

  /** Don cac chain da het han (goi tu bucket dinh ky, giong CooldownService.sweep). */
  sweep(): void {
    const now = system.currentTick;
    for (const [k, v] of this.chains) if (now > v.expiresAtTick) this.chains.delete(k);
  }
}

export const InternalEffectGuard = new InternalEffectGuardImpl();
