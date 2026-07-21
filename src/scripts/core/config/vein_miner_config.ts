/** CHOT boi nguoi dung: gioi han toi da 128 khoi phu moi lan kich hoat Vein Miner. */
export const VEIN_MINER_MAX_BLOCKS = 128;

/**
 * AN TOAN HIEU NANG (Claude tu them, khong phai yeu cau cua nguoi dung): gioi han tong
 * so lan QUET (goi dimension.getBlock()), tach biet voi VEIN_MINER_MAX_BLOCKS (so khoi
 * PHA). Vi kieu ket noi moi (cheo + cach 1 khoi) kiem tra toi 124 o lan can moi khoi,
 * neu khong co cap nay, mach rai rac lon co the quet hang chuc nghin lan trong 1 tick,
 * gay giat hinh. Neu vuot cap nay, dung quet som (van pha duoc nhung gi da tim thay).
 */
export const VEIN_MINER_MAX_SCAN = 3000;

export interface OreDropSpec {
  itemTypeId: string;
  min: number;
  max: number;
}

/**
 * Danh sach quang duoc Vein Miner ho tro + item roi ra CO BAN (chua tinh Fortune/Silk
 * Touch — 2 thu nay duoc doc THAT tu cuoc va ap dung trong vein_miner_service.ts,
 * xem computeDrop() o do). Bang duoi la so luong drop MAC DINH khi khong co enchant nao.
 */
export const ORE_DROPS: Record<string, OreDropSpec> = {
  "minecraft:coal_ore": { itemTypeId: "minecraft:coal", min: 1, max: 1 },
  "minecraft:deepslate_coal_ore": { itemTypeId: "minecraft:coal", min: 1, max: 1 },
  "minecraft:iron_ore": { itemTypeId: "minecraft:raw_iron", min: 1, max: 1 },
  "minecraft:deepslate_iron_ore": { itemTypeId: "minecraft:raw_iron", min: 1, max: 1 },
  "minecraft:copper_ore": { itemTypeId: "minecraft:raw_copper", min: 2, max: 5 },
  "minecraft:deepslate_copper_ore": { itemTypeId: "minecraft:raw_copper", min: 2, max: 5 },
  "minecraft:gold_ore": { itemTypeId: "minecraft:raw_gold", min: 1, max: 1 },
  "minecraft:deepslate_gold_ore": { itemTypeId: "minecraft:raw_gold", min: 1, max: 1 },
  "minecraft:nether_gold_ore": { itemTypeId: "minecraft:gold_nugget", min: 2, max: 6 },
  "minecraft:redstone_ore": { itemTypeId: "minecraft:redstone", min: 4, max: 5 },
  "minecraft:deepslate_redstone_ore": { itemTypeId: "minecraft:redstone", min: 4, max: 5 },
  "minecraft:lapis_ore": { itemTypeId: "minecraft:lapis_lazuli", min: 4, max: 9 },
  "minecraft:deepslate_lapis_ore": { itemTypeId: "minecraft:lapis_lazuli", min: 4, max: 9 },
  "minecraft:diamond_ore": { itemTypeId: "minecraft:diamond", min: 1, max: 1 },
  "minecraft:deepslate_diamond_ore": { itemTypeId: "minecraft:diamond", min: 1, max: 1 },
  "minecraft:emerald_ore": { itemTypeId: "minecraft:emerald", min: 1, max: 1 },
  "minecraft:deepslate_emerald_ore": { itemTypeId: "minecraft:emerald", min: 1, max: 1 },
  "minecraft:nether_quartz_ore": { itemTypeId: "minecraft:quartz", min: 1, max: 1 },
  "minecraft:ancient_debris": { itemTypeId: "minecraft:ancient_debris", min: 1, max: 1 },
};

/**
 * (Moi) Khoi go (log/stem) duoc Vein Miner ho tro khi dung RIU. Luon roi CHINH NO,
 * so luong = 1 — vanilla khong ap dung Fortune cho go, nen khong can bang min/max
 * hay doc enchant nhu ORE_DROPS.
 */
export const LOG_BLOCK_TYPES = new Set<string>([
  "minecraft:oak_log",
  "minecraft:spruce_log",
  "minecraft:birch_log",
  "minecraft:jungle_log",
  "minecraft:acacia_log",
  "minecraft:dark_oak_log",
  "minecraft:mangrove_log",
  "minecraft:cherry_log",
  "minecraft:crimson_stem",
  "minecraft:warped_stem",
  "minecraft:stripped_oak_log",
  "minecraft:stripped_spruce_log",
  "minecraft:stripped_birch_log",
  "minecraft:stripped_jungle_log",
  "minecraft:stripped_acacia_log",
  "minecraft:stripped_dark_oak_log",
  "minecraft:stripped_mangrove_log",
  "minecraft:stripped_cherry_log",
  "minecraft:stripped_crimson_stem",
  "minecraft:stripped_warped_stem",
]);
