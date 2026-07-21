import { EntityComponentTypes, ItemStack, system, world, type Container, type Dimension, type Player, type Vector3 } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import {
  findCustomEnchant,
  getCustomEnchantLevel,
  setCustomEnchantBookLevel,
  setCustomEnchantLevel,
  isCustomEnchantBook,
} from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";
import { CurrencyService } from "../currency/currency_service";
import { matchesItemSuffix } from "../../core/utils/item_types";
import { TickScheduler } from "../../core/scheduler/tick_scheduler";

const TABLE_ID = "mcpp:arcane_enchanting_table";
const openMenus = new Set<string>();
interface ArcaneTableRef { dimensionId:string; location:Vector3; }
const trackedTables=new Map<string,ArcaneTableRef>();
const activeTableByPlayer=new Map<string,ArcaneTableRef>();
const APPLY_FEES = [0, 15, 40, 90, 180, 350] as const;
const COMBINE_FEES = [0, 0, 25, 75, 200, 500] as const;

interface BookSlot {
  slot: number;
  item: ItemStack;
  enchantId: string;
  displayName: string;
  level: number;
  maxLevel: number;
  allowedItemSuffixes?: string[];
}

export function initArcaneTableService(): void {
  try{
    world.afterEvents.playerPlaceBlock.subscribe((ev:any)=>{
      if(ev.block?.typeId===TABLE_ID)trackTable({dimensionId:ev.player.dimension.id,location:ev.block.location});
    });
  }catch{/* API cũ: bàn sẽ được theo dõi từ lần tương tác đầu tiên. */}
  TickScheduler.every("arcane_table_idle_fx",20,playIdleEffects);
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    if (ev.block?.typeId !== TABLE_ID || ev.isFirstEvent === false) return;
    ev.cancel = true;
    const player = ev.player;
    const tableRef={dimensionId:player.dimension.id,location:{...ev.block.location}};
    trackTable(tableRef);activeTableByPlayer.set(player.id,tableRef);

    // Before-event la restricted context: hoan viec mo UI sang tick ke tiep.
    system.run(() => {
      if (!player.isValid || openMenus.has(player.id)) return;
      openMenus.add(player.id);
      void showMainMenu(player)
        .catch((e) => log.error("ArcaneTable UI loi:", e))
        .finally(() => {openMenus.delete(player.id);activeTableByPlayer.delete(player.id);});
    });
  });
}

function tableKey(ref:ArcaneTableRef):string{return `${ref.dimensionId}:${ref.location.x},${ref.location.y},${ref.location.z}`;}
function trackTable(ref:ArcaneTableRef):void{trackedTables.set(tableKey(ref),ref);}
function centerOf(ref:ArcaneTableRef):Vector3{return{x:ref.location.x+0.5,y:ref.location.y+1.1,z:ref.location.z+0.5};}
function dimensionOf(ref:ArcaneTableRef):Dimension|undefined{try{return world.getDimension(ref.dimensionId);}catch{return undefined;}}
function playIdleEffects():void{
  for(const [key,ref] of trackedTables){const dimension=dimensionOf(ref);if(!dimension){trackedTables.delete(key);continue;}
    try{if(dimension.getBlock(ref.location)?.typeId!==TABLE_ID){trackedTables.delete(key);continue;}if(dimension.getPlayers({location:ref.location,maxDistance:9}).length===0)continue;
      dimension.spawnParticle("minecraft:basic_portal_particle",centerOf(ref));
    }catch{/* Hiệu ứng không được làm gián đoạn gameplay. */}
  }
}
function playTableSuccess(player:Player,level:number,mode:"apply"|"combine"):void{
  const ref=activeTableByPlayer.get(player.id);if(!ref)return;const dimension=dimensionOf(ref);if(!dimension)return;const center=centerOf(ref);const strength=Math.max(1,Math.min(5,level));
  try{dimension.playSound(mode==="combine"?"random.levelup":"random.orb",center,{volume:0.7+strength*0.08,pitch:0.8+strength*0.08});}catch{}
  for(let wave=0;wave<2+strength;wave++)system.runTimeout(()=>{
    try{dimension.spawnParticle(wave===1+strength?"minecraft:totem_particle":"minecraft:critical_hit_emitter",{x:center.x,y:center.y+wave*0.08,z:center.z});}catch{}
  },wave*2);
}

async function showMainMenu(player: Player): Promise<void> {
  const response = await new ActionFormData()
    .title("§5Arcane Enchanting Table")
    .header("§d§lMa thuật tùy chỉnh")
    .body("§7Bàn sẽ đọc sách và công cụ trực tiếp từ inventory.\n\n§fChọn một thao tác:")
    .button("§dGắn sách vào công cụ\n§8Tiêu thụ 1 sách", "textures/items/vampire_book")
    .button("§bGhép hai sách cùng cấp\n§8Tạo sách cấp cao hơn", "textures/items/momentum_book")
    .show(player);

  if (response.canceled) return;
  if (response.selection === 0) await applyBookFlow(player);
  if (response.selection === 1) await combineBooksFlow(player);
}

function romanLevel(level: number): string {
  return ["", "I", "II", "III", "IV", "V"][level] ?? String(level);
}

async function confirmAction(player: Player, title: string, body: string): Promise<boolean> {
  const response = await new MessageFormData()
    .title(title)
    .body(body)
    .button1("§cHủy")
    .button2("§aXác nhận")
    .show(player);
  return !response.canceled && response.selection === 1;
}

function inventoryOf(player: Player): Container | undefined {
  return player.getComponent(EntityComponentTypes.Inventory)?.container;
}

function listBooks(container: Container): BookSlot[] {
  const result: BookSlot[] = [];
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    const enchant = findCustomEnchant(item);
    if (!item || !enchant || !isCustomEnchantBook(item, enchant.definition.id)) continue;
    result.push({
      slot,
      item,
      enchantId: enchant.definition.id,
      displayName: enchant.definition.displayName,
      level: enchant.level,
      maxLevel: enchant.definition.maxLevel,
      allowedItemSuffixes: enchant.definition.allowedItemSuffixes,
    });
  }
  return result;
}

function itemName(item: ItemStack): string {
  return item.nameTag || item.typeId.split(":").pop()?.replace(/_/g, " ") || item.typeId;
}

async function chooseBook(player: Player, title: string, books: BookSlot[]): Promise<BookSlot | undefined> {
  if (books.length === 0) {
    player.sendMessage("§cKhông tìm thấy custom enchanted book phù hợp trong inventory.");
    return undefined;
  }
  const form = new ActionFormData().title(title).body("Chọn một cuốn sách:");
  for (const book of books) {
    const icon = `textures/items/${book.enchantId.split(":")[1]}_book`;
    form.button(`§d${book.displayName} ${romanLevel(book.level)}\n§7Slot ${book.slot + 1}`, icon);
  }
  const response = await form.show(player);
  return response.canceled || response.selection === undefined ? undefined : books[response.selection];
}

async function applyBookFlow(player: Player): Promise<void> {
  const container = inventoryOf(player);
  if (!container) return;
  const selectedBook = await chooseBook(player, "§5Chọn sách để gắn", listBooks(container));
  if (!selectedBook) return;

  const suffixes = selectedBook.allowedItemSuffixes ?? [];
  const tools: Array<{ slot: number; item: ItemStack }> = [];
  for (let slot = 0; slot < container.size; slot++) {
    if (slot === selectedBook.slot) continue;
    const item = container.getItem(slot);
    if (item && suffixes.some((suffix) => matchesItemSuffix(item.typeId,suffix))) tools.push({ slot, item });
  }
  if (tools.length === 0) {
    player.sendMessage("§cKhông có công cụ tương thích trong inventory.");
    return;
  }

  const form = new ActionFormData()
    .title("§5Chọn công cụ")
    .body(`Gắn ${selectedBook.displayName} ${selectedBook.level} vào:`);
  for (const tool of tools) form.button(`${itemName(tool.item)}\n§7Slot ${tool.slot + 1}`);
  const response = await form.show(player);
  if (response.canceled || response.selection === undefined) return;

  const chosenTool = tools[response.selection];
  const fee = APPLY_FEES[selectedBook.level] ?? APPLY_FEES[APPLY_FEES.length - 1];
  const balance = CurrencyService.getBalance(player);
  const confirmed = await confirmAction(
    player,
    "§5Xác nhận phù phép",
    `§f${itemName(chosenTool.item)}\n§7Nhận: §d${selectedBook.displayName} ${romanLevel(selectedBook.level)}\n\n§cCuốn sách sẽ bị tiêu thụ.\n§dPhí: ${fee} ✦ §7(Số dư: ${balance} ✦)`
  );
  if (!confirmed) return;

  const currentBook = container.getItem(selectedBook.slot);
  const currentTool = container.getItem(chosenTool.slot);
  const bookEnchant = findCustomEnchant(currentBook);
  if (
    !currentBook ||
    !currentTool ||
    !isCustomEnchantBook(currentBook, selectedBook.enchantId) ||
    bookEnchant?.definition.id !== selectedBook.enchantId ||
    bookEnchant.level !== selectedBook.level
  ) {
    player.sendMessage("§cInventory đã thay đổi; thao tác bị hủy để tránh mất item.");
    return;
  }

  const existingLevel = getCustomEnchantLevel(currentTool, selectedBook.enchantId);
  if (existingLevel >= selectedBook.level) {
    player.sendMessage("§cCông cụ đã có enchant cùng cấp hoặc cao hơn.");
    return;
  }

  if (!CurrencyService.trySpend(player, fee, undefined, `arcane_table_apply:${selectedBook.enchantId}:${selectedBook.level}`)) {
    player.sendMessage(`§cKhông đủ tiền. Cần ${fee} ✦ để phù phép.`);
    return;
  }

  setCustomEnchantLevel(currentTool, selectedBook.enchantId, selectedBook.level);
  container.setItem(chosenTool.slot, currentTool);
  container.setItem(selectedBook.slot, undefined);
  playTableSuccess(player,selectedBook.level,"apply");
  player.sendMessage(`§aĐã gắn ${selectedBook.displayName} ${selectedBook.level} vào ${itemName(currentTool)}.`);
}

async function combineBooksFlow(player: Player): Promise<void> {
  const container = inventoryOf(player);
  if (!container) return;
  const first = await chooseBook(
    player,
    "§5Chọn sách thứ nhất",
    listBooks(container).filter((book) => book.level < book.maxLevel)
  );
  if (!first) return;

  const matches = listBooks(container).filter(
    (book) => book.slot !== first.slot && book.enchantId === first.enchantId && book.level === first.level
  );
  const second = await chooseBook(player, "§5Chọn sách thứ hai", matches);
  if (!second) return;

  const nextLevel = first.level + 1;
  const fee = COMBINE_FEES[nextLevel] ?? COMBINE_FEES[COMBINE_FEES.length - 1];
  const balance = CurrencyService.getBalance(player);
  const confirmed = await confirmAction(
    player,
    "§5Xác nhận ghép sách",
    `§d${first.displayName} ${romanLevel(first.level)} §f+ §d${first.displayName} ${romanLevel(first.level)}\n\n§a→ ${first.displayName} ${romanLevel(nextLevel)}\n\n§dPhí: ${fee} ✦ §7(Số dư: ${balance} ✦)`
  );
  if (!confirmed) return;

  const firstItem = container.getItem(first.slot);
  const secondItem = container.getItem(second.slot);
  const firstEnchant = findCustomEnchant(firstItem);
  const secondEnchant = findCustomEnchant(secondItem);
  if (
    !firstItem ||
    !secondItem ||
    firstEnchant?.definition.id !== first.enchantId ||
    secondEnchant?.definition.id !== first.enchantId ||
    firstEnchant.level !== first.level ||
    secondEnchant.level !== first.level
  ) {
    player.sendMessage("§cInventory đã thay đổi; thao tác bị hủy để tránh mất item.");
    return;
  }

  if (!CurrencyService.trySpend(player, fee, undefined, `arcane_table_combine:${first.enchantId}:${nextLevel}`)) {
    player.sendMessage(`§cKhông đủ tiền. Cần ${fee} ✦ để ghép sách.`);
    return;
  }

  // Sách Creative có ID theo cấp; sau khi ghép chuyển về sách runtime chuẩn để tên cấp cũ không còn lưu trên item.
  const output = firstItem.typeId === `${first.enchantId}_book` ? firstItem : new ItemStack(`${first.enchantId}_book`, 1);
  setCustomEnchantBookLevel(output, first.enchantId, nextLevel);
  container.setItem(first.slot, output);
  container.setItem(second.slot, undefined);
  playTableSuccess(player,nextLevel,"combine");
  player.sendMessage(`§aĐã ghép thành ${first.displayName} ${nextLevel}.`);
}
