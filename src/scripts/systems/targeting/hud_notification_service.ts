import { system, type Player } from "@minecraft/server";

interface HudNotification {
  text:string;
  expiresAt:number;
  priority:number;
}

const notifications=new Map<string,HudNotification>();

export function pushHudNotification(player:Player,text:string,durationTicks=35,priority=1):void{
  const current=notifications.get(player.id);
  const now=system.currentTick;
  if(current&&current.expiresAt>=now&&current.priority>priority)return;
  notifications.set(player.id,{text,expiresAt:now+Math.max(10,durationTicks),priority});
}

export function getHudNotification(player:Player):HudNotification|undefined{
  const notice=notifications.get(player.id);
  if(!notice)return undefined;
  if(notice.expiresAt<system.currentTick){notifications.delete(player.id);return undefined;}
  return notice;
}

export function pruneHudNotifications(activePlayerIds:Set<string>):void{
  for(const id of notifications.keys())if(!activePlayerIds.has(id))notifications.delete(id);
}
