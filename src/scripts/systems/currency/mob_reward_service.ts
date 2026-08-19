import type { Player } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { readMainhand } from "../../core/api/inventory_adapter";
import { MobRewardRegistry } from "../../core/registry/registries";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";
import { CurrencyService } from "./currency_service";
import { masteryBonus } from "../mastery/mastery_modifiers";
import { hasActiveMasteryReward } from "../mastery/mastery_reward_service";
import { isSwordItem } from "../../core/utils/item_types";
import { pushHudNotification } from "../targeting/hud_notification_service";

const BOUNTY_BONUS: Record<number, { chance: number; flat: number }> = {
  1: { chance: 0.2, flat: 3 },
  2: { chance: 0.25, flat: 3 },
  3: { chance: 0.3, flat: 3 },
  4: { chance: 0.35, flat: 3 },
  5: { chance: 0.5, flat: 5 },
};

export function initMobRewardService(): void {
  EventBus.on(Events.Combat.Death, (ev: any) => {
    try {
      rewardKill(ev);
    } catch (e) {
      log.error("MobRewardService loi:", e);
    }
  });
}

function rewardKill(ev: any): void {
  const dead = ev.deadEntity;
  if (!dead || dead.typeId === "minecraft:player") return;
  const reward = MobRewardRegistry.get(dead.typeId);
  if (!reward) return;

  const killerEntity = ev.damageSource?.damagingEntity;
  if (killerEntity?.typeId !== "minecraft:player") return;
  const killer = killerEntity as Player;

  const baseCoins = randomInt(reward.minCoins, reward.maxCoins);
  let coins = Math.floor(baseCoins * (1 + masteryBonus(killer, "prosperity")+(hasActiveMasteryReward(killer,"prosperity")?0.25:0)));
  let bountyBonus = 0;
  if (!reward.isBoss) {
    const weapon = readMainhand(killer);
    const bountyLevel = isSwordItem(weapon)
      ? getCustomEnchantLevel(weapon, "mcpp:bounty")
      : 0;
    const bounty = BOUNTY_BONUS[bountyLevel];
    if (bounty && Math.random() < bounty.chance) {
      bountyBonus = bounty.flat;
      coins += bountyBonus;
    }
  }

  CurrencyService.add(killer, coins, undefined, `kill:${dead.typeId}`);
  const royal=hasActiveMasteryReward(killer,"prosperity");
  const suffix = `${bountyBonus > 0 ? ` §6(Bounty +${bountyBonus})` : ""}${royal?" §6[ Bùa Vương Giả ]":""}`;
  pushHudNotification(killer,`§d✦ +${coins}${suffix}`,30,1);
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
