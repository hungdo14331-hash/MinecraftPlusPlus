import type { Entity, ItemStack, Player } from "@minecraft/server";

/** Cluster moi (v0.3.2): 1 hieu ung ap len ATTACKER khi don trung "du charge" (canTriggerOnHit=true). */
export interface OnHitEffectDefinition {
  /** Hien tai chi ho tro "self_speed" — buff toc do chay cho attacker. Mo rong sau neu can. */
  type: "self_speed";
  /** Amplifier theo chuan Minecraft: 0 = cap I, 1 = cap II, 2 = cap III... */
  amplifier: number;
  durationTicks: number;
}

export interface WeaponStats {
  /** Damage goc cua vu khi tinh theo thang MC++ (da x HEALTH_SCALE). Dung de tinh bonus xuyen giap. */
  attackDamageMcpp?: number;
  /** So tick toi thieu giua 2 don de duoc 100% damage + kich hoat trigger phu. */
  attackSpeed?: number;
  /** 0..1 — xac suat crit MC++ doc lap voi crit vanilla. */
  criticalChance?: number;
  /** He so crit MC++ rieng cua vu khi nay (mac dinh CombatConstants.DEFAULT_CRIT_MULTIPLIER neu bo trong). */
  criticalDamage?: number;
  /** 0..CombatConstants.ARMOR_PENETRATION_CAP */
  armorPenetration?: number;
  /** Do manh knockback CONG THEM vao vanilla (Cluster 3). */
  knockback?: number;
}

export interface WeaponDefinition {
  /** Id noi bo MC++, phai khop ^mcpp:[a-z0-9_]+$ */
  id: string;
  /** typeId item vanilla/custom ma dinh nghia nay ap dung (dung de lookup trong WeaponRegistry). */
  itemTypeId: string;
  stats: WeaponStats;
  abilities?: string[];
  /** Cluster moi (v0.3.2): danh sach hieu ung tu-kich-hoat len nguoi danh khi don trung du charge. */
  onHitEffects?: OnHitEffectDefinition[];
}

export interface AbilityDefinition {
  id: string;
}

export interface EnchantDefinition {
  id: string;
  maxLevel: number;
  conflicts?: string[];
}

export interface CurrencyDefinition {
  id: string;
}

export interface StructureDefinition {
  id: string;
}

export interface InternalEffectMeta {
  sourceId: string;
  effectId: string;
  rootEventId: string;
}

export interface CombatContext {
  attacker: Entity;
  target: Entity;
  weapon: ItemStack | undefined;
  damageSource: string;
  baseDamageMcpp: number;
  bonusDamageMcpp: number;
  finalDamageMcpp: number;
  actualDamageMcpp: number;
  critical: boolean;
  criticalMultiplier: number;
  armor: number;
  armorPenetration: number;
  damageType: string;
  lifeStealPercent: number;
  lifeStealFlatMcpp: number;
  healingReduction: number;
  attackSpeedRatio: number;
  canTriggerOnHit: boolean;
  isPvp: boolean;
  tags: Set<string>;
  flags: Record<string, unknown>;
  triggeredAbilities: string[];
  triggeredEnchantments: string[];
  internalEffect: InternalEffectMeta;
}

export interface HpSnapshot {
  currentVanilla: number;
  maxVanilla: number;
}
