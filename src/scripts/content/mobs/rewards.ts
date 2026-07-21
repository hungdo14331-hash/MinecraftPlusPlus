import { MobRewardRegistry } from "../../core/registry/registries";

const rewards: Array<[string, number, number, boolean?]> = [
  ["minecraft:zombie", 2, 7],
  ["minecraft:skeleton", 2, 7],
  ["minecraft:spider", 2, 7],
  ["minecraft:cave_spider", 3, 8],
  ["minecraft:husk", 4, 9],
  ["minecraft:stray", 4, 9],
  ["minecraft:drowned", 4, 9],
  ["minecraft:creeper", 4, 9],
  ["minecraft:slime", 2, 6],
  ["minecraft:magma_cube", 4, 10],
  ["minecraft:pillager", 5, 11],
  ["minecraft:vindicator", 8, 16],
  ["minecraft:witch", 7, 14],
  ["minecraft:enderman", 7, 14],
  ["minecraft:blaze", 7, 14],
  ["minecraft:guardian", 12, 25],
  ["minecraft:piglin_brute", 12, 25],
  ["minecraft:ravager", 15, 30],
  ["minecraft:evocation_illager", 30, 60],
  ["minecraft:elder_guardian", 30, 60],
  ["minecraft:wither", 400, 400, true],
  ["minecraft:ender_dragon", 750, 750, true],
  ["minecraft:warden", 1000, 1000, true],
];

export function register(): void {
  for (const [id, minCoins, maxCoins, isBoss] of rewards) {
    MobRewardRegistry.register({ id, minCoins, maxCoins, isBoss, varietyPenalty: !isBoss });
  }
}
