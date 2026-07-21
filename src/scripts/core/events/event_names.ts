export const Events = {
  Lifecycle: {
    Ready: "mcpp:lifecycle_ready",
    PlayerSpawn: "mcpp:player_spawn",
  },
  Combat: {
    Hit: "mcpp:combat_hit", // afterEvents.entityHitEntity
    HurtBefore: "mcpp:combat_hurt_before", // beforeEvents.entityHurt (neu co)
    Hurt: "mcpp:combat_hurt", // afterEvents.entityHurt
    ValidHit: "mcpp:combat_valid_hit", // don da qua cong toc danh va da tinh damage
    HealBefore: "mcpp:combat_heal_before", // beforeEvents.entityHeal (neu co)
    Death: "mcpp:combat_death", // afterEvents.entityDie
  },
  Currency: {
    BalanceChanged: "mcpp:currency_balance_changed",
  },
  World: {
    BreakBlock: "mcpp:block_break",
    ItemUse: "mcpp:item_use",
  },
};
