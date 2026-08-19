import { EntityDamageCause, Player, type Entity } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { TaskQueue } from "../../core/scheduler/task_queue";
import { log } from "../../core/utils/logger";
import { isSwordItem } from "../../core/utils/item_types";
import { applyBonusKnockback } from "./knockback_service";
import { INTERCEPTED_WEAPONS } from "./swing_pass";
import { isMeleeTarget } from "../weapons/swing_strike_service";

// "Java sweep" cho KIEM VANILLA (lay cam hung tu co che Sweeping Edge cua Java 1.9;
// code viet moi, khong sao chep addon ngoai). Khi mot don kiem vanilla duoc chap nhan
// qua cong (ValidHit), cac muc tieu dung sat quanh NAN NHAN CHINH an them mot phan
// sat thuong nho + knockback nhe.
// 10 vu khi mcpp KHONG dung he thong nay — chung da co vung quet rieng theo animation
// (SwingStrikeService).

const SWEEP_RADIUS = 2.75;
const SWEEP_MAX_TARGETS = 3;
const SWEEP_DAMAGE_RATIO = 0.25; // phan tram sat thuong don chinh chuyen sang muc tieu phu
const SWEEP_MIN_DAMAGE = 1;
const SWEEP_KNOCKBACK = 0.4;

export function initSwordSweepService(): void {
  EventBus.on(Events.Combat.ValidHit, (ev: any) => {
    try {
      handleValidHit(ev);
    } catch (e) {
      log.error("SwordSweepService loi:", e);
    }
  });
}

function handleValidHit(ev: any): void {
  const attacker = ev.attacker;
  const primary = ev.target as Entity;
  const weapon = ev.weapon;
  if (!(attacker instanceof Player) || !primary?.isValid) return;
  if (!weapon || !isSwordItem(weapon) || INTERCEPTED_WEAPONS.has(weapon.typeId)) return;
  if (ev.context?.damageSource !== "entityAttack") return;

  const sweepDamage = Math.max(SWEEP_MIN_DAMAGE, Math.round((ev.damage ?? 0) * SWEEP_DAMAGE_RATIO));
  const primaryId = primary.id;
  const center = { ...primary.location };

  // ValidHit phat ra trong beforeEvents.entityHurt (read-only) — hoan sang tick ke tiep.
  TaskQueue.defer(() => {
    if (!attacker.isValid) return;
    let secondaries: Entity[];
    try {
      secondaries = attacker.dimension
        .getEntities({ location: center, maxDistance: SWEEP_RADIUS })
        .filter((entity) => entity.id !== primaryId && isMeleeTarget(entity, attacker))
        .slice(0, SWEEP_MAX_TARGETS);
    } catch {
      return; // dimension unload giua chung
    }
    for (const target of secondaries) {
      try {
        // cause magic: khong bi cong toc danh chan (cung pattern voi skill chu dong),
        // muc tieu phu chi an phan sat thuong lan nho.
        const applied = target.applyDamage(
          target.typeId === "minecraft:player" ? sweepDamage * 0.5 : sweepDamage,
          { cause: EntityDamageCause.magic, damagingEntity: attacker }
        );
        if (!applied) continue;
        applyBonusKnockback(attacker, target, SWEEP_KNOCKBACK);
        try {
          attacker.dimension.spawnParticle("minecraft:critical_hit_emitter", {
            x: target.location.x,
            y: target.location.y + 0.9,
            z: target.location.z,
          });
        } catch {
          // particle chi la trang tri
        }
      } catch {
        // muc tieu bien mat giua chung — bo qua
      }
    }
  });
}
