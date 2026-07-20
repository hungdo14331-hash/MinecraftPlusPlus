import { world, Player } from "@minecraft/server";

export function getAllPlayers(): Player[] {
  return world.getAllPlayers();
}
