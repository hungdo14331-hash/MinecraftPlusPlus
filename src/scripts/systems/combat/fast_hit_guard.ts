import { system,type Entity } from "@minecraft/server";
const guarded=new Map<string,number>();
const key=(attacker:Entity,target:Entity)=>`${attacker.id}:${target.id}`;
export function markFastHit(attacker:Entity,target:Entity):void{guarded.set(key(attacker,target),system.currentTick);}
export function consumeFastHit(attacker:Entity,target:Entity):boolean{
  const k=key(attacker,target);const matches=guarded.get(k)===system.currentTick;if(matches)guarded.delete(k);return matches;
}
export function clearFastHit(attacker:Entity,target:Entity):void{guarded.delete(key(attacker,target));}
