import { AbilityRegistry } from "../../core/registry/registries";

export function register(): void {
  AbilityRegistry.register({ id:"mcpp:conqueror_cleave" });
  AbilityRegistry.register({ id:"mcpp:time_acceleration" });
  AbilityRegistry.register({ id:"mcpp:arcane_impale" });
  AbilityRegistry.register({ id:"mcpp:permafrost_slam" });
  AbilityRegistry.register({ id:"mcpp:shadowstep" });
  AbilityRegistry.register({ id:"mcpp:rune_echo" });
  AbilityRegistry.register({ id:"mcpp:seismic_impact" });
  AbilityRegistry.register({ id:"mcpp:windstep" });
  AbilityRegistry.register({ id:"mcpp:hellfire" });
  AbilityRegistry.register({ id:"mcpp:soul_harvest" });

  // Kỹ năng chủ động — kích hoạt bằng cúi + vung đúng vũ khí.
  AbilityRegistry.register({ id:"mcpp:king_slash" });
  AbilityRegistry.register({ id:"mcpp:time_domain" });
  AbilityRegistry.register({ id:"mcpp:stellar_pierce" });
  AbilityRegistry.register({ id:"mcpp:eternal_frost_slam" });
  AbilityRegistry.register({ id:"mcpp:shadow_strike" });
  AbilityRegistry.register({ id:"mcpp:rune_detonation" });
  AbilityRegistry.register({ id:"mcpp:titan_fall" });
  AbilityRegistry.register({ id:"mcpp:gale_dance" });
  AbilityRegistry.register({ id:"mcpp:flame_cleave" });
  AbilityRegistry.register({ id:"mcpp:soul_eclipse" });
}
