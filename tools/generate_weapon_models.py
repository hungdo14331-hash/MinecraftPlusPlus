"""Generate extruded pixel-art weapon geometries and Bedrock attachables."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TEXTURES = ROOT / "RP" / "textures" / "items"
MODEL_FILE = ROOT / "RP" / "models" / "entity" / "mcpp_weapons.geo.json"
ATTACHABLE_DIR = ROOT / "RP" / "attachables"
ANIMATION_FILE = ROOT / "RP" / "animations" / "mcpp_weapons.animation.json"

WEAPONS = {
    "conqueror_greatsword": "greatsword",
    "chronoblade": "blade",
    "arcane_spear": "polearm",
    "frost_hammer": "hammer",
    "shadow_dagger": "dagger",
    "runeblade": "blade",
    "titan_maul": "hammer",
    "gale_glaive": "polearm",
    "ember_cleaver": "greatsword",
    "void_reaper": "scythe",
}

# Half-pixel grip centers measured from each final 32x32 alpha mask. Keeping
# these per weapon is important: profile-wide guesses can miss a narrow shaft
# by several model units and make the item look detached from the hand.
GRIP = {
    "conqueror_greatsword": (5.5, 26.5),
    "chronoblade": (12.5, 24.5),
    "arcane_spear": (5.5, 27.5),
    "frost_hammer": (6.0, 26.5),
    "shadow_dagger": (5.5, 27.5),
    "runeblade": (5.0, 26.5),
    "titan_maul": (5.5, 26.5),
    "gale_glaive": (5.0, 26.5),
    "ember_cleaver": (4.5, 27.5),
    "void_reaper": (4.0, 27.5),
}

# Attachable geometry is evaluated in the holder's model space. Bedrock's
# binding path applies the conventional -24 Y model offset, so the semantic
# hand/grip pivot must stay at Y=24 (as in vanilla trident geometry).
HAND_PIVOT_Y = 24.0

WIELD_POSE = {
    "greatsword": {"fp_pos": [-6.5, -3.5, -2.5], "tp_pos": [0.3, -0.6, -1.2]},
    "blade": {"fp_pos": [-5.8, -3.0, -2.0], "tp_pos": [0.25, -0.5, -1.0]},
    "dagger": {"fp_pos": [-4.5, -2.7, -1.5], "tp_pos": [0.2, -0.35, -0.5]},
    "hammer": {"fp_pos": [-6.8, -3.8, -3.0], "tp_pos": [0.3, -0.6, -1.2]},
    "polearm": {"fp_pos": [-6.5, -3.0, -2.0], "tp_pos": [0.25, -0.5, -1.0]},
    "scythe": {"fp_pos": [-6.8, -3.5, -2.8], "tp_pos": [0.3, -0.6, -1.2]},
}

# A full wind-up -> impact -> follow-through -> recovery curve for each class.
# Time is driven by the owning player's public attack_time, so it also works
# for missed swings and stays synchronized with vanilla arm/body movement.
ATTACK_TP = {
    "greatsword": {0.12: [12, -10, -22], 0.28: [32, -22, -62], 0.46: [-42, 24, 86], 0.62: [-24, 30, 126], 0.82: [-5, 7, 22]},
    "blade": {0.10: [8, -12, -28], 0.22: [18, -24, -52], 0.38: [-28, 20, 88], 0.52: [-18, 28, 118], 0.72: [-4, 8, 25]},
    "dagger": {0.06: [4, -12, -18], 0.14: [8, -28, -40], 0.28: [-12, 35, 82], 0.40: [-8, 25, 105], 0.58: [0, 0, 0]},
    "hammer": {0.10: [18, -6, -20], 0.30: [48, -18, -66], 0.48: [-55, 14, 58], 0.62: [-30, 20, 85], 0.84: [-5, 4, 14]},
    "polearm": {0.10: [6, -20, -22], 0.24: [14, -38, -48], 0.40: [-18, 45, 62], 0.56: [-12, 35, 105], 0.78: [-3, 8, 20]},
    "scythe": {0.12: [14, -26, -42], 0.25: [24, -38, -68], 0.43: [-30, 46, 92], 0.58: [-18, 34, 142], 0.76: [-6, 12, 36]},
}
ATTACK_VIEW_SCALE = {
    # First person needs a readable weapon arc because the full-body layer is
    # disabled there. Third person already inherits the animated player arm,
    # so this layer is deliberately a smaller wrist/weapon follow-through.
    "fp": {"greatsword": 0.58, "blade": 0.55, "dagger": 0.58, "hammer": 0.55, "polearm": 0.60, "scythe": 0.68},
    "tp": {"greatsword": 0.35, "blade": 0.40, "dagger": 0.45, "hammer": 0.35, "polearm": 0.38, "scythe": 0.35},
}
def face_uv(x: int, y: int, width: int) -> dict:
    return {
        "north": {"uv": [x, y], "uv_size": [width, 1]},
        "south": {"uv": [x + width, y], "uv_size": [-width, 1]},
        "east": {"uv": [x + width - 1, y], "uv_size": [1, 1]},
        "west": {"uv": [x, y], "uv_size": [1, 1]},
        "up": {"uv": [x, y], "uv_size": [width, 1]},
        "down": {"uv": [x + width, y], "uv_size": [-width, 1]},
    }


def geometry(name: str, profile: str) -> dict:
    texture_path = TEXTURES / f"{name}.png"
    image = Image.open(texture_path).convert("RGBA")
    if image.size != (32, 32):
        raise ValueError(f"{texture_path} must be 32x32, got {image.size}")

    grip_x, grip_y = GRIP[name]
    cubes = []
    for y in range(32):
        x = 0
        while x < 32:
            if image.getpixel((x, y))[3] < 64:
                x += 1
                continue
            start = x
            while x < 32 and image.getpixel((x, y))[3] >= 64:
                x += 1
            width = x - start
            cubes.append({
                "origin": [start - grip_x, HAND_PIVOT_Y + grip_y - y - 1, -0.5],
                "size": [width, 1, 1],
                "uv": face_uv(start, y, width),
            })

    return {
        "description": {
            "identifier": f"geometry.mcpp.weapon.{name}",
            "texture_width": 32,
            "texture_height": 32,
            "visible_bounds_width": 4,
            "visible_bounds_height": 4,
            "visible_bounds_offset": [0, 1, 0],
        },
        # Bedrock only resolves an attachable binding reliably when the bound
        # bone owns the renderable geometry itself. A bound-but-empty parent
        # can leave child cubes at the owner's entity origin (the feet).
        # This single-bone layout mirrors vanilla trident/shield geometry.
        "bones": [{
            "name": "weapon",
            "binding": "q.item_slot_to_bone_name(context.item_slot)",
            "pivot": [0, HAND_PIVOT_Y, 0],
            "rotation": [0, 0, 45],
            "cubes": cubes,
        }],
    }


def attachable(name: str, profile: str) -> dict:
    return {
        "format_version": "1.20.30",
        "minecraft:attachable": {
            "description": {
                "identifier": f"mcpp:{name}",
                "item": {
                    f"mcpp:{name}": "query.is_owner_identifier_any('minecraft:player')",
                },
                "materials": {
                    "default": "entity_alphatest",
                    "enchanted": "entity_alphatest_glint",
                },
                "textures": {
                    "default": f"textures/items/{name}",
                    "enchanted": "textures/misc/enchanted_item_glint",
                },
                "geometry": {"default": f"geometry.mcpp.weapon.{name}"},
                "animations": {
                    "wield_fp": f"animation.mcpp.weapon.wield.{profile}.fp",
                    "wield_tp": f"animation.mcpp.weapon.wield.{profile}.tp",
                    "attack_fp": f"animation.mcpp.weapon.attack.{profile}.fp",
                    "attack_tp": f"animation.mcpp.weapon.attack.{profile}.tp",
                },
                "scripts": {"animate": [
                    {"wield_fp": "context.is_first_person == 1.0"},
                    {"wield_tp": "context.is_first_person == 0.0"},
                    {"attack_fp": "context.is_first_person == 1.0 && context.owning_entity->variable.attack_time > 0.001"},
                    {"attack_tp": "context.is_first_person == 0.0 && context.owning_entity->variable.attack_time > 0.001"},
                ]},
                "render_controllers": ["controller.render.item_default"],
            }
        },
    }


def attack_keyframes(profile: str, scale: float) -> dict:
    frames = {"0.0": [0, 0, 0]}
    for timestamp, rotation in ATTACK_TP[profile].items():
        scaled = [round(value * scale, 2) for value in rotation]
        # A deliberate zero hold must be linear. Catmull-Rom would overshoot
        # between two zero poses and make the dagger recoil after it has reset.
        frames[f"{timestamp:.2f}"] = scaled if not any(scaled) else {"post": scaled, "lerp_mode": "catmullrom"}
    frames["1.0"] = [0, 0, 0]
    return frames


def weapon_animations() -> dict:
    animations = {}
    for profile, pose in WIELD_POSE.items():
        animations[f"animation.mcpp.weapon.wield.{profile}.fp"] = {
            "loop": True,
            "override_previous_animation": False,
            "bones": {"weapon": {"position": pose["fp_pos"], "rotation": [152, -9, 25]}},
        }
        animations[f"animation.mcpp.weapon.wield.{profile}.tp"] = {
            "loop": True,
            "override_previous_animation": False,
            "bones": {"weapon": {"position": pose["tp_pos"], "rotation": [97, -1.5, -139]}},
        }
        for view in ("fp", "tp"):
            scale = ATTACK_VIEW_SCALE[view][profile]
            animations[f"animation.mcpp.weapon.attack.{profile}.{view}"] = {
                "loop": True,
                "animation_length": 1.0,
                "anim_time_update": "math.clamp(c.owning_entity->v.attack_time, 0.0, 1.0)",
                "override_previous_animation": False,
                "bones": {"weapon": {"rotation": attack_keyframes(profile, scale)}},
            }
    return {"format_version": "1.10.0", "animations": animations}


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    model = {
        "format_version": "1.16.0",
        "minecraft:geometry": [geometry(name, profile) for name, profile in WEAPONS.items()],
    }
    write_json(MODEL_FILE, model)
    write_json(ANIMATION_FILE, weapon_animations())
    for name, profile in WEAPONS.items():
        write_json(ATTACHABLE_DIR / f"{name}.attachable.json", attachable(name, profile))
    print(f"Generated {len(WEAPONS)} weapon models, attachables, and 24 class animations.")


if __name__ == "__main__":
    main()
