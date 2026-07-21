import { EntityComponentTypes, type Player } from "@minecraft/server";
import { TickScheduler } from "../../core/scheduler/tick_scheduler";
import { getAllPlayers } from "../../core/api/world_adapter";
import { MASTERY_REWARDS } from "../../content/mastery_rewards";
import { getMasteryData } from "./mastery_service";
import { AntiHealService } from "../combat/anti_heal_service";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { system } from "@minecraft/server";

export function hasItem(player:Player,itemId:string):boolean{
  const container=player.getComponent(EntityComponentTypes.Inventory)?.container;if(!container)return false;
  for(let i=0;i<container.size;i++)if(container.getItem(i)?.typeId===itemId)return true;
  return false;
}

export function hasActiveMasteryReward(player:Player,statId:string):boolean{
  const reward=MASTERY_REWARDS.find(entry=>entry.statId===statId);if(!reward)return false;
  const data=getMasteryData(player);
  return data.unlocked&&(data.stats as Record<string,number>)[statId]>=reward.maxRank&&hasItem(player,reward.itemId);
}

export function initMasteryRewardService():void{
  EventBus.on(Events.Lifecycle.PlayerSpawn,(ev:any)=>system.run(()=>refreshRewardLore(ev.player)));
  TickScheduler.every("mastery_life_relic",20,()=>{
    for(const player of getAllPlayers())if(hasActiveMasteryReward(player,"recovery")&&AntiHealService.clear(player)){
      player.onScreenDisplay.setActionBar("§a✦ Thánh Vật Sinh Mệnh đã thanh tẩy Suy Tàn");
    }
  });
}

function refreshRewardLore(player:Player):void{
  const container=player.getComponent(EntityComponentTypes.Inventory)?.container;if(!container)return;
  for(let slot=0;slot<container.size;slot++){
    const item=container.getItem(slot);if(!item)continue;const reward=MASTERY_REWARDS.find(entry=>entry.itemId===item.typeId);if(!reward)continue;
    const lore=item.getLore().filter(line=>!line.startsWith("§r§6Tinh Thông:")&&!line.startsWith("§r§7[Di vật]"));
    lore.unshift(`§r§7[Di vật] ${reward.description}`);lore.unshift(`§r§6Tinh Thông: ${reward.statName} ${reward.maxRank}`);
    item.setLore(lore);container.setItem(slot,item);
  }
}
