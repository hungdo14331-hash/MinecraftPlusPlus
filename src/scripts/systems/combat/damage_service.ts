import { Player } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { log } from "../../core/utils/logger";
import { readHp } from "../health/health_service";
import { toMcpp, toVanilla } from "../health/health_scaler";
import { readMainhand } from "../../core/api/inventory_adapter";
import { resolveWeaponDefinition } from "../weapons/weapon_lookup";
import { createCombatContext } from "./combat_context";
import { resolveAttackSpeed } from "./attack_speed_service";
import { resolveCritical } from "./critical_service";
import { computeArmorPenBonus } from "./defense_service";
import { scalePvpBonus } from "../../core/math/damage_math";
import { applyBonusKnockback } from "./knockback_service";
import { applyOnHitEffects } from "./on_hit_effect_service";
import { TaskQueue } from "../../core/scheduler/task_queue";

const SCOPE_CAUSES = new Set(["entityAttack", "projectile"]);

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

  const hpBefore = readHp(target);
  if (!hpBefore) return;

  const observedDamageMcpp = toMcpp(ev.damage);
  const weapon = attacker instanceof Player ? readMainhand(attacker) : undefined;
  const weaponDef = resolveWeaponDefinition(weapon);

  const ctx = createCombatContext(attacker, target, weapon, ev.damageSource.cause, observedDamageMcpp);

  const speedRes = resolveAttackSpeed(attacker, weaponDef?.stats.attackSpeed);
  ctx.attackSpeedRatio = speedRes.ratio;
  ctx.canTriggerOnHit = speedRes.canTrigger;

  const critRes = resolveCritical(attacker, weaponDef?.stats.criticalChance, weaponDef?.stats.criticalDamage);
  ctx.critical = critRes.critical;
  ctx.criticalMultiplier = critRes.multiplier;

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

  const combinedBeforeSpeed = observedDamageMcpp + ctx.bonusDamageMcpp;
  ctx.finalDamageMcpp = combinedBeforeSpeed * ctx.attackSpeedRatio;
  ctx.actualDamageMcpp = Math.min(ctx.finalDamageMcpp, toMcpp(hpBefore.currentVanilla));

  ev.damage = toVanilla(ctx.finalDamageMcpp);

  TaskQueue.defer(() => {
    applyBonusKnockback(attacker, target, weaponDef?.stats.knockback);
  });

  // Cluster moi (v0.3.2): hieu ung tu-kich-hoat len ATTACKER (vd Speed khi danh trung),
  // chi ban khi don du "charge" — dung nguyen tac voi quyet dinh #3 da chot (khong kich
  // hoat trigger phu neu chua du charge toc danh).
  if (ctx.canTriggerOnHit && weaponDef?.onHitEffects && weaponDef.onHitEffects.length > 0) {
    TaskQueue.defer(() => {
      applyOnHitEffects(attacker, weaponDef.onHitEffects);
    });
  }
}
