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
const ANIMATED_BOOK_ID = "mcpp:arcane_table_book";
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
      if(ev.block?.typeId!==TABLE_ID)return;
      const ref={dimensionId:ev.player.dimension.id,location:{...ev.block.location}};
      trackTable(ref);system.run(()=>ensureAnimatedBook(ref));
    });
  }catch{/* API cũ: bàn sẽ được theo dõi từ lần tương tác đầu tiên. */}
  try{
    world.afterEvents.playerBreakBlock.subscribe((ev:any)=>{
      const brokenId=ev.brokenBlockPermutation?.type?.id??ev.brokenBlockPermutation?.typeId;
      if(brokenId!==TABLE_ID)return;
      const ref={dimensionId:ev.player.dimension.id,location:{...ev.block.location}};
      trackedTables.delete(tableKey(ref));system.run(()=>removeAnimatedBooks(ref));
    });
  }catch{/* API cũ: cleanup van duoc thuc hien boi idle tracker. */}
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
      ensureAnimatedBook(tableRef);
      openMenus.add(player.id);
      void showMainMenu(player)
        .catch((e) => log.error("ArcaneTable UI loi:", e))
        .finally(() => {openMenus.delete(player.id);activeTableByPlayer.delete(player.id);});
    });
  });
}

function tableKey(ref:ArcaneTableRef):string{return `${ref.dimensionId}:${ref.location.x},${ref.location.y},${ref.location.z}`;}
function trackTable(ref:ArcaneTableRef):void{trackedTables.set(tableKey(ref),ref);}
function centerOf(ref:ArcaneTableRef):Vector3{return{x:ref.location.x+0.5,y:ref.location.y+1.25,z:ref.location.z+0.5};}
function animatedBookOrigin(ref:ArcaneTableRef):Vector3{return{x:ref.location.x+0.5,y:ref.location.y+0.82,z:ref.location.z+0.5};}
function dimensionOf(ref:ArcaneTableRef):Dimension|undefined{try{return world.getDimension(ref.dimensionId);}catch{return undefined;}}
function nearbyAnimatedBooks(ref:ArcaneTableRef):any[]{
  const dimension=dimensionOf(ref);if(!dimension)return[];
  try{return dimension.getEntities({type:ANIMATED_BOOK_ID,location:animatedBookOrigin(ref),maxDistance:0.42}) as any[];}catch{return[];}
}
function ensureAnimatedBook(ref:ArcaneTableRef):void{
  const dimension=dimensionOf(ref);if(!dimension)return;
  try{
    if(dimension.getBlock(ref.location)?.typeId!==TABLE_ID){removeAnimatedBooks(ref);return;}
    const books=nearbyAnimatedBooks(ref);
    if(books.length===0)dimension.spawnEntity(ANIMATED_BOOK_ID,animatedBookOrigin(ref));
    for(let index=1;index<books.length;index++)books[index]?.remove?.();
  }catch(e){log.debug("Khong the tao animated book:",e);}
}
function removeAnimatedBooks(ref:ArcaneTableRef):void{
  for(const book of nearbyAnimatedBooks(ref)){try{book.remove();}catch{/* Entity co the da bi xoa. */}}
}
function playIdleEffects():void{
  for(const [key,ref] of trackedTables){const dimension=dimensionOf(ref);if(!dimension){trackedTables.delete(key);continue;}
    try{if(dimension.getBlock(ref.location)?.typeId!==TABLE_ID){removeAnimatedBooks(ref);trackedTables.delete(key);continue;}ensureAnimatedBook(ref);if(dimension.getPlayers({location:ref.location,maxDistance:9}).length===0)continue;
      const center=centerOf(ref);
      dimension.spawnParticle("minecraft:basic_portal_particle",center);
      dimension.spawnParticle("minecraft:basic_portal_particle",{x:center.x+0.28,y:center.y+0.12,z:center.z-0.22});
      dimension.spawnParticle("minecraft:basic_portal_particle",{x:center.x-0.25,y:center.y+0.05,z:center.z+0.2});
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
  const balance = CurrencyService.getBalance(player);
  const response = await new ActionFormData()
    .title("§5Arcane Enchanting Table")
    .header("§d§lMa thuật tùy chỉnh")
    .body(`§7Bàn đọc sách và công cụ trực tiếp từ inventory.\n§dSố dư: ${balance} ✦\n\n§fCùng cấp: §dII + II → III§f. Sách cấp cao hơn sẽ thay cấp thấp hơn.\n\n§fChọn một thao tác:`)
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

function resolveAppliedLevel(existingLevel: number, bookLevel: number, maxLevel: number): number | undefined {
  if (existingLevel < bookLevel) return bookLevel;
  if (existingLevel === bookLevel && existingLevel < maxLevel) return existingLevel + 1;
  return undefined;
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
  const tools: Array<{ slot: number; item: ItemStack; existingLevel: number; outputLevel: number }> = [];
  for (let slot = 0; slot < container.size; slot++) {
    if (slot === selectedBook.slot) continue;
    const item = container.getItem(slot);
    if (!item || !suffixes.some((suffix) => matchesItemSuffix(item.typeId,suffix))) continue;
    const existingLevel = getCustomEnchantLevel(item, selectedBook.enchantId);
    const outputLevel = resolveAppliedLevel(existingLevel, selectedBook.level, selectedBook.maxLevel);
    if (outputLevel !== undefined) tools.push({ slot, item, existingLevel, outputLevel });
  }
  if (tools.length === 0) {
    player.sendMessage(`§cKhông có công cụ có thể nhận ${selectedBook.displayName} ${romanLevel(selectedBook.level)}. Công cụ cùng cấp chỉ nâng được khi chưa đạt cấp tối đa.`);
    return;
  }

  const form = new ActionFormData()
    .title("§5Chọn công cụ")
    .body(`§fSách: §d${selectedBook.displayName} ${romanLevel(selectedBook.level)}\n§7Chọn công cụ; cấp hiện tại và kết quả được ghi bên dưới.`);
  for (const tool of tools) {
    const current = tool.existingLevel > 0 ? romanLevel(tool.existingLevel) : "Chưa có";
    form.button(`${itemName(tool.item)}\n§7${current} §f→ §a${romanLevel(tool.outputLevel)} §8| Slot ${tool.slot + 1}`);
  }
  const response = await form.show(player);
  if (response.canceled || response.selection === undefined) return;

  const chosenTool = tools[response.selection];
  const existingLevel = chosenTool.existingLevel;
  const outputLevel = chosenTool.outputLevel;
  const fee = APPLY_FEES[outputLevel] ?? APPLY_FEES[APPLY_FEES.length - 1];
  const balance = CurrencyService.getBalance(player);
  const upgradeText = existingLevel > 0
    ? `§7Nâng: §d${romanLevel(existingLevel)} §f→ §a${romanLevel(outputLevel)}`
    : `§7Nhận: §d${selectedBook.displayName} ${romanLevel(outputLevel)}`;
  const confirmed = await confirmAction(
    player,
    "§5Xác nhận phù phép",
    `§f${itemName(chosenTool.item)}\n${upgradeText}\n\n§cCuốn sách sẽ bị tiêu thụ.\n§dPhí: ${fee} ✦ §7(Số dư: ${balance} ✦)`
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

  const latestExistingLevel = getCustomEnchantLevel(currentTool, selectedBook.enchantId);
  const latestOutputLevel = resolveAppliedLevel(latestExistingLevel, selectedBook.level, selectedBook.maxLevel);
  if (latestOutputLevel !== outputLevel) {
    player.sendMessage("§cCấp enchant trên công cụ đã thay đổi; thao tác bị hủy để tránh mất item.");
    return;
  }

  if (!CurrencyService.trySpend(player, fee, undefined, `arcane_table_apply:${selectedBook.enchantId}:${selectedBook.level}`)) {
    player.sendMessage(`§cKhông đủ tiền. Cần ${fee} ✦ để phù phép.`);
    return;
  }

  setCustomEnchantLevel(currentTool, selectedBook.enchantId, outputLevel);
  container.setItem(chosenTool.slot, currentTool);
  container.setItem(selectedBook.slot, undefined);
  playTableSuccess(player,outputLevel,"apply");
  player.sendMessage(`§aĐã nâng ${selectedBook.displayName} lên ${romanLevel(outputLevel)} trên ${itemName(currentTool)}.`);
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
