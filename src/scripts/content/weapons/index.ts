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
  // Vu khi #2 (thu nghiem) — Iron Sword vanilla, override nhanh hon baseline.
  // Base: iron sword vanilla (khong tao item moi — khong can texture/RP rieng).
  //
  // "Tang toc danh": KHONG doi toc vung kiem vat ly cua Bedrock (Bedrock von khong co
  // co che attack cooldown nhu Java — click nhanh bao nhieu cung full damage neu KHONG
  // dang ky trong WeaponRegistry). O day, iron sword duoc dat requiredTicks THAP HON
  // BASELINE_ATTACK_SPEED_TICKS (8 < 13) — nghia la, SO VOI mot vu khi MC++ khac o muc
  // baseline (vd diamond sword ben tren), iron sword duoc phep danh lien tuc voi nhip
  // nhanh hon ma van giu 100% damage + van kich hoat trigger phu, trong khi diamond sword
  // se bi phat (giam damage tuyen tinh, san 20%) neu danh nhanh hon 13 tick/don.
  // Day la "nhanh hon" THEO NGHIA TUONG DOI giua cac vu khi MC++ — hay tu test bang cach
  // dam ca 2 vu khi that nhanh lien tuc va so sanh damage hien tren HUD/log.
  //
  // "Tang toc chay khi danh trung": moi don trung DU CHARGE (canTriggerOnHit=true) se tu
  // cong Speed III (amplifier=2) trong 4 giay (80 tick) len chinh nguoi danh.
  // ============================================================
  WeaponRegistry.register({
    id: "mcpp:iron_sword",
    itemTypeId: "minecraft:iron_sword",
    stats: {
      attackDamageMcpp: 6 * HEALTH_SCALE, // damage goc vanilla cua iron sword (6)
      attackSpeed: 8, // tick — thap hon baseline (13) => "nhanh hon tuong doi"
      armorPenetration: 0, // chua bat xuyen giap cho vu khi thu nghiem nay
      criticalChance: 0, // chua bat crit MC++ rieng — tranh chong lan voi bien do dang do
      knockback: 0,
    },
    onHitEffects: [{ type: "self_speed", amplifier: 2, durationTicks: 80 }],
  });
}
