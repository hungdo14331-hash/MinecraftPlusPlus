import { EntityComponentTypes, ItemStack, system, type Player } from "@minecraft/server";
import { readMainhand, writeMainhand } from "../../core/api/inventory_adapter";
import { EnchantRegistry } from "../../core/registry/registries";
import {
  setCustomEnchantBookLevel,
  setCustomEnchantLevel,
} from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";

const COMMAND_ID = "mcpp:enchant";
const BOOK_COMMAND_ID = "mcpp:book";

export function initEnchantCommandService(): void {
  system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id !== COMMAND_ID && ev.id !== BOOK_COMMAND_ID) return;

    try {
      if (ev.id === BOOK_COMMAND_ID) {
        handleBookCommand(ev.sourceEntity, ev.message);
      } else {
        handleEnchantCommand(ev.sourceEntity, ev.message);
      }
    } catch (e) {
      log.error("EnchantCommandService loi:", e);
    }
  });
}

function parseRequest(message: string): {
  enchantId: string;
  level: number;
  definition: ReturnType<typeof EnchantRegistry.get>;
} {
  const [rawName, rawLevel] = message.trim().toLowerCase().split(/\s+/);
  const enchantId = rawName?.includes(":") ? rawName : `mcpp:${rawName}`;
  return {
    enchantId,
    level: Number(rawLevel),
    definition: EnchantRegistry.get(enchantId),
  };
}

function handleEnchantCommand(source: any, message: string): void {
  if (source?.typeId !== "minecraft:player") return;
  const player = source as Player;
  const { enchantId, level, definition } = parseRequest(message);

  if (!definition) {
    player.sendMessage(`§cEnchant khong ton tai trong lenh: ${message || "(trong)"}`);
    return;
  }

  if (!Number.isInteger(level) || level < 1 || level > definition.maxLevel) {
    player.sendMessage(`§cCap ${definition.displayName} phai tu 1 den ${definition.maxLevel}.`);
    return;
  }

  const item = readMainhand(player);
  if (!item) {
    player.sendMessage("§cHay cam item can enchant tren tay chinh.");
    return;
  }

  try {
    setCustomEnchantLevel(item, enchantId, level);
    if (!writeMainhand(player, item)) throw new Error("Khong tim thay Equippable component");
    player.sendMessage(`§dDa gan ${definition.displayName} ${level} vao ${item.typeId}.`);
  } catch (e) {
    player.sendMessage(`§cKhong the gan enchant: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function handleBookCommand(source: any, message: string): void {
  if (source?.typeId !== "minecraft:player") return;
  const player = source as Player;
  const { enchantId, level, definition } = parseRequest(message);

  if (!definition) {
    player.sendMessage(`§cEnchant khong ton tai trong lenh: ${message || "(trong)"}`);
    return;
  }
  if (!Number.isInteger(level) || level < 1 || level > definition.maxLevel) {
    player.sendMessage(`§cCap ${definition.displayName} phai tu 1 den ${definition.maxLevel}.`);
    return;
  }

  try {
    const bookTypeId = `${enchantId}_book`;
    const book = new ItemStack(bookTypeId, 1);
    setCustomEnchantBookLevel(book, enchantId, level);

    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;
    const leftover = inventory?.addItem(book);
    if (!inventory || leftover) {
      player.dimension.spawnItem(leftover ?? book, player.location);
    }
    player.sendMessage(`§dDa nhan ${definition.displayName} Book ${level}.`);
  } catch (e) {
    player.sendMessage(`§cKhong the tao sach: ${e instanceof Error ? e.message : String(e)}`);
  }
}
