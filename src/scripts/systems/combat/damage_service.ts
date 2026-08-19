import { Player, type Entity, type ItemStack } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { log } from "../../core/utils/logger";
import { readHp } from "../health/health_service";
import { toMcpp, toVanilla } from "../health/health_scaler";
import { readMainhand } from "../../core/api/inventory_adapter";
import { resolveWeaponDefinition } from "../weapons/weapon_lookup";
import { createCombatContext } from "./combat_context";
import { applySlothToRequiredTicks, resolveAttackSpeed } from "./attack_speed_service";
import { resolveCritical } from "./critical_service";
import { computeArmorPenBonus } from "./defense_service";
import { scalePvpBonus } from "../../core/math/damage_math";
import { applyBonusKnockback } from "./knockback_service";
import { applyOnHitEffects } from "./on_hit_effect_service";
import { TaskQueue } from "../../core/scheduler/task_queue";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";
import { CombatConstants } from "../../core/config/combat_constants";
import { wasHitParried } from "./parry_service";
import { masteryBonus } from "../mastery/mastery_modifiers";
import { hasActiveMasteryReward } from "../mastery/mastery_reward_service";
import { isSwordItem } from "../../core/utils/item_types";
import { consumeFastHit } from "./fast_hit_guard";
import { consumeSweepHit, INTERCEPTED_WEAPONS } from "./swing_pass";
import { pushHudNotification } from "../targeting/hud_notification_service";
import type { WeaponDefinition } from "../../core/types";

const SCOPE_CAUSES = new Set(["entityAttack", "projectile"]);

/**
 * Nhip danh bat buoc (tick) cua mot don — dung chung boi pipeline nay va
 * SwingStrikeService (kiem tra cong 1 lan tai thoi diem strike cua cu vung).
 */
export function computeRequiredTicks(
  attacker: Entity,
  weapon: ItemStack | undefined,
  weaponDef: WeaponDefinition | undefined
): number | undefined {
  const isSword = isSwordItem(weapon);
  let baseRequiredTicks = isSword
    ? weaponDef?.stats.attackSpeed ?? CombatConstants.BASELINE_ATTACK_SPEED_TICKS
    : weaponDef?.stats.attackSpeed;
  if(weapon?.typeId==="mcpp:chronoblade"&&!hasActiveMasteryReward(attacker as Player,"dexterity"))baseRequiredTicks=20;
  const slothLevel = isSword ? getCustomEnchantLevel(weapon, "mcpp:sloth") : 0;
  const dexterityBonus = attacker instanceof Player ? masteryBonus(attacker, "dexterity") : 0;
  return baseRequiredTicks === undefined
    ? undefined
    : applySlothToRequiredTicks(baseRequiredTicks, slothLevel, dexterityBonus);
}

export function initDamageService(): void {
  EventBus.on(Events.Combat.HurtBefore, (ev) => {
    try {
      handleHurtBefore(ev);
    } catch (e) {
      log.error("DamageService loi:", e);
    }
  });
}

function handleHurtBefore(ev: any): void {
  if (!SCOPE_CAUSES.has(ev.damageSource.cause)) return;
  const attacker = ev.damageSource.damagingEntity;
  if (!attacker) return;
  const target = ev.hurtEntity;
  // Đòn nhanh đã tự tính damage; vẫn để event tiếp tục để giáp, Parry và các enchant after-hit hoạt động.
  if(consumeFastHit(attacker,target))return;

  const hpBefore = readHp(target);
  if (!hpBefore) return;

  const weapon = attacker instanceof Player ? readMainhand(attacker) : undefined;
  const weaponDef = resolveWeaponDefinition(weapon);

  // VU KHI DAC BIET: don melee vanilla giang NGAY LUC CLICK — som hon khoanh khac
  // luoi vu khi thuc su quet toi trong animation. Voi 10 vu khi mcpp, don tuc thoi
  // nay bi chan hoan toan; SwingStrikeService se tu giang don theo dung nhip
  // animation (co tre + vung quet truoc mat) va cap sweep pass cho don do.
  const sweepHit =
    weapon && INTERCEPTED_WEAPONS.has(weapon.typeId) ? consumeSweepHit(attacker, target) : false;
  if (
    weapon &&
    INTERCEPTED_WEAPONS.has(weapon.typeId) &&
    !sweepHit &&
    ev.damageSource.cause === "entityAttack"
  ) {
    ev.damage = 0;
    try {
      (ev as any).cancel = true;
    } catch {
      // ev.damage = 0 da du de target khong mat mau.
    }
    return;
  }

  // CONG CUNG (hard gate) — thay the hoan toan co che thuong/phat theo ty le cu.
  // Du click nhanh den dau, chi 1 don duoc tinh la "that" moi weaponDef.stats.attackSpeed
  // tick. Don toi qua som bi CHAN HOAN TOAN: khong damage, khong bonus, khong hieu ung,
  // khong knockback — dung y nguoi dung yeu cau ("chi nhan 1 don moi ~0.75s hoac tam do").
  // Don sweep da qua cong tai thoi diem strike (SwingStrikeService) — khong kiem tra lai
  // de tranh danh dau tick 2 lan.
  const isSword = isSwordItem(weapon);
  const requiredTicks = computeRequiredTicks(attacker, weapon, weaponDef);
  const speedGate = sweepHit ? { allowed: true } : resolveAttackSpeed(attacker, requiredTicks);
  if (!speedGate.allowed) {
    ev.damage = 0;
    try {
      // Neu API nay ho tro huy hoan toan event (khong chi ve damage), dung luon cho sach —
      // boc try/catch vi khong chac chan field nay ton tai o moi phien ban @minecraft/server.
      (ev as any).cancel = true;
    } catch {
      // khong sao — ev.damage = 0 da du de target khong mat mau.
    }
    return;
  }

  const observedDamageMcpp = toMcpp(ev.damage);
  const ctx = createCombatContext(attacker, target, weapon, ev.damageSource.cause, observedDamageMcpp);

  const criticalLevel = isSword ? getCustomEnchantLevel(weapon, "mcpp:critical") : 0;
  const precisionBonus = attacker instanceof Player ? masteryBonus(attacker, "precision")+(hasActiveMasteryReward(attacker,"precision")?0.05:0) : 0;
  const criticalChance = Math.min(0.6, (criticalLevel > 0
    ? 0.05 + criticalLevel * 0.05
    : weaponDef?.stats.criticalChance ?? 0) + precisionBonus);
  const critRes = resolveCritical(attacker, criticalChance, weaponDef?.stats.criticalDamage);
  ctx.critical = critRes.critical;
  ctx.criticalMultiplier = critRes.multiplier;
  if(critRes.critical&&attacker instanceof Player&&hasActiveMasteryReward(attacker,"precision")){
    pushHudNotification(attacker,"§b◉ Mắt Thần Thợ Săn — Chí mạng!",30,2);
  }

  const critBonusRaw = observedDamageMcpp * (critRes.multiplier - 1);
  const critBonusScaled = scalePvpBonus(critBonusRaw, ctx.isPvp);

  const armorPenBonusRaw = computeArmorPenBonus(
    observedDamageMcpp,
    weaponDef?.stats.attackDamageMcpp,
    weaponDef?.stats.armorPenetration
  );
  const armorPenBonusScaled = scalePvpBonus(armorPenBonusRaw, ctx.isPvp);

  ctx.armorPenetration = weaponDef?.stats.armorPenetration ?? 0;
  ctx.bonusDamageMcpp = critBonusScaled + armorPenBonusScaled;

  // Khong con nhan ty le toc danh nua — cong da xu ly viec do o tren. Don da qua cong
  // luon la 100% damage + bonus day du.
  const strengthBonus = attacker instanceof Player ? masteryBonus(attacker, "strength") : 0;
  ctx.finalDamageMcpp = (observedDamageMcpp + ctx.bonusDamageMcpp) * (1 + strengthBonus);
  ctx.actualDamageMcpp = Math.min(ctx.finalDamageMcpp, toMcpp(hpBefore.currentVanilla));

  ev.damage = toVanilla(ctx.finalDamageMcpp);

  EventBus.emit(Events.Combat.ValidHit,{attacker,target,weapon,damage:ev.damage,context:ctx});

  TaskQueue.defer(() => {
    if (wasHitParried(attacker, target)) return;
    applyBonusKnockback(attacker, target, weaponDef?.stats.knockback);
  });

  if (weaponDef?.onHitEffects && weaponDef.onHitEffects.length > 0) {
    TaskQueue.defer(() => {
      if (wasHitParried(attacker, target)) return;
      applyOnHitEffects(attacker, weapon, weaponDef.onHitEffects);
    });
  }
}
