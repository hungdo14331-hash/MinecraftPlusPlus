import {
  EntityComponentTypes,
  EntityDamageCause,
  EntitySwingSource,
  system,
  world,
  type Entity,
  type Player,
  type Vector3,
} from "@minecraft/server";
import { TickScheduler } from "../../core/scheduler/tick_scheduler";
import { log } from "../../core/utils/logger";
import { applyMovementLock } from "../combat/frostbite_service";
import { applyBonusKnockback } from "../combat/knockback_service";
import { cancelParryWindow } from "../combat/parry_service";
import { applyTrueDamage } from "../combat/true_damage_service";
import { hasActiveMasteryReward } from "../mastery/mastery_reward_service";
import { pushHudNotification } from "../targeting/hud_notification_service";

interface ActiveSkillDefinition {
  name: string;
  cooldownTicks: number;
}

const ACTIVE_SKILLS = {
  "mcpp:conqueror_greatsword": { name: "Vương Trảm", cooldownTicks: 240 },
  "mcpp:chronoblade": { name: "Thời Giới", cooldownTicks: 360 },
  "mcpp:arcane_spear": { name: "Nhất Tuyến Xuyên Tinh", cooldownTicks: 180 },
  "mcpp:frost_hammer": { name: "Đại Chấn Vĩnh Đông", cooldownTicks: 280 },
  "mcpp:shadow_dagger": { name: "Ảnh Kích", cooldownTicks: 180 },
  "mcpp:runeblade": { name: "Ấn Rune Bộc Phá", cooldownTicks: 220 },
  "mcpp:titan_maul": { name: "Thiên Chùy Giáng Thế", cooldownTicks: 320 },
  "mcpp:gale_glaive": { name: "Cuồng Phong Luân Vũ", cooldownTicks: 200 },
  "mcpp:ember_cleaver": { name: "Liệt Hỏa Trảm", cooldownTicks: 260 },
  "mcpp:void_reaper": { name: "Nguyệt Thực Linh Hồn", cooldownTicks: 360 },
} satisfies Record<string, ActiveSkillDefinition>;

type ActiveWeaponId = keyof typeof ACTIVE_SKILLS;

const BOSSES = new Set(["minecraft:warden", "minecraft:wither", "minecraft:ender_dragon"]);
const NEVER_TARGET = new Set([
  "minecraft:item",
  "minecraft:xp_orb",
  "minecraft:armor_stand",
  "minecraft:painting",
  "minecraft:boat",
  "minecraft:chest_boat",
  "minecraft:minecart",
]);
const GLOBAL_SKILL_LOCK_TICKS = 20;
const REQUIRED_MASTERY: Partial<Record<ActiveWeaponId, string>> = {
  "mcpp:conqueror_greatsword": "strength",
  "mcpp:chronoblade": "dexterity",
};

const skillReadyAt = new Map<string, number>();
const globalReadyAt = new Map<string, number>();
const chronoCharges = new Map<string, { charges: number; expiresAt: number }>();
const runeMarks = new Map<string, number>();
const conqueredMarks = new Map<string, number>();

export function initActiveWeaponSkillService(): void {
  world.afterEvents.playerSwingStart.subscribe((event) => {
    try {
      if (event.swingSource !== EntitySwingSource.Attack || !event.player.isSneaking) return;
      const weaponId = event.heldItemStack?.typeId;
      if (!weaponId || !isActiveWeapon(weaponId)) return;
      tryActivate(event.player, weaponId);
    } catch (error) {
      log.error("ActiveWeaponSkillService loi:", error);
    }
  });

  TickScheduler.every("active_weapon_skill_cleanup", 100, cleanupExpiredState);
}

function isActiveWeapon(id: string): id is ActiveWeaponId {
  return Object.prototype.hasOwnProperty.call(ACTIVE_SKILLS, id);
}

function tryActivate(player: Player, weaponId: ActiveWeaponId): void {
  const now = system.currentTick;
  const requiredMastery = REQUIRED_MASTERY[weaponId];
  if (requiredMastery && !hasActiveMasteryReward(player, requiredMastery)) {
    pushHudNotification(player, "§cSức mạnh của vũ khí đã ngủ yên — cần phục hồi Tinh Thông tương ứng.", 35, 3);
    return;
  }
  const globalRemaining = (globalReadyAt.get(player.id) ?? 0) - now;
  if (globalRemaining > 0) {
    pushHudNotification(player, "§8Kỹ năng đang lấy lại thăng bằng...", 15, 1);
    return;
  }

  const key = `${player.id}:${weaponId}`;
  const remaining = (skillReadyAt.get(key) ?? 0) - now;
  if (remaining > 0) {
    pushHudNotification(player, `§8${ACTIVE_SKILLS[weaponId].name}: §f${formatSeconds(remaining)}s`, 20, 2);
    return;
  }

  skillReadyAt.set(key, now + ACTIVE_SKILLS[weaponId].cooldownTicks);
  globalReadyAt.set(player.id, now + GLOBAL_SKILL_LOCK_TICKS);
  cancelParryWindow(player);
  activate(player, weaponId);
}

function activate(player: Player, weaponId: ActiveWeaponId): void {
  switch (weaponId) {
    case "mcpp:conqueror_greatsword": return kingSlash(player);
    case "mcpp:chronoblade": return timeDomain(player);
    case "mcpp:arcane_spear": return stellarPierce(player);
    case "mcpp:frost_hammer": return eternalFrostSlam(player);
    case "mcpp:shadow_dagger": return shadowStrike(player);
    case "mcpp:runeblade": return runeDetonation(player);
    case "mcpp:titan_maul": return titanFall(player);
    case "mcpp:gale_glaive": return galeDance(player);
    case "mcpp:ember_cleaver": return flameCleave(player);
    case "mcpp:void_reaper": return soulEclipse(player);
  }
}

function kingSlash(player: Player): void {
  const targets = coneTargets(player, 4.5, 0.5, 6);
  const hitTargets: Entity[] = [];
  for (const target of targets) {
    if (!dealDamage(target, player, 9, EntityDamageCause.magic)) continue;
    applyBonusKnockback(player, target, 0.6);
    conqueredMarks.set(markKey(player, target), system.currentTick + 60);
    hitTargets.push(target);
  }
  finishSkill(player, "§6⚔ VƯƠNG TRẢM", hitTargets, "mob.warden.sonic_boom", 1.25);
}

function timeDomain(player: Player): void {
  const targets = radialTargets(player, player.location, 5, 8);
  const affectedTargets: Entity[] = [];
  try { player.addEffect("speed", 80, { amplifier: 1, showParticles: false }); } catch { /* optional */ }
  chronoCharges.set(player.id, { charges: 3, expiresAt: system.currentTick + 80 });
  for (const target of targets) if (applyEffect(target, "slowness", 60, 1)) affectedTargets.push(target);
  finishSkill(player, "§d⌛ THỜI GIỚI §f• 3 nhịp cường hóa", affectedTargets, "random.levelup", 0.65, "minecraft:basic_portal_particle");
}

function stellarPierce(player: Player): void {
  const targets = lineTargets(player, 7, 0.9, 4);
  const hitTargets: Entity[] = [];
  for (const target of targets) {
    const baseHit = dealDamage(target, player, 6, EntityDamageCause.magic);
    const trueHit = applyTrueDamage(target, player, pvpDamage(target, 2));
    if (!baseHit && !trueHit) continue;
    applyBonusKnockback(player, target, 0.35);
    hitTargets.push(target);
  }
  finishSkill(player, "§b✦ NHẤT TUYẾN XUYÊN TINH", hitTargets, "random.orb", 1.5);
}

function eternalFrostSlam(player: Player): void {
  const center = forwardPoint(player, 2.25);
  const targets = radialTargets(player, center, 4, 7);
  const hitTargets: Entity[] = [];
  for (const target of targets) {
    const nearCenter = distanceSquared(target.location, center) <= 4;
    if (!dealDamage(target, player, 6, EntityDamageCause.magic)) continue;
    applyEffect(target, "slowness", 60, 1);
    if (target.typeId !== "minecraft:player" && !BOSSES.has(target.typeId) && nearCenter) {
      applyMovementLock(target, 15, true);
    }
    hitTargets.push(target);
  }
  spawnParticle(player, "minecraft:huge_explosion_emitter", center);
  finishSkill(player, "§3❄ ĐẠI CHẤN VĨNH ĐÔNG", hitTargets, "random.glass", 0.6);
}

function shadowStrike(player: Player): void {
  const direction = horizontalView(player);
  const target = lineTargets(player, 4, 1, 1)[0];
  try { player.applyImpulse({ x: direction.x * 0.9, y: 0.04, z: direction.z * 0.9 }); } catch { /* unusual movement state */ }
  try { player.addEffect("speed", 40, { amplifier: 1, showParticles: false }); } catch { /* optional */ }
  try { player.addEffect("invisibility", 12, { amplifier: 0, showParticles: false }); } catch { /* optional */ }
  const hit = !!target && applyTrueDamage(target, player, pvpDamage(target, 6));
  finishSkill(player, "§5◆ ẢNH KÍCH", hit && target ? [target] : [], "mob.endermen.portal", 1.4, "minecraft:basic_portal_particle");
}

function runeDetonation(player: Player): void {
  const direction = horizontalView(player);
  const candidates = queryTargets(player, player.location, 6);
  const primary = [...candidates]
    .filter((target) => forwardDot(player.location, target.location, direction) > 0.25)
    .sort((a, b) => distanceSquared(a.location, player.location) - distanceSquared(b.location, player.location))[0];
  const center = primary?.location ?? forwardPoint(player, 3);
  const targets = candidates
    .filter((target) => distanceSquared(target.location, center) <= 3.5 * 3.5)
    .sort((a, b) => distanceSquared(a.location, center) - distanceSquared(b.location, center))
    .slice(0, 5);
  const hitTargets: Entity[] = [];
  for (const target of targets) {
    if (!dealDamage(target, player, 5, EntityDamageCause.magic)) continue;
    runeMarks.set(markKey(player, target), system.currentTick + 160);
    hitTargets.push(target);
  }
  spawnParticle(player, "minecraft:totem_particle", center);
  finishSkill(player, "§9ᚱ ẤN RUNE BỘC PHÁ", hitTargets, "random.orb", 0.8);
}

function titanFall(player: Player): void {
  const center = forwardPoint(player, 3);
  const targets = radialTargets(player, center, 4.5, 8);
  const hitTargets: Entity[] = [];
  for (const target of targets) {
    if (!dealDamage(target, player, 8, EntityDamageCause.entityExplosion)) continue;
    applyBonusKnockback(player, target, 1.6);
    applyEffect(target, "weakness", 50, 0);
    hitTargets.push(target);
  }
  spawnParticle(player, "minecraft:huge_explosion_emitter", center);
  finishSkill(player, "§6◆ THIÊN CHÙY GIÁNG THẾ", hitTargets, "random.explode", 0.65);
}

function galeDance(player: Player): void {
  const targets = radialTargets(player, player.location, 4, 8);
  const hitTargets: Entity[] = [];
  try { player.addEffect("speed", 60, { amplifier: 2, showParticles: false }); } catch { /* optional */ }
  for (const target of targets) {
    if (!dealDamage(target, player, 5, EntityDamageCause.magic)) continue;
    applyBonusKnockback(player, target, 1);
    hitTargets.push(target);
  }
  finishSkill(player, "§b➤ CUỒNG PHONG LUÂN VŨ", hitTargets, "random.orb", 1.7, "minecraft:totem_particle");
}

function flameCleave(player: Player): void {
  const targets = coneTargets(player, 6, 0.82, 6);
  const hitTargets: Entity[] = [];
  for (const target of targets) {
    let burning = false;
    try { burning = target.hasComponent("minecraft:onfire"); } catch { /* optional */ }
    if (!dealDamage(target, player, burning ? 10 : 8, EntityDamageCause.fire)) continue;
    try { (target as any).setOnFire?.(5, true); } catch { /* optional */ }
    hitTargets.push(target);
  }
  finishSkill(player, "§c🔥 LIỆT HỎA TRẢM", hitTargets, "mob.blaze.shoot", 0.75, "minecraft:basic_flame_particle");
}

function soulEclipse(player: Player): void {
  const targets = coneTargets(player, 5, 0.34, 6);
  const hitTargets: Entity[] = [];
  let healing = 0;
  for (const target of targets) {
    let lowHealth = false;
    try {
      const health = target.getComponent(EntityComponentTypes.Health);
      lowHealth = !!health && health.currentValue <= health.effectiveMax * 0.3;
    } catch { /* target may disappear between query and hit */ }
    if (!dealDamage(target, player, 7, EntityDamageCause.magic)) continue;
    hitTargets.push(target);
    if (lowHealth) {
      const bonus = BOSSES.has(target.typeId) ? 1.5 : 3;
      if (applyTrueDamage(target, player, pvpDamage(target, bonus))) healing = Math.min(6, healing + 2);
    }
    if (target.typeId !== "minecraft:player" && !BOSSES.has(target.typeId)) pullToward(player, target, 0.75);
  }
  if (healing > 0) heal(player, healing);
  finishSkill(player, `§5☽ NGUYỆT THỰC LINH HỒN${healing > 0 ? ` §a+${healing} HP` : ""}`, hitTargets, "mob.endermen.portal", 0.55, "minecraft:basic_portal_particle");
}

export function hasChronoCharge(player: Player): boolean {
  const state = chronoCharges.get(player.id);
  if (!state || state.expiresAt < system.currentTick || state.charges <= 0) {
    chronoCharges.delete(player.id);
    return false;
  }
  return true;
}

export function consumeChronoCharge(player: Player): boolean {
  if (!hasChronoCharge(player)) return false;
  const state = chronoCharges.get(player.id)!;
  state.charges--;
  if (state.charges <= 0) chronoCharges.delete(player.id);
  return true;
}

export function consumeRuneMark(player: Player, target: Entity): boolean {
  return consumeMark(runeMarks, markKey(player, target));
}

export function consumeConqueredMark(player: Player, target: Entity): boolean {
  return consumeMark(conqueredMarks, markKey(player, target));
}

function markKey(player: Player, target: Entity): string {
  return `${player.id}:${target.id}`;
}

function consumeMark(map: Map<string, number>, id: string): boolean {
  const expiresAt = map.get(id) ?? 0;
  map.delete(id);
  return expiresAt >= system.currentTick;
}

function queryTargets(player: Player, center: Vector3, radius: number): Entity[] {
  return player.dimension.getEntities({ location: center, maxDistance: radius }).filter((entity) => isSkillTarget(entity, player));
}

function radialTargets(player: Player, center: Vector3, radius: number, cap: number): Entity[] {
  return queryTargets(player, center, radius)
    .sort((a, b) => distanceSquared(a.location, center) - distanceSquared(b.location, center))
    .slice(0, cap);
}

function coneTargets(player: Player, range: number, minimumDot: number, cap: number): Entity[] {
  const origin = player.location;
  const direction = horizontalView(player);
  return queryTargets(player, origin, range)
    .filter((target) => forwardDot(origin, target.location, direction) >= minimumDot)
    .sort((a, b) => distanceSquared(a.location, origin) - distanceSquared(b.location, origin))
    .slice(0, cap);
}

function lineTargets(player: Player, range: number, width: number, cap: number): Entity[] {
  const origin = player.location;
  const direction = horizontalView(player);
  return queryTargets(player, origin, range + width)
    .map((target) => {
      const dx = target.location.x - origin.x;
      const dz = target.location.z - origin.z;
      const forward = dx * direction.x + dz * direction.z;
      const lateralSquared = Math.max(0, dx * dx + dz * dz - forward * forward);
      return { target, forward, lateralSquared };
    })
    .filter((entry) => entry.forward >= 0 && entry.forward <= range && entry.lateralSquared <= width * width)
    .sort((a, b) => a.forward - b.forward)
    .slice(0, cap)
    .map((entry) => entry.target);
}

function isSkillTarget(entity: Entity, player: Player): boolean {
  if (!entity.isValid || entity.id === player.id || NEVER_TARGET.has(entity.typeId) || entity.typeId.startsWith("mcpp:arcane_")) return false;
  if (entity.typeId === "minecraft:player" && !world.gameRules.pvp) return false;
  try {
    const health = entity.getComponent(EntityComponentTypes.Health);
    return !!health && health.currentValue > 0;
  } catch { return false; }
}

function dealDamage(target: Entity, player: Player, damage: number, cause: EntityDamageCause): boolean {
  if (!target.isValid || !Number.isFinite(damage) || damage <= 0) return false;
  try {
    return target.applyDamage(pvpDamage(target, damage), { cause, damagingEntity: player });
  } catch {
    return false;
  }
}

function pvpDamage(target: Entity, damage: number): number {
  return target.typeId === "minecraft:player" ? damage * 0.5 : damage;
}

function applyEffect(target: Entity, effect: string, duration: number, amplifier: number): boolean {
  try {
    target.addEffect(effect, target.typeId === "minecraft:player" ? Math.max(1, Math.floor(duration * 0.5)) : duration, {
      amplifier,
      showParticles: false,
    });
    return true;
  } catch { return false; }
}

function heal(player: Player, amount: number): void {
  try {
    const health = player.getComponent(EntityComponentTypes.Health);
    health?.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + amount));
  } catch { /* player became invalid */ }
}

function pullToward(player: Player, target: Entity, strength: number): void {
  try {
    const dx = player.location.x - target.location.x;
    const dz = player.location.z - target.location.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    target.applyKnockback({ x: (dx / length) * strength, z: (dz / length) * strength }, 0.08);
  } catch { /* knockback-resistant target */ }
}

function finishSkill(
  player: Player,
  message: string,
  targets: Entity[],
  sound: string,
  pitch: number,
  mainParticle = "minecraft:critical_hit_emitter",
): void {
  pushHudNotification(player, `${message} §8• §f${targets.length} mục tiêu`, 45, 4);
  try { player.playSound(sound, { volume: 0.75, pitch }); } catch { /* optional */ }
  spawnParticle(player, mainParticle, { x: player.location.x, y: player.location.y + 1, z: player.location.z });
  for (const target of targets.slice(0, 6)) {
    try {
      if (!target.isValid) continue;
      const location = target.location;
      spawnParticle(player, "minecraft:critical_hit_emitter", { x: location.x, y: location.y + 0.8, z: location.z });
    } catch { /* target died from the skill */ }
  }
}

function spawnParticle(player: Player, particle: string, location: Vector3): void {
  try { player.dimension.spawnParticle(particle, location); } catch { /* optional visual */ }
}

function horizontalView(player: Player): { x: number; z: number } {
  const view = player.getViewDirection();
  const length = Math.hypot(view.x, view.z);
  if (length < 0.001) {
    const yaw = player.getRotation().y * Math.PI / 180;
    return { x: -Math.sin(yaw), z: Math.cos(yaw) };
  }
  return { x: view.x / length, z: view.z / length };
}

function forwardPoint(player: Player, distance: number): Vector3 {
  const direction = horizontalView(player);
  return {
    x: player.location.x + direction.x * distance,
    y: player.location.y + 0.25,
    z: player.location.z + direction.z * distance,
  };
}

function forwardDot(origin: Vector3, target: Vector3, direction: { x: number; z: number }): number {
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const length = Math.max(0.001, Math.hypot(dx, dz));
  return (dx * direction.x + dz * direction.z) / length;
}

function distanceSquared(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function formatSeconds(ticks: number): string {
  return (Math.ceil(ticks / 2) / 10).toFixed(1);
}

function cleanupExpiredState(): void {
  const now = system.currentTick;
  for (const [key, readyAt] of skillReadyAt) if (readyAt <= now) skillReadyAt.delete(key);
  for (const [key, readyAt] of globalReadyAt) if (readyAt <= now) globalReadyAt.delete(key);
  for (const [key, state] of chronoCharges) if (state.expiresAt <= now || state.charges <= 0) chronoCharges.delete(key);
  for (const [key, expiresAt] of runeMarks) if (expiresAt <= now) runeMarks.delete(key);
  for (const [key, expiresAt] of conqueredMarks) if (expiresAt <= now) conqueredMarks.delete(key);
}
