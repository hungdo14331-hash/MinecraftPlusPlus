import {
  EntityComponentTypes,
  EntityDamageCause,
  EntitySwingSource,
  system,
  world,
  type Entity,
  type ItemStack,
  type Player,
  type Vector3,
} from "@minecraft/server";
import { TickScheduler } from "../../core/scheduler/tick_scheduler";
import { log } from "../../core/utils/logger";
import { readMainhand } from "../../core/api/inventory_adapter";
import { toVanilla } from "../health/health_scaler";
import { resolveWeaponDefinition } from "./weapon_lookup";
import { computeRequiredTicks } from "../combat/damage_service";
import { markAttackAccepted, peekAttackGate } from "../combat/attack_speed_service";
import { grantSweepHit } from "../combat/swing_pass";
import { applyTrueDamage } from "../combat/true_damage_service";
import { consumeChronoCharge, hasChronoCharge } from "./active_weapon_skill_service";
import { pushHudNotification } from "../targeting/hud_notification_service";

// He thong "don vung theo animation" cho 10 vu khi dac biet:
//   1. HOAN sat thuong den dung khoanh khac luoi vu khi quet toi (strikeDelay theo loai
//      — khop keyframe strike cua animation FP/TP).
//   2. Danh trung theo VUNG QUET truoc mat — khong can tam ngam chinh xac vao entity.
//   3. Cua so don keo dai 1 giay ke tu luc vung: muc tieu buoc vao vung trong khoang do
//      van an don; moi muc tieu chi trung 1 lan moi cu vung.
// Don melee vanilla tuc thoi cua 10 vu khi nay da bi DamageService chan (swing_pass);
// don o day di qua pipeline day du (crit, mastery, xuyen giap, parry, on-hit effects)
// nho sweep pass. Cong toc danh van duoc ton trong: kiem tra 1 lan tai thoi diem strike.

interface SwingProfile {
  strikeDelay: number; // tick tu luc vung den luc luoi cham muc tieu
  range: number; // tam voi (block)
  minDot: number; // do rong hinh non quet (dot san — cang nho cung cang rong)
  maxTargets: number; // so muc tieu toi da moi cu vung
}

const PROFILES: Record<string, SwingProfile> = {
  greatsword: { strikeDelay: 4, range: 3.25, minDot: 0.45, maxTargets: 4 },
  blade: { strikeDelay: 2, range: 3.0, minDot: 0.6, maxTargets: 2 },
  dagger: { strikeDelay: 2, range: 2.75, minDot: 0.7, maxTargets: 1 },
  hammer: { strikeDelay: 6, range: 3.0, minDot: 0.55, maxTargets: 3 },
  polearm: { strikeDelay: 3, range: 4.25, minDot: 0.78, maxTargets: 3 },
  scythe: { strikeDelay: 5, range: 3.5, minDot: 0.3, maxTargets: 5 },
};

const CLASS_BY_WEAPON: Record<string, string> = {
  "mcpp:conqueror_greatsword": "greatsword",
  "mcpp:ember_cleaver": "greatsword",
  "mcpp:chronoblade": "blade",
  "mcpp:runeblade": "blade",
  "mcpp:shadow_dagger": "dagger",
  "mcpp:frost_hammer": "hammer",
  "mcpp:titan_maul": "hammer",
  "mcpp:arcane_spear": "polearm",
  "mcpp:gale_glaive": "polearm",
  "mcpp:void_reaper": "scythe",
};

const WINDOW_TICKS = 20; // "gay dame trong 1s" — cua so don theo yeu cau nguoi dung
const MAX_VERTICAL_OFFSET = 2.5;
const POINT_BLANK_RANGE = 0.9; // muc tieu ap sat (duoi chan/long nguoi) luon tinh la "truoc mat"
const NEVER_TARGET = new Set([
  "minecraft:item",
  "minecraft:xp_orb",
  "minecraft:armor_stand",
  "minecraft:painting",
  "minecraft:boat",
  "minecraft:chest_boat",
  "minecraft:minecart",
]);

interface SwingState {
  player: Player;
  weaponId: string;
  strikeTick: number;
  endTick: number;
  accepted: boolean;
  hit: Set<string>;
}

const swings = new Map<string, SwingState>();

export function initSwingStrikeService(): void {
  world.afterEvents.playerSwingStart.subscribe((event) => {
    try {
      if (event.swingSource !== EntitySwingSource.Attack) return;
      const weaponId = event.heldItemStack?.typeId ?? "";
      const cls = CLASS_BY_WEAPON[weaponId];
      if (!cls) return;
      const now = system.currentTick;
      // Moi nguoi choi chi co 1 cu vung dang hoat dong — vung moi thay the vung cu.
      swings.set(event.player.id, {
        player: event.player,
        weaponId,
        strikeTick: now + PROFILES[cls].strikeDelay,
        endTick: now + WINDOW_TICKS,
        accepted: false,
        hit: new Set(),
      });
    } catch (e) {
      log.error("SwingStrikeService swing loi:", e);
    }
  });

  TickScheduler.every("swing_strike_tick", 1, tickSwings);
}

function tickSwings(): void {
  if (swings.size === 0) return;
  const now = system.currentTick;
  for (const [id, state] of swings) {
    try {
      if (!state.player.isValid || now >= state.endTick) {
        swings.delete(id);
        continue;
      }
      if (now < state.strikeTick) continue;
      const weapon = readMainhand(state.player);
      if (weapon?.typeId !== state.weaponId) {
        swings.delete(id); // da doi vu khi giua chung — huy cu vung
        continue;
      }
      if (!state.accepted && !acceptStrike(state, weapon)) {
        swings.delete(id); // spam click qua som — cong chan tron cu vung
        continue;
      }
      volley(state);
    } catch (e) {
      swings.delete(id);
      log.debug("SwingStrikeService tick loi:", e);
    }
  }
}

// Cong toc danh kiem tra DUNG 1 LAN tai thoi diem strike; muc tieu vao vung muon hon
// trong cua so 1s thuoc cung cu vung da duoc chap nhan, khong kiem tra lai.
function acceptStrike(state: SwingState, weapon: ItemStack): boolean {
  const weaponDef = resolveWeaponDefinition(weapon);
  let required = computeRequiredTicks(state.player, weapon, weaponDef);
  // Thoi Gioi: nhip cuong hoa cua Chronoblade khong bao gio cham hon 6 tick.
  if (state.weaponId === "mcpp:chronoblade" && required !== undefined && hasChronoCharge(state.player)) {
    required = Math.min(required, 6);
  }
  if (!peekAttackGate(state.player, required)) return false;
  markAttackAccepted(state.player);
  state.accepted = true;
  return true;
}

function volley(state: SwingState): void {
  const profile = PROFILES[CLASS_BY_WEAPON[state.weaponId]];
  if (state.hit.size >= profile.maxTargets) return;
  const weaponDef = resolveWeaponDefinition(readMainhand(state.player));
  const baseDamage = toVanilla(weaponDef?.stats.attackDamageMcpp ?? 0);
  if (baseDamage <= 0) return;
  for (const target of coneTargets(state.player, profile)) {
    if (state.hit.size >= profile.maxTargets) break;
    if (state.hit.has(target.id)) continue;
    state.hit.add(target.id);
    strike(state, target, baseDamage);
  }
}

function strike(state: SwingState, target: Entity, baseDamage: number): void {
  const player = state.player;
  try {
    // Cap phep cho don nay di qua pipeline DamageService (bo qua cong — da qua o acceptStrike).
    grantSweepHit(player, target);
    const applied = target.applyDamage(baseDamage, {
      cause: EntityDamageCause.entityAttack,
      damagingEntity: player,
    });
    if (applied && state.weaponId === "mcpp:chronoblade" && consumeChronoCharge(player)) {
      applyTrueDamage(target, player, 1);
      pushHudNotification(player, "§d⌛ Nhịp Thời Gian §8• §f+1 sát thương chuẩn", 25, 2);
    }
  } catch (e) {
    log.debug("SwingStrikeService strike loi:", e);
  }
}

function coneTargets(player: Player, profile: SwingProfile): Entity[] {
  const origin = player.location;
  const direction = horizontalView(player);
  return player.dimension
    .getEntities({ location: origin, maxDistance: profile.range })
    .filter((entity) => isMeleeTarget(entity, player))
    .filter((entity) => Math.abs(entity.location.y - origin.y) <= MAX_VERTICAL_OFFSET)
    .filter((entity) => inCone(origin, entity.location, direction, profile.minDot))
    .sort((a, b) => distanceSquared(a.location, origin) - distanceSquared(b.location, origin));
}

function inCone(origin: Vector3, target: Vector3, direction: { x: number; z: number }, minDot: number): boolean {
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const horizontal = Math.hypot(dx, dz);
  if (horizontal <= POINT_BLANK_RANGE) return true;
  return (dx * direction.x + dz * direction.z) / horizontal >= minDot;
}

export function isMeleeTarget(entity: Entity, player: Player): boolean {
  if (
    !entity.isValid ||
    entity.id === player.id ||
    NEVER_TARGET.has(entity.typeId) ||
    entity.typeId.startsWith("mcpp:arcane_")
  )
    return false;
  if (entity.typeId === "minecraft:player" && !world.gameRules.pvp) return false;
  try {
    const health = entity.getComponent(EntityComponentTypes.Health);
    return !!health && health.currentValue > 0;
  } catch {
    return false;
  }
}

function horizontalView(player: Player): { x: number; z: number } {
  const view = player.getViewDirection();
  const length = Math.hypot(view.x, view.z);
  if (length < 0.001) {
    const yaw = (player.getRotation().y * Math.PI) / 180;
    return { x: -Math.sin(yaw), z: Math.cos(yaw) };
  }
  return { x: view.x / length, z: view.z / length };
}

function distanceSquared(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}
