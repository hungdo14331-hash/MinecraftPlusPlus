import {
  EntityComponentTypes,
  ItemStack,
  system,
  world,
  type Container,
  type Entity,
  type Player,
} from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { PlayerStore } from "../../core/data/player_store";
import { EnchantRegistry } from "../../core/registry/registries";
import { setCustomEnchantBookLevel } from "../../core/utils/custom_enchantments";
import { log } from "../../core/utils/logger";
import { CurrencyService } from "./currency_service";
import { ABILITY_GUIDES, ROMAN_LEVELS } from "../../content/ability_catalog";
import { MASTERY_REWARDS } from "../../content/mastery_rewards";
import { SPECIAL_WEAPONS } from "../../content/weapon_catalog";

const MERCHANT_ID = "mcpp:arcane_merchant";
const RESTOCK_MS = 30 * 60 * 1000;
const BOOK_STOCK = 3;
const NORMAL_STOCK = 500;
const STATE_KEY = "mcpp:merchant_stock";
const UID_KEY = "mcpp:merchant_uid";
const QUOTA_KEY = "mcpp:merchant_sell_quotas";
const openMenus = new Set<string>();

interface MerchantState {
  resetAt: number;
  books: Record<string, number>;
  goods: Record<string, number>;
}

interface PlayerQuota {
  [merchantUid: string]: { cycle: number; used: Record<string, number> };
}

const GOODS_FOR_SALE:ReadonlyArray<{itemId:string;label:string;price:number;stock?:number}> = [
  { itemId:"minecraft:torch",label:"Đuốc",price:2 },{ itemId:"minecraft:arrow",label:"Mũi tên",price:5 },{ itemId:"minecraft:paper",label:"Giấy",price:6 },
  { itemId:"minecraft:bread",label:"Bánh mì",price:15 },{ itemId:"minecraft:leather",label:"Da thuộc",price:18 },{ itemId:"minecraft:lapis_lazuli",label:"Ngọc lưu ly",price:12 },
  { itemId:"minecraft:amethyst_shard",label:"Mảnh thạch anh tím",price:30 },{ itemId:"minecraft:redstone",label:"Bột Redstone",price:8 },{ itemId:"minecraft:glowstone_dust",label:"Bột đá phát sáng",price:18 },
  { itemId:"minecraft:quartz",label:"Thạch anh Nether",price:20 },{ itemId:"minecraft:iron_ingot",label:"Phôi sắt",price:35 },{ itemId:"minecraft:gold_ingot",label:"Phôi vàng",price:55 },
  { itemId:"minecraft:slime_ball",label:"Bóng nhầy",price:35 },{ itemId:"minecraft:magma_cream",label:"Kem Magma",price:60 },{ itemId:"minecraft:prismarine_shard",label:"Mảnh Prismarine",price:30 },
  { itemId:"minecraft:experience_bottle",label:"Chai kinh nghiệm",price:80 },{ itemId:"minecraft:nautilus_shell",label:"Vỏ ốc anh vũ",price:220 },{ itemId:"minecraft:echo_shard",label:"Mảnh Echo",price:300 },
  { itemId:"minecraft:golden_apple",label:"Táo vàng",price:750 },
  { itemId:"mcpp:arcane_spear",label:"Thương Arcane",price:1800,stock:3 },
  { itemId:"mcpp:frost_hammer",label:"Búa Băng Nặng",price:2400,stock:2 },
  { itemId:"mcpp:shadow_dagger",label:"Dao Găm Bóng Tối",price:1500,stock:3 },
] as const;

const ITEMS_TO_BUY = [
  { itemId:"minecraft:coal",label:"Than",price:1 },{ itemId:"minecraft:raw_copper",label:"Đồng thô",price:1 },{ itemId:"minecraft:raw_iron",label:"Sắt thô",price:2 },
  { itemId:"minecraft:raw_gold",label:"Vàng thô",price:4 },{ itemId:"minecraft:redstone",label:"Redstone",price:1 },{ itemId:"minecraft:lapis_lazuli",label:"Ngọc lưu ly",price:1 },
  { itemId:"minecraft:quartz",label:"Thạch anh Nether",price:2 },{ itemId:"minecraft:diamond",label:"Kim cương",price:18 },{ itemId:"minecraft:emerald",label:"Ngọc lục bảo",price:14 },
  { itemId:"minecraft:ancient_debris",label:"Mảnh vỡ cổ đại",price:50 },{ itemId:"minecraft:rotten_flesh",label:"Thịt thối",price:1 },{ itemId:"minecraft:bone",label:"Xương",price:1 },
  { itemId:"minecraft:string",label:"Tơ",price:1 },{ itemId:"minecraft:gunpowder",label:"Thuốc súng",price:2 },{ itemId:"minecraft:spider_eye",label:"Mắt nhện",price:1 },
  { itemId:"minecraft:ender_pearl",label:"Ngọc Ender",price:6 },{ itemId:"minecraft:blaze_rod",label:"Que Blaze",price:8 },{ itemId:"minecraft:ghast_tear",label:"Nước mắt Ghast",price:24 },
  { itemId:"minecraft:phantom_membrane",label:"Màng Phantom",price:6 },{ itemId:"minecraft:wither_skeleton_skull",label:"Đầu lâu Wither Skeleton",price:80 },
] as const;

export function initArcaneMerchantService(): void {
  world.beforeEvents.playerInteractWithEntity.subscribe((ev: any) => {
    const merchant = ev.target ?? ev.targetEntity;
    if (merchant?.typeId !== MERCHANT_ID || ev.isFirstEvent === false) return;
    ev.cancel = true;
    const player = ev.player as Player;
    system.run(() => openShop(player, merchant));
  });
}

function openShop(player: Player, merchant: Entity): void {
  if (!player.isValid || !merchant.isValid || openMenus.has(player.id)) return;
  openMenus.add(player.id);
  void showMainMenu(player, merchant)
    .catch((e) => log.error("ArcaneMerchant UI loi:", e))
    .finally(() => openMenus.delete(player.id));
}

async function showMainMenu(player: Player, merchant: Entity): Promise<void> {
  const state = ensureRestocked(merchant);
  if (!merchant.nameTag) merchant.nameTag = "§5Arcane Merchant";
  const balance = CurrencyService.getBalance(player);
  const response = await new ActionFormData()
    .title("§5§lThương Nhân Arcane")
    .header(`§d✦ ${balance.toLocaleString("vi-VN")} Xu Arcane`)
    .body(`§7Làm mới sau: §f${formatRemaining(state.resetAt-Date.now())}\n§7Sách ngẫu nhiên: §f${Object.keys(state.books).length}/3 loại`)
    .button("§dKho sách kỹ năng\n§8Xem sách cấp I đang bán", "textures/items/bounty_book")
    .button("§aKho vật phẩm\n§8Nguyên liệu và đồ phiêu lưu", "textures/items/golden_apple")
    .button("§6Bán vật phẩm\n§8Đổi chiến lợi phẩm lấy xu", "textures/items/emerald")
    .button("§bBảng khả năng & giá\n§8Xem mọi cấp độ", "textures/items/mastery_codex")
    .button("§cKho vũ khí đặc biệt\n§8Nguồn nhận, nội tại và chủ động", "textures/items/runeblade")
    .button("§6Bộ sưu tập Tinh Thông\n§8Xem 8 phần thưởng đặc biệt", "textures/items/conqueror_greatsword")
    .show(player);
  if (response.canceled) return;
  if(response.selection===0)await showBuyMenu(player,merchant,"books");
  if(response.selection===1)await showBuyMenu(player,merchant,"goods");
  if(response.selection===2)await showSellMenu(player,merchant);
  if(response.selection===3)await showAbilityGuide(player);
  if(response.selection===4)await showWeaponGuide(player);
  if(response.selection===5)await showMasteryRewardGuide(player);
}

async function showWeaponGuide(player:Player):Promise<void>{
  const form=new ActionFormData().title("§cKho vũ khí đặc biệt").body("§7Mỗi vũ khí có model 3D, nhịp đánh, nội tại và kỹ năng chủ động riêng. Cúi + vung vũ khí để kích hoạt kỹ năng chủ động. Vũ khí Legendary loot không được Merchant bán.");
  for(const weapon of SPECIAL_WEAPONS)form.button(`${weapon.rarityColor}${weapon.name}\n§8[${weapon.rarity}] §7${weapon.source}`,weapon.icon);
  const result=await form.show(player);if(result.canceled||result.selection===undefined)return;const weapon=SPECIAL_WEAPONS[result.selection];
  await new ActionFormData().title(`${weapon.rarityColor}${weapon.name}`).body(`§fPhân hạng: ${weapon.rarityColor}${weapon.rarity}\n§fLoại: §7${weapon.weaponClass}\n§fNguồn nhận: §d${weapon.source}\n§fThông số: §7${weapon.combatInfo}\n\n§d✦ NỘI TẠI — ${weapon.ability}\n§fKích hoạt: §7${weapon.trigger}\n§7${weapon.description}\n\n§6◆ CHỦ ĐỘNG — ${weapon.activeSkill}\n§fKích hoạt: §7${weapon.activeTrigger}\n§7${weapon.activeDescription}`).button("§aĐóng").show(player);
}

async function showMasteryRewardGuide(player:Player):Promise<void>{
  const form=new ActionFormData().title("§6Bộ sưu tập Tinh Thông").body("§7Các vật phẩm này không bán. Hãy nâng tối đa chỉ số tương ứng để nhận một lần.");
  for(const reward of MASTERY_REWARDS)form.button(`§6${reward.itemName}\n§7${reward.statName} ${reward.maxRank}`,reward.icon);
  const res=await form.show(player);if(res.canceled||res.selection===undefined)return;const reward=MASTERY_REWARDS[res.selection];
  await new ActionFormData().title(`§6${reward.itemName}`).body(`§fYêu cầu: §d${reward.statName} ${reward.maxRank}\n\n§7${reward.description}`).button("§aĐóng").show(player);
}

async function showBuyMenu(player: Player, merchant: Entity, category: "books"|"goods"): Promise<void> {
  const state = ensureRestocked(merchant);
  const offers: Array<{
    key: string;
    itemId: string;
    label: string;
    price: number;
    stock: number;
    enchantId?: string;
    icon?: string;
  }> = [];

  if(category==="books") for (const [enchantId, stock] of Object.entries(state.books)) {
    const enchant = EnchantRegistry.get(enchantId);
    if (!enchant) continue;
    offers.push({
      key: `book:${enchantId}`,
      itemId: `${enchantId}_book`,
      label: `${ABILITY_GUIDES.find(a=>a.id===enchantId)?.name??enchant.displayName} I`,
      price: bookPrice(enchant.maxLevel),
      stock,
      enchantId,
      icon: `textures/items/${enchantId.split(":")[1]}_book`,
    });
  }
  if(category==="goods") for (const good of GOODS_FOR_SALE) {
    offers.push({ ...good, key: good.itemId, stock: state.goods[good.itemId] ?? 0 });
  }

  const form = new ActionFormData().title(category==="books"?"§5Kho sách kỹ năng":"§5Kho vật phẩm").body("§7Chọn mặt hàng rồi nhập số lượng muốn mua:");
  for (const offer of offers) {
    form.button(
      `${offer.stock > 0 ? "§f" : "§8"}${offer.label}\n§d✦ ${offer.price} §7| Còn ${offer.stock}`,
      offer.icon
    );
  }
  const response = await form.show(player);
  if (response.canceled || response.selection === undefined) return;
  const offer = offers[response.selection];
  if (!offer || offer.stock <= 0) {
    player.sendMessage("§cMặt hàng đã hết.");
    return;
  }
  const affordable = Math.floor(CurrencyService.getBalance(player) / offer.price);
  const maxQuantity = Math.min(offer.stock, affordable);
  if (maxQuantity <= 0) {
    player.sendMessage("§cKhông đủ Arcane Coin.");
    return;
  }

  const requested = await askQuantity(
    player,
    "§5Số lượng mua",
    `${offer.label}\n§7Giá: §d${offer.price} ✦/item\n§7Có thể mua tối đa: §f${maxQuantity}`,
    maxQuantity
  );
  if (!requested) return;

  const container = inventoryOf(player);
  if (!container) return;
  const inserted = addItems(container, offer.itemId, requested, offer.enchantId);
  if (inserted <= 0) {
    player.sendMessage("§cInventory đầy; không có item nào được mua.");
    return;
  }

  const totalPrice = inserted * offer.price;
  if (!CurrencyService.trySpend(player, totalPrice, undefined, `merchant_buy:${offer.itemId}`)) {
    removeItems(container, offer.itemId, inserted);
    player.sendMessage("§cSố dư đã thay đổi; giao dịch bị hủy.");
    return;
  }

  if (offer.enchantId) state.books[offer.enchantId] -= inserted;
  else state.goods[offer.itemId] -= inserted;
  saveState(merchant, state);
  player.sendMessage(`§aĐã mua ${inserted} ${offer.label} với giá ${totalPrice} ✦.`);
  if (inserted < requested) player.sendMessage(`§eInventory chỉ đủ chỗ cho ${inserted}/${requested} item.`);
}

async function showAbilityGuide(player:Player):Promise<void>{
  const form=new ActionFormData().title("§5Bảng khả năng & giá").body("§7Giá áp dụng cho sách cấp I; ghép cấp cao tại Bàn Phù Phép Arcane.");
  for(const a of ABILITY_GUIDES)form.button(`§d${a.name}\n§7I–${ROMAN_LEVELS[a.maxLevel]} | ${a.price} ✦`,`textures/items/${a.id.split(":")[1]}_book`);
  const r=await form.show(player);if(r.canceled||r.selection===undefined)return;const a=ABILITY_GUIDES[r.selection];
  await new ActionFormData().title(`§5${a.name}`).body(`§fCách dùng: §7${a.usage}\n§fGiá cấp I: §d${a.price} ✦\n\n${a.levels.map((v,i)=>`§d${ROMAN_LEVELS[i+1]} §7— ${v}`).join("\n")}`).button("§aĐóng").show(player);
}

async function showSellMenu(player: Player, merchant: Entity): Promise<void> {
  const container = inventoryOf(player);
  if (!container) return;
  const state = ensureRestocked(merchant);
  const uid = merchantUid(merchant);
  const quotas = playerQuotas(player);
  const quota = quotas[uid]?.cycle === state.resetAt ? quotas[uid] : { cycle: state.resetAt, used: {} };
  quotas[uid] = quota;

  const offers = ITEMS_TO_BUY.map((offer) => {
    const owned = countItem(container, offer.itemId);
    const remaining = Math.max(0, NORMAL_STOCK - (quota.used[offer.itemId] ?? 0));
    return { ...offer, owned, remaining, sellable: Math.min(owned, remaining) };
  });

  const form = new ActionFormData().title("§5Bán vật phẩm").body("§7Tất cả mặt hàng được thu mua đều hiển thị, kể cả khi bạn đang có 0:");
  for (const offer of offers) {
    form.button(`${offer.sellable > 0 ? "§f" : "§8"}${offer.label}\n§7Có ${offer.owned} | §d+${offer.price} ✦/item §7| Quota ${offer.remaining}`);
  }
  const response = await form.show(player);
  if (response.canceled || response.selection === undefined) return;
  const offer = offers[response.selection];
  if (!offer) return;

  if (offer.sellable <= 0) {
    player.sendMessage(offer.owned <= 0 ? "§eBạn chưa có mặt hàng này trong inventory." : "§eQuota bán mặt hàng này đã hết.");
    return;
  }

  const requested = await askQuantity(
    player,
    "§5Số lượng bán",
    `${offer.label}\n§7Giá: §d${offer.price} ✦/item\n§7Bạn có: §f${offer.owned}\n§7Có thể bán tối đa: §f${offer.sellable}`,
    offer.sellable
  );
  if (!requested) return;

  const removed = removeItems(container, offer.itemId, requested);
  if (removed <= 0) return;
  quota.used[offer.itemId] = (quota.used[offer.itemId] ?? 0) + removed;
  PlayerStore.setJson(player, QUOTA_KEY, quotas);
  const earned = removed * offer.price;
  CurrencyService.add(player, earned, undefined, `merchant_sell:${offer.itemId}`);
  player.sendMessage(`§aĐã bán ${removed} ${offer.label}, nhận ${earned} ✦.`);
}

async function askQuantity(
  player: Player,
  title: string,
  description: string,
  maximum: number
): Promise<number | undefined> {
  const response = await new ModalFormData()
    .title(title)
    .textField(`${description}\n\n§fNhập số lượng từ 1 đến ${maximum}:`, "1", { defaultValue: "1" })
    .submitButton("§aXác nhận")
    .show(player);
  if (response.canceled || !response.formValues) return undefined;
  const raw = String(response.formValues[0] ?? "").trim();
  const amount = Number(raw);
  if (!Number.isInteger(amount) || amount < 1 || amount > maximum) {
    player.sendMessage(`§cSố lượng không hợp lệ. Hãy nhập số nguyên từ 1 đến ${maximum}.`);
    return undefined;
  }
  return amount;
}

function addItems(container: Container, itemId: string, requested: number, enchantId?: string): number {
  let remaining = requested;
  while (remaining > 0) {
    const sample = new ItemStack(itemId, 1);
    if (enchantId) setCustomEnchantBookLevel(sample, enchantId, 1);
    const batch = enchantId ? 1 : Math.min(remaining, sample.maxAmount);
    sample.amount = batch;
    const leftover = container.addItem(sample);
    const inserted = batch - (leftover?.amount ?? 0);
    remaining -= inserted;
    if (inserted < batch || inserted === 0) break;
  }
  return requested - remaining;
}

function ensureRestocked(merchant: Entity): MerchantState {
  let state: MerchantState | undefined;
  const raw = merchant.getDynamicProperty(STATE_KEY);
  if (typeof raw === "string") {
    try {
      state = JSON.parse(raw) as MerchantState;
    } catch {
      // Restock moi neu data hong.
    }
  }
  if (state && Number.isFinite(state.resetAt) && Date.now() < state.resetAt) return state;

  const enchants = shuffle(EnchantRegistry.all()).slice(0, 3);
  state = { resetAt: Date.now() + RESTOCK_MS, books: {}, goods: {} };
  for (const enchant of enchants) state.books[enchant.id] = BOOK_STOCK;
  for (const good of GOODS_FOR_SALE) state.goods[good.itemId] = good.stock ?? NORMAL_STOCK;
  saveState(merchant, state);
  return state;
}

function saveState(merchant: Entity, state: MerchantState): void {
  merchant.setDynamicProperty(STATE_KEY, JSON.stringify(state));
}

function merchantUid(merchant: Entity): string {
  const existing = merchant.getDynamicProperty(UID_KEY);
  if (typeof existing === "string" && existing) return existing;
  const uid = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  merchant.setDynamicProperty(UID_KEY, uid);
  return uid;
}

function playerQuotas(player: Player): PlayerQuota {
  return PlayerStore.getJson<PlayerQuota>(player, QUOTA_KEY) ?? {};
}

function inventoryOf(player: Player): Container | undefined {
  return player.getComponent(EntityComponentTypes.Inventory)?.container;
}

function countItem(container: Container, itemId: string): number {
  let total = 0;
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item?.typeId === itemId) total += item.amount;
  }
  return total;
}

function removeItems(container: Container, itemId: string, requested: number): number {
  let remaining = requested;
  for (let slot = 0; slot < container.size && remaining > 0; slot++) {
    const item = container.getItem(slot);
    if (!item || item.typeId !== itemId) continue;
    const take = Math.min(item.amount, remaining);
    remaining -= take;
    if (take === item.amount) container.setItem(slot, undefined);
    else {
      item.amount -= take;
      container.setItem(slot, item);
    }
  }
  return requested - remaining;
}

function bookPrice(maxLevel: number): number {
  if (maxLevel === 5) return 200;
  if (maxLevel === 3) return 300;
  return 650;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
