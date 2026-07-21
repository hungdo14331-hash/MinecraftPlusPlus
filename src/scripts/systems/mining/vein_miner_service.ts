import { ItemStack, type Dimension, type Vector3 } from "@minecraft/server";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import {
  ORE_DROPS,
  LOG_BLOCK_TYPES,
  VEIN_MINER_MAX_BLOCKS,
  VEIN_MINER_MAX_SCAN,
  type OreDropSpec,
} from "../../core/config/vein_miner_config";
import { TaskQueue } from "../../core/scheduler/task_queue";
import { log } from "../../core/utils/logger";
import { getEnchantLevel, hasEnchantment } from "../../core/utils/enchantments";
import { getCustomEnchantLevel } from "../../core/utils/custom_enchantments";

/**
 * CHOT boi nguoi dung:
 * - Kich hoat: CHI khi nguoi choi dang giu Shift (sneak) luc dao/chat.
 * - Cong cu: cuoc (ore) hoac riu (go) — bat ky loai vanilla nao, bat buoc co Unbreaking.
 * - Gioi han: toi da 128 khoi PHU moi lan kich hoat (VEIN_MINER_MAX_BLOCKS).
 * - Ket noi: bao gom CA CHEO (26 huong quanh 1 khoi, khong chi 6 huong truc).
 *
 * (Claude tu them, khong phai yeu cau nguoi dung): VEIN_MINER_MAX_SCAN gioi han tong so
 * lan goi dimension.getBlock() trong 1 lan kich hoat. Vi 26 huong lam fan-out moi node
 * lon hon nhieu so voi 6 huong truc cu, mach thua/rai rac ky la co the khien BFS quet
 * qua rat nhieu o trong so voi so khoi that su tim duoc. Cap nay la luoi an toan hieu
 * nang doc lap voi cap 128 khoi pha — neu cham cap quet, dung som (van pha nhung gi da
 * tim duoc, khong bao loi).
 */

function isPickaxe(itemTypeId: string | undefined): boolean {
  if (!itemTypeId) return false;
  return itemTypeId.endsWith("_pickaxe");
}

function isAxe(itemTypeId: string | undefined): boolean {
  if (!itemTypeId) return false;
  // Luu y: "_pickaxe" cung ket thuc bang "axe" nhung KHONG ket thuc bang "_axe"
  // (ky tu truoc "axe" la "k" chu khong phai "_"), nen khong bi nham voi cuoc.
  return itemTypeId.endsWith("_axe");
}

/** 26 o lan can quanh 1 diem trong khoi lap phuong 3x3x3 (bao gom ca cheo), tru chinh no. */
function neighborsOf26(loc: Vector3): Vector3[] {
  const result: Vector3[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        result.push({ x: loc.x + dx, y: loc.y + dy, z: loc.z + dz });
      }
    }
  }
  return result;
}

function keyOf(loc: Vector3): string {
  return `${loc.x},${loc.y},${loc.z}`;
}

function computeOreDrop(
  dropSpec: OreDropSpec,
  originTypeId: string,
  silkTouchLevel: number,
  fortuneLevel: number
): { itemTypeId: string; qty: number } {
  if (silkTouchLevel > 0) {
    return { itemTypeId: originTypeId, qty: 1 };
  }
  const baseQty = dropSpec.min + Math.floor(Math.random() * (dropSpec.max - dropSpec.min + 1));
  if (fortuneLevel <= 0) {
    return { itemTypeId: dropSpec.itemTypeId, qty: baseQty };
  }
  // Xap xi — khong phai cong thuc vanilla chinh xac tung loai block.
  const fortuneMultiplier = 1 + Math.floor(Math.random() * (fortuneLevel + 1));
  return { itemTypeId: dropSpec.itemTypeId, qty: baseQty * fortuneMultiplier };
}

type VeinCategory = "ore" | "log";

export function initVeinMinerService(): void {
  EventBus.on(Events.World.BreakBlock, (ev: any) => {
    try {
      handleBlockBreak(ev);
    } catch (e) {
      log.error("VeinMinerService loi:", e);
    }
  });
}

function handleBlockBreak(ev: any): void {
  const player = ev.player;
  if (!player?.isSneaking) return;

  const originTypeId: string | undefined = ev.brokenBlockPermutation?.type?.id;
  if (!originTypeId) return;

  const toolItem: ItemStack | undefined = ev.itemStackBeforeBreak;
  const toolTypeId = toolItem?.typeId;

  // Một lần phá chỉ được chọn một cơ chế diện rộng; Địa Chấn có độ ưu tiên cao hơn.
  if (getCustomEnchantLevel(toolItem, "mcpp:earthshatter") > 0) return;

  // Cần sách Vein Miner riêng và vẫn giữ yêu cầu Unbreaking để cân bằng độ bền.
  if (getCustomEnchantLevel(toolItem, "mcpp:vein_miner") <= 0 || !hasEnchantment(toolItem, "unbreaking")) return;

  let category: VeinCategory | undefined;
  if (ORE_DROPS[originTypeId] && isPickaxe(toolTypeId)) {
    category = "ore";
  } else if (LOG_BLOCK_TYPES.has(originTypeId) && isAxe(toolTypeId)) {
    category = "log";
  } else {
    return; // khong thoa dieu kien nao (sai loai khoi hoac sai loai cong cu)
  }

  const silkTouchLevel = category === "ore" ? getEnchantLevel(toolItem, "silk_touch") : 0;
  const fortuneLevel = category === "ore" ? getEnchantLevel(toolItem, "fortune") : 0;

  const dimension: Dimension = ev.dimension;
  const originLoc = ev.block.location as Vector3;

  const visited = new Set<string>([keyOf(originLoc)]);
  const queue: Vector3[] = [originLoc];
  const toBreak: Vector3[] = [];
  let scanCount = 0;

  outer: while (queue.length > 0 && toBreak.length < VEIN_MINER_MAX_BLOCKS) {
    const cur = queue.shift();
    if (!cur) break;
    for (const n of neighborsOf26(cur)) {
      if (scanCount >= VEIN_MINER_MAX_SCAN) break outer; // luoi an toan hieu nang
      scanCount++;

      const k = keyOf(n);
      if (visited.has(k)) continue;
      visited.add(k);

      let blockTypeId: string | undefined;
      try {
        blockTypeId = dimension.getBlock(n)?.typeId;
      } catch {
        continue;
      }

      if (blockTypeId === originTypeId) {
        toBreak.push(n);
        queue.push(n);
        if (toBreak.length >= VEIN_MINER_MAX_BLOCKS) break;
      }
    }
  }

  if (toBreak.length === 0) return;

  let index = 0;
  TaskQueue.enqueue("vein_miner_break", () => {
    if (index >= toBreak.length) return true;
    const loc = toBreak[index];
    index++;
    try {
      const block = dimension.getBlock(loc);
      if (block && block.typeId === originTypeId) {
        block.setType("minecraft:air");
        const drop =
          category === "log"
            ? { itemTypeId: originTypeId, qty: 1 }
            : computeOreDrop(ORE_DROPS[originTypeId], originTypeId, silkTouchLevel, fortuneLevel);
        const dropLoc = { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
        dimension.spawnItem(new ItemStack(drop.itemTypeId, drop.qty), dropLoc);
      }
    } catch (e) {
      log.debug("VeinMiner pha khoi loi:", e);
    }
    return index >= toBreak.length;
  });
}
