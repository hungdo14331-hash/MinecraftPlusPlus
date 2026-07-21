import { EntityComponentTypes, type Player } from "@minecraft/server";
import { getAllPlayers } from "../../core/api/world_adapter";
import { TickScheduler } from "../../core/scheduler/tick_scheduler";
import { getMasteryData } from "./mastery_service";
import { hasActiveMasteryReward } from "./mastery_reward_service";

const VALUES = {
  strength: [0,.02,.05,.09,.14,.21,.30,.42,.57,.76,1],
  precision: [0,.01,.03,.06,.09,.13,.18,.24,.30],
  agility: [0,.02,.05,.09,.14,.19,.25,.32,.40],
  dexterity: [0,.03,.07,.12,.18,.25,.33,.41,.50],
  defense: [0,.02,.05,.09,.14,.19,.25,.32,.40],
  recovery: [0,.05,.12,.21,.32,.45,.60],
  prosperity: [0,.05,.13,.24,.38,.55,.75],
} as const;
// Health Boost tang theo buoc 2 tim. Moi rank Sinh Luc deu co muc mau rieng
// va 5 rank cuoi tang manh hon de dat dung 40 tim tai rank 10.
const HEALTH_BOOST_LEVELS = [0,1,2,3,4,5,7,9,11,13,15] as const;

export function masteryBonus(player: Player, stat: keyof typeof VALUES): number {
  const data = getMasteryData(player); if (!data.unlocked) return 0;
  return masteryBonusAtRank(stat,Math.max(0,Math.floor(data.stats[stat]??0)));
}
export function masteryBonusAtRank(stat:keyof typeof VALUES,rank:number):number{
  const table=VALUES[stat];return table[Math.min(Math.max(0,Math.floor(rank)),table.length-1)]??0;
}
export function masteryRank(player: Player, stat: string): number {
  const data = getMasteryData(player); return data.unlocked ? Math.max(0, Math.floor((data.stats as any)[stat] ?? 0)) : 0;
}

export function initMasteryModifiers(): void {
  TickScheduler.every("mastery_attributes", 100, () => { for (const p of getAllPlayers()) applyMasteryAttributes(p); });
}
export function applyMasteryAttributes(player: Player): void {
  const vitality = Math.min(10, masteryRank(player, "vitality"));
  const boostLevels = HEALTH_BOOST_LEVELS[vitality];
  try {
    if (boostLevels > 0) player.addEffect("health_boost", 220, { amplifier: boostLevels - 1, showParticles: false });
    else player.removeEffect("health_boost");
  } catch { /* Runtime cu khong co health_boost se bo qua an toan. */ }

  try {
    const movement = player.getComponent(EntityComponentTypes.Movement) as any;
    const windBonus=hasActiveMasteryReward(player,"agility")?0.1:0;
    movement?.setCurrentValue?.(0.1 * (1 + masteryBonus(player, "agility") + windBonus));
  } catch { /* Khong de attribute movement lam hong scheduler. */ }
}
