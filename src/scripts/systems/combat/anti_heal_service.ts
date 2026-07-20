import { system, type Entity } from "@minecraft/server";
import { CombatConstants, AntiHealLevels } from "../../core/config/combat_constants";

interface AntiHealRecord {
  level: 1 | 2 | 3;
  isPvp: boolean;
  expiryTick: number;
}

class AntiHealServiceImpl {
  private records = new Map<string, AntiHealRecord>();

  /** Goi khi mot don trung enchant/vu khi mang Anti-Heal. isPvp = target luc do la nguoi choi khac. */
  apply(target: Entity, level: 1 | 2 | 3, isPvp: boolean): void {
    this.records.set(target.id, {
      level,
      isPvp,
      expiryTick: system.currentTick + CombatConstants.ANTI_HEAL_DURATION_TICKS,
    });
  }

  /** 0..1 — % giam hoi mau HIEN TAI cua target (0 neu khong co debuff hoac da het han). */
  getReduction(target: Entity): number {
    const rec = this.records.get(target.id);
    if (!rec) return 0;
    if (system.currentTick > rec.expiryTick) {
      this.records.delete(target.id);
      return 0;
    }
    return rec.isPvp ? AntiHealLevels[rec.level].pvp : AntiHealLevels[rec.level].pve;
  }

  isActive(target: Entity): boolean {
    return this.getReduction(target) > 0;
  }

  sweep(): void {
    const now = system.currentTick;
    for (const [k, v] of this.records) if (now > v.expiryTick) this.records.delete(k);
  }
}

export const AntiHealService = new AntiHealServiceImpl();
