import { WeaponRegistry } from "../../core/registry/registries";
import { HEALTH_SCALE } from "../../core/config/constants";
import { CombatConstants } from "../../core/config/combat_constants";

export function register(): void {
  // ============================================================
  // Vu khi #1 (mốc so sánh / baseline) — Diamond Sword vanilla.
  // requiredTicks = BASELINE_ATTACK_SPEED_TICKS (13) — dai dien cho "toc danh thuong".
  // Khong co onHitEffects — dung de nguoi test doi chieu ro rang voi iron sword ben duoi.
  // ============================================================
  WeaponRegistry.register({
    id: "mcpp:diamond_sword",
    itemTypeId: "minecraft:diamond_sword",
    stats: {
      attackDamageMcpp: 7 * HEALTH_SCALE, // damage goc vanilla cua diamond sword (7)
      attackSpeed: CombatConstants.BASELINE_ATTACK_SPEED_TICKS, // 13 tick — "toc do thuong"
      armorPenetration: 0,
      criticalChance: 0,
      knockback: 0,
    },
  });

  // ============================================================
  // Vu khi #2 (thu nghiem) — Iron Sword vanilla, dung baseline nhu cac kiem khac.
  // Base: iron sword vanilla (khong tao item moi — khong can texture/RP rieng).
  //
  // Toc danh duoc dat tai baseline 13 tick. Custom enchant Sloth giam thoi gian cho
  // theo he so +20% toc do moi cap cho moi loai kiem.
  //
  // Tang toc chay sau don danh da duoc chuyen sang custom enchant Momentum I-III.
  // ============================================================
  WeaponRegistry.register({
    id: "mcpp:iron_sword",
    itemTypeId: "minecraft:iron_sword",
    stats: {
      attackDamageMcpp: 6 * HEALTH_SCALE, // damage goc vanilla cua iron sword (6)
      attackSpeed: CombatConstants.BASELINE_ATTACK_SPEED_TICKS,
      armorPenetration: 0, // chua bat xuyen giap cho vu khi thu nghiem nay
      criticalChance: 0, // chua bat crit MC++ rieng — tranh chong lan voi bien do dang do
      knockback: 0,
    },
  });

  WeaponRegistry.register({
    id: "mcpp:conqueror_greatsword",
    itemTypeId: "mcpp:conqueror_greatsword",
    stats: {
      attackDamageMcpp: 12 * HEALTH_SCALE,
      attackSpeed: 22,
      armorPenetration: 0.1,
      criticalChance: 0,
      knockback: 0.35,
    },
    abilities: ["mcpp:conqueror_cleave"],
  });

  WeaponRegistry.register({
    id: "mcpp:chronoblade",
    itemTypeId: "mcpp:chronoblade",
    stats: {
      attackDamageMcpp: 8 * HEALTH_SCALE,
      attackSpeed: 8,
      armorPenetration: 0.05,
      criticalChance: 0.05,
      knockback: 0,
    },
  });

  WeaponRegistry.register({id:"mcpp:arcane_spear",itemTypeId:"mcpp:arcane_spear",stats:{attackDamageMcpp:9*HEALTH_SCALE,attackSpeed:15,armorPenetration:0.2,criticalChance:0.05,knockback:0.3}});
  WeaponRegistry.register({id:"mcpp:frost_hammer",itemTypeId:"mcpp:frost_hammer",stats:{attackDamageMcpp:11*HEALTH_SCALE,attackSpeed:22,armorPenetration:0.05,criticalChance:0,knockback:1}});
  WeaponRegistry.register({id:"mcpp:shadow_dagger",itemTypeId:"mcpp:shadow_dagger",stats:{attackDamageMcpp:6*HEALTH_SCALE,attackSpeed:7,armorPenetration:0.1,criticalChance:0.15,knockback:0}});
}
