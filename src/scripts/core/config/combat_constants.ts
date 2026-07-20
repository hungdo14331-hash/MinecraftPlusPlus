export const CombatConstants = {
  /** Cluster 2: tran xuyen giap toan cuc — 100% la True Damage rieng, khong duoc dat penetration >= day. */
  ARMOR_PENETRATION_CAP: 0.8,
  /** Cluster 2: he so crit MC++ mac dinh khi vu khi khong tu khai bao criticalDamage rieng. */
  DEFAULT_CRIT_MULTIPLIER: 1.825,
  /** Cluster 2: he so phu KHI crit vanilla (nhay chem) VA crit MC++ cung trung 1 don. Co dinh, khong theo tung vu khi. */
  DOUBLE_CRIT_SECONDARY_MULTIPLIER: 1.4,
  /** Cluster 3(2b)/C2: san toi thieu ty le damage khi don den truoc khi du cooldown toc danh. */
  ATTACK_SPEED_MIN_RATIO: 0.2,
  /** Cluster 4: he so giam moi BONUS (khong phai base damage) khi target la nguoi choi khac. */
  PVP_BONUS_MULTIPLIER: 0.6,
  /** Cluster 7: Anti-Heal la debuff CO THOI HAN co dinh (khong theo cap). */
  ANTI_HEAL_DURATION_TICKS: 60, // 3 giay x 20 tick/giay
  /**
   * Cluster moi (v0.3.2): moc THAM CHIEU cho attackSpeed (tick toi thieu giua 2 don de
   * duoc full damage + kich hoat trigger phu). Vu khi "thuong" nen dat gan moc nay.
   * Vu khi "nhanh hon" dat thap hon moc nay — CHI co y nghia SO SANH TUONG DOI giua cac
   * vu khi MC++ voi nhau, khong doi toc vung vat ly that cua Bedrock (Bedrock von khong
   * co attack cooldown nhu Java). Neu mot vu khi khong duoc dang ky trong WeaponRegistry,
   * no hoan toan khong bi anh huong boi he thong nay (xem resolveAttackSpeedRatio).
   */
  BASELINE_ATTACK_SPEED_TICKS: 13,
} as const;

export const AntiHealLevels: Record<1 | 2 | 3, { pve: number; pvp: number }> = {
  1: { pve: 0.35, pvp: 0.21 },
  2: { pve: 0.7, pvp: 0.42 },
  3: { pve: 1.0, pvp: 0.6 },
};
