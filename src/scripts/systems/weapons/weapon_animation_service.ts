import { EntitySwingSource, world } from "@minecraft/server";
import { log } from "../../core/utils/logger";

const ANIMATION_BY_WEAPON: Record<string, string> = {
  "mcpp:conqueror_greatsword": "animation.mcpp.player.attack.greatsword",
  "mcpp:chronoblade": "animation.mcpp.player.attack.blade",
  "mcpp:arcane_spear": "animation.mcpp.player.attack.polearm",
  "mcpp:frost_hammer": "animation.mcpp.player.attack.hammer",
  "mcpp:shadow_dagger": "animation.mcpp.player.attack.dagger",
  "mcpp:runeblade": "animation.mcpp.player.attack.blade",
  "mcpp:titan_maul": "animation.mcpp.player.attack.hammer",
  "mcpp:gale_glaive": "animation.mcpp.player.attack.polearm",
  "mcpp:ember_cleaver": "animation.mcpp.player.attack.greatsword",
  "mcpp:void_reaper": "animation.mcpp.player.attack.scythe",
};
export function initWeaponAnimationService(): void {
  world.afterEvents.playerSwingStart.subscribe((event) => {
    if (event.swingSource !== EntitySwingSource.Attack) return;

    const animation = ANIMATION_BY_WEAPON[event.heldItemStack?.typeId ?? ""];
    if (!animation) return;

    try {
      event.player.playAnimation(animation, { blendOutTime: 0.12 });
    } catch (error) {
      log.debug("Weapon player animation loi:", error);
    }
  });
}
