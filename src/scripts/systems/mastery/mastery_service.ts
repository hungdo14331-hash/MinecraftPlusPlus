import { EntityComponentTypes, EquipmentSlot, ItemStack, system, type Player } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { EventBus } from "../../core/events/event_bus";
import { Events } from "../../core/events/event_names";
import { PlayerStore } from "../../core/data/player_store";
import { MobRewardRegistry } from "../../core/registry/registries";
import { log } from "../../core/utils/logger";
import { applyMasteryAttributes } from "./mastery_modifiers";
import { masteryBonus, masteryBonusAtRank } from "./mastery_modifiers";
import { ABILITY_GUIDES, ROMAN_LEVELS } from "../../content/ability_catalog";
import { MASTERY_REWARDS } from "../../content/mastery_rewards";
import { pushHudNotification } from "../targeting/hud_notification_service";
import { SPECIAL_WEAPONS } from "../../content/weapon_catalog";
import { getDiscoveredWeaponIds } from "../weapons/weapon_identity_service";
import { ADDON_VERSION } from "../../core/config/constants";

const DATA_KEY = "mcpp:mastery_data";
const AWAKENING_TOME = "mcpp:awakening_tome";
const MASTERY_CODEX = "mcpp:mastery_codex";
const ONBOARDING_KEY = "mcpp:onboarding_seen";
const MAX_LEVEL = 50;

const STATS = [
  { id: "vitality", label: "Sinh Lực", max: 10 }, { id: "strength", label: "Sức Mạnh", max: 10 },
  { id: "precision", label: "Chính Xác", max: 8 }, { id: "agility", label: "Nhanh Nhẹn", max: 8 },
  { id: "dexterity", label: "Khéo Léo", max: 8 }, { id: "defense", label: "Phòng Thủ", max: 8 },
  { id: "recovery", label: "Hồi Phục", max: 6 }, { id: "prosperity", label: "Thịnh Vượng", max: 6 },
] as const;

type StatId = typeof STATS[number]["id"];
interface MasteryData { unlocked: boolean; level: number; xp: number; points: number; stats: Record<StatId, number>; rewards: Record<string, boolean>; }
const openMenus = new Set<string>();
const lockedNoticeTick=new Map<string,number>();

function freshData(): MasteryData {
  return { unlocked: false, level: 0, xp: 0, points: 0, stats: Object.fromEntries(STATS.map(s => [s.id, 0])) as Record<StatId, number>, rewards: {} };
}
export function getMasteryData(player: Player): MasteryData { const base=freshData();const stored=PlayerStore.getJson<MasteryData>(player, DATA_KEY);return { ...base, ...stored, stats:{...base.stats,...stored?.stats}, rewards:{...base.rewards,...stored?.rewards} }; }
function save(player: Player, data: MasteryData): void { PlayerStore.setJson(player, DATA_KEY, data); }
export function xpForNext(level: number): number { return 80 + 20 * level + 4 * level * level; }
function pointCost(nextRank: number): number { return nextRank <= 5 ? 1 : 2; }

export function initMasteryService(): void {
  EventBus.on(Events.World.ItemUse, (ev: any) => handleUse(ev.source, ev.itemStack));
  EventBus.on(Events.Combat.Death, (ev: any) => rewardKill(ev));
  EventBus.on(Events.Lifecycle.PlayerSpawn, (ev:any) => system.run(() => {
    ensureEarnedRewards(ev.player);
    if(ev.initialSpawn)showFirstJoinHint(ev.player);
  }));
  system.afterEvents.scriptEventReceive.subscribe(ev => {
    if (ev.id !== "mcpp:mastery" || ev.sourceEntity?.typeId !== "minecraft:player") return;
    handleCommand(ev.sourceEntity as Player, ev.message);
  });
}

function showFirstJoinHint(player:Player):void{
  if(PlayerStore.getJson<boolean>(player,ONBOARDING_KEY))return;
  PlayerStore.setJson(player,ONBOARDING_KEY,true);
  system.runTimeout(()=>{
    if(!player.isValid)return;
    player.sendMessage(`§5§lMinecraft++ v${ADDON_VERSION} §r§fđã sẵn sàng.`);
    player.sendMessage("§7Bắt đầu bằng §dSách Thức Tỉnh§7. Sau đó dùng §5Bách Khoa Sức Mạnh §7để xem toàn bộ tiến trình.");
    pushHudNotification(player,"§d✦ Chào mừng đến với Minecraft++",70,3);
    try{player.playSound("random.levelup",{volume:0.65,pitch:1.05});}catch{}
  },40);
}

function handleUse(player: Player, item: ItemStack): void {
  if (item?.typeId === AWAKENING_TOME) system.run(() => awaken(player));
  if (item?.typeId === MASTERY_CODEX) system.run(() => openCodex(player));
}
function awaken(player: Player): void {
  const data = getMasteryData(player);
  if (data.unlocked) { player.sendMessage("§eBạn đã thức tỉnh Arcane Mastery."); return; }
  data.unlocked = true; data.level = 1; data.points = 1; save(player, data);
  consumeMainhand(player, AWAKENING_TOME);
  giveItem(player, MASTERY_CODEX);
  player.sendMessage("§d✦ Arcane Mastery đã thức tỉnh! §fBạn nhận 1 Mastery Point.");
}
function consumeMainhand(player: Player, typeId: string): void {
  const eq = player.getComponent(EntityComponentTypes.Equippable); const item = eq?.getEquipment(EquipmentSlot.Mainhand);
  if (!eq || item?.typeId !== typeId) return;
  if (item.amount <= 1) eq.setEquipment(EquipmentSlot.Mainhand, undefined); else { item.amount--; eq.setEquipment(EquipmentSlot.Mainhand, item); }
}
function giveItem(player: Player, typeId: string, lore?:string[]): void {
  const item = new ItemStack(typeId, 1);if(lore)item.setLore(lore); const inv = player.getComponent(EntityComponentTypes.Inventory)?.container; const left = inv?.addItem(item);
  if (!inv || left) player.dimension.spawnItem(left ?? item, player.location);
}
function rewardKill(ev: any): void {
  const player = ev.damageSource?.damagingEntity as Player | undefined;
  if (player?.typeId !== "minecraft:player") return;
  const reward = MobRewardRegistry.get(ev.deadEntity?.typeId); if (!reward) return;
  const data = getMasteryData(player); if (!data.unlocked || data.level >= MAX_LEVEL) return;
  const base = reward.minCoins + Math.floor(Math.random() * (reward.maxCoins - reward.minCoins + 1));
  addXp(player, Math.max(1, Math.floor(base * 1.5)));
}
function addXp(player: Player, amount: number): void {
  const data = getMasteryData(player); if (!data.unlocked || amount <= 0) return;
  data.xp += Math.floor(amount); let gained = 0;
  while (data.level < MAX_LEVEL && data.xp >= xpForNext(data.level)) { data.xp -= xpForNext(data.level); data.level++; data.points++; gained++; }
  if (data.level >= MAX_LEVEL) data.xp = 0; save(player, data);
  pushHudNotification(player,`§b✦ Mastery +${amount} XP${gained ? ` §d| Level ${data.level}!` : ""}`,gained?60:30,gained?3:1);
}

async function openCodex(player: Player): Promise<void> {
  if (openMenus.has(player.id)) return; const data = getMasteryData(player);
  if (!data.unlocked) { const now=system.currentTick;if(now-(lockedNoticeTick.get(player.id)??-999)>=40){lockedNoticeTick.set(player.id,now);player.sendMessage("§cHãy sử dụng Sách Thức Tỉnh trước khi mở Bách Khoa Sức Mạnh.");} return; }
  openMenus.add(player.id);
  try {
    const need = data.level >= MAX_LEVEL ? "MAX" : `${data.xp}/${xpForNext(data.level)}`;
    const res = await new ActionFormData().title("§5§lBách Khoa Sức Mạnh").header(`§dCấp ${data.level}/${MAX_LEVEL} §7| §f${need} XP`).body(`§bĐiểm chưa dùng: ${data.points}\n§7Chọn bảng muốn xem:`)
      .button("§5Hướng dẫn Minecraft++\n§8Vòng chơi, tiến trình và cách bắt đầu", "textures/items/awakening_tome")
      .button("§aNâng cấp chỉ số\n§8Phân phối điểm sức mạnh", "textures/items/mastery_codex")
      .button("§bChỉ số hiện tại\n§8Xem toàn bộ hiệu quả đang có")
      .button("§dKhả năng đặc biệt\n§8Cấp độ, cách dùng và giá sách", "textures/items/critical_book")
      .button("§cBộ sưu tập vũ khí\n§8Nguồn nhận, nội tại và chủ động", "textures/items/void_reaper")
      .button("§6Phần thưởng Tinh Thông\n§8Di vật nhận được khi max chỉ số", "textures/items/conqueror_greatsword")
      .button("§cReset chỉ số\n§8Hoàn lại toàn bộ điểm đã dùng")
      .show(player);
    if (res.canceled || res.selection === undefined) return;
    if (res.selection === 0) await showQuickGuide(player);
    if (res.selection === 1) await showUpgradeTable(player);
    if (res.selection === 2) await showCurrentStats(player);
    if (res.selection === 3) await showAbilityTable(player);
    if (res.selection === 4) await showWeaponCollection(player);
    if (res.selection === 5) await showMasteryRewards(player);
    if (res.selection === 6) await confirmStatReset(player);
  } catch (e) { log.error("Mastery Codex UI loi:", e); } finally { openMenus.delete(player.id); }
}
async function showQuickGuide(player:Player):Promise<void>{
  await new ActionFormData().title(`§5§lMinecraft++ v${ADDON_VERSION}`).body(
    "§d1. THỨC TỈNH\n§7Chế tạo và sử dụng Sách Thức Tỉnh để mở Arcane Mastery.\n\n"+
    "§b2. PHÁT TRIỂN\n§7Diệt quái nhận Mastery XP và Arcane Coin. Dùng điểm để nâng chỉ số.\n\n"+
    "§63. SĂN TRANG BỊ\n§7Mua sách cấp I từ Merchant, ghép sách tại Bàn Phù Phép Arcane và tìm vũ khí hiếm trong công trình.\n\n"+
    "§c4. TINH THÔNG\n§7Nâng tối đa từng chỉ số để nhận di vật hoặc vũ khí độc quyền.\n\n"+
    "§e5. KỸ NĂNG CHỦ ĐỘNG\n§7Cầm vũ khí đặc biệt, cúi và vung vũ khí để thi triển. Mỗi kỹ năng có hồi chiêu riêng.\n\n"+
    "§8Mẹo: cầm một vũ khí đặc biệt để tự thêm lore và ghi nhận vào Bộ sưu tập."
  ).button("§aĐã hiểu").show(player);
}
async function showWeaponCollection(player:Player):Promise<void>{
  const discovered=getDiscoveredWeaponIds(player);const form=new ActionFormData().title("§c§lBộ sưu tập vũ khí").body(`§fĐã khám phá: §d${discovered.size}/${SPECIAL_WEAPONS.length}\n§7Cầm hoặc nhặt vũ khí để ghi nhận vĩnh viễn.`);
  for(const weapon of SPECIAL_WEAPONS){const owned=playerHasItem(player,weapon.itemId);const known=discovered.has(weapon.itemId);const status=owned?"§aĐANG SỞ HỮU":known?"§eĐÃ KHÁM PHÁ":"§8CHƯA KHÁM PHÁ";form.button(`${weapon.rarityColor}${weapon.name}\n${status} §8• ${weapon.rarity}`,weapon.icon);}
  const res=await form.show(player);if(res.canceled||res.selection===undefined)return;const weapon=SPECIAL_WEAPONS[res.selection];
  await new ActionFormData().title(`${weapon.rarityColor}${weapon.name}`).body(
    `§fPhân hạng: ${weapon.rarityColor}${weapon.rarity}\n§fLoại: §7${weapon.weaponClass}\n§fNguồn: §d${weapon.source}\n§fThông số: §7${weapon.combatInfo}\n\n§d✦ NỘI TẠI — ${weapon.ability}\n§fKích hoạt: §7${weapon.trigger}\n§7${weapon.description}\n\n§6◆ CHỦ ĐỘNG — ${weapon.activeSkill}\n§fKích hoạt: §7${weapon.activeTrigger}\n§7${weapon.activeDescription}`
  ).button("§aĐã hiểu").show(player);
}
async function showMasteryRewards(player:Player):Promise<void>{
  const data=getMasteryData(player);const form=new ActionFormData().title("§6Phần thưởng Tinh Thông").body("§7Mỗi phần thưởng chỉ được nhận một lần. Reset chỉ số không cấp lại vật phẩm.");
  for(const reward of MASTERY_REWARDS){const rank=data.stats[reward.statId as StatId]??0;const claimed=data.rewards[reward.statId]===true;const active=rank>=reward.maxRank&&playerHasItem(player,reward.itemId);form.button(`§6${reward.itemName}\n§7${reward.statName} ${rank}/${reward.maxRank} | ${active?"§aĐANG HOẠT ĐỘNG":claimed?"§eĐã nhận, chưa hoạt động":"§cChưa nhận"}`,reward.icon);}
  const res=await form.show(player);if(res.canceled||res.selection===undefined)return;const reward=MASTERY_REWARDS[res.selection];
  await new ActionFormData().title(`§6${reward.itemName}`).body(`§fYêu cầu: §d${reward.statName} ${reward.maxRank}\n\n§7${reward.description}\n\n§cNăng lực đặc biệt chỉ hoạt động khi chỉ số tương ứng vẫn đạt tối đa.`).button("§aĐã hiểu").show(player);
}
function playerHasItem(player:Player,itemId:string):boolean{
  const container=player.getComponent(EntityComponentTypes.Inventory)?.container;if(!container)return false;
  for(let slot=0;slot<container.size;slot++)if(container.getItem(slot)?.typeId===itemId)return true;
  return false;
}
function spentMasteryPoints(data: MasteryData): number {
  return STATS.reduce((total, stat) => {
    const rank = Math.max(0, Math.min(stat.max, data.stats[stat.id] ?? 0));
    return total + Math.min(rank, 5) + Math.max(0, rank - 5) * 2;
  }, 0);
}
async function confirmStatReset(player: Player): Promise<void> {
  const data = getMasteryData(player);
  const refund = spentMasteryPoints(data);
  if (refund <= 0) {
    player.sendMessage("§eBạn chưa dùng điểm chỉ số nào để reset.");
    return;
  }
  const res = await new MessageFormData()
    .title("§cReset chỉ số")
    .body(`Toàn bộ chỉ số sẽ trở về 0.\n\n§fCấp Mastery: §d${data.level} §7(được giữ lại)\n§fXP hiện tại: §d${data.xp} §7(được giữ lại)\n§fĐiểm sẽ hoàn: §a${refund}\n§fTổng điểm sau reset: §a${data.points + refund}\n\n§cBạn có chắc muốn reset?`)
    .button1("§7Hủy")
    .button2("§cXác nhận reset")
    .show(player);
  if (res.canceled || res.selection !== 1) return;
  const latest = getMasteryData(player);
  const latestRefund = spentMasteryPoints(latest);
  if (latestRefund <= 0) return;
  latest.points += latestRefund;
  latest.stats = Object.fromEntries(STATS.map(stat => [stat.id, 0])) as Record<StatId, number>;
  save(player, latest);
  applyMasteryAttributes(player);
  player.sendMessage(`§aĐã reset chỉ số và hoàn lại ${latestRefund} Mastery Point. §fCấp Mastery và XP được giữ nguyên.`);
}
async function showUpgradeTable(player: Player): Promise<void> {
  while(player.isValid){
    const data=getMasteryData(player); const form=new ActionFormData().title("§5Nâng cấp chỉ số").body(`§bĐiểm: ${data.points}\n§7Chọn chỉ số rồi nâng nhiều rank trong một lần.`);
    for(const stat of STATS){const rank=data.stats[stat.id]??0;form.button(`§f${stat.label} §d${rank}/${stat.max}\n§7${statEffectAtRank(stat.id,rank)} | ${rank>=stat.max?"MAX":"Chọn rank đích"}`);}
    form.button("§7← Quay lại Bách Khoa");
    const res=await form.show(player);if(res.canceled||res.selection===undefined||res.selection>=STATS.length)return;
    await bulkUpgradeFlow(player,STATS[res.selection]);
  }
}
async function showCurrentStats(player: Player): Promise<void> {
  const data=getMasteryData(player); const lines=STATS.map(s=>`§f${s.label}: §d${data.stats[s.id]??0}/${s.max} §7— ${statEffect(player,s.id)}`);
  await new ActionFormData().title("§5Chỉ số hiện tại").body(lines.join("\n")).button("§aĐã hiểu").show(player);
}
async function showAbilityTable(player: Player): Promise<void> {
  const form=new ActionFormData().title("§5Khả năng đặc biệt").body("§7Merchant chỉ bán sách cấp I. Cấp cao hơn ghép tại Bàn Phù Phép Arcane.");
  for(const a of ABILITY_GUIDES) form.button(`§d${a.name}\n§7I–${ROMAN_LEVELS[a.maxLevel]} | Giá cấp I: ${a.price} ✦`,`textures/items/${a.id.split(":")[1]}_book`);
  const res=await form.show(player); if(res.canceled||res.selection===undefined)return; const a=ABILITY_GUIDES[res.selection];
  await new ActionFormData().title(`§5${a.name}`).body(`§fCách dùng: §7${a.usage}\n§fGiá sách cấp I: §d${a.price} ✦\n\n${a.levels.map((v,i)=>`§d${ROMAN_LEVELS[i+1]} §7— ${v}`).join("\n")}`).button("§aĐã hiểu").show(player);
}
function statEffect(player: Player,id:StatId):string {
  return statEffectAtRank(id,getMasteryData(player).stats[id]??0);
}
function statEffectAtRank(id:StatId,rank:number):string{
  if(id==="vitality"){const hearts=[10,12,14,16,18,20,24,28,32,36,40];return `${hearts[Math.min(10,Math.max(0,rank))]} tim tối đa`;}
  const value=Math.round(masteryBonusAtRank(id as any,rank)*100); const names:Record<string,string>={strength:"damage",precision:"tỷ lệ Crit",agility:"tốc chạy",dexterity:"tốc đánh",defense:"giảm damage",recovery:"hiệu quả hồi máu",prosperity:"tiền cơ bản"};
  return `+${value}% ${names[id]}`.replace("+-","-");
}
function costBetween(current:number,target:number):number{let total=0;for(let rank=current+1;rank<=target;rank++)total+=pointCost(rank);return total;}
function maxAffordableRank(current:number,max:number,points:number):number{let rank=current,left=points;while(rank<max){const cost=pointCost(rank+1);if(left<cost)break;left-=cost;rank++;}return rank;}
async function bulkUpgradeFlow(player:Player,stat:typeof STATS[number]):Promise<void>{
  const data=getMasteryData(player);const current=data.stats[stat.id]??0;if(current>=stat.max){player.sendMessage(`§e${stat.label} đã đạt tối đa.`);return;}
  const affordable=maxAffordableRank(current,stat.max,data.points);if(affordable<=current){player.sendMessage(`§cKhông đủ Mastery Point để nâng ${stat.label}.`);return;}
  const pick=await new ModalFormData().title(`§5Nâng ${stat.label}`).slider(
    `§fChọn rank đích\n§7Hiện tại: ${current}/${stat.max} — ${statEffectAtRank(stat.id,current)}\n§7Tối đa có thể nâng: ${affordable}`,
    current+1,affordable,{valueStep:1,defaultValue:affordable,tooltip:"Kéo tới rank muốn nâng trong lần này."}
  ).submitButton("§aXem và xác nhận").show(player);
  if(pick.canceled||!pick.formValues)return;const target=Math.floor(Number(pick.formValues[0]));if(!Number.isFinite(target)||target<=current||target>affordable)return;
  const cost=costBetween(current,target);
  const confirm=await new MessageFormData().title(`§5Xác nhận nâng ${stat.label}`).body(
    `§fRank: §d${current} → ${target}\n§fHiệu quả: §7${statEffectAtRank(stat.id,current)} §f→ §a${statEffectAtRank(stat.id,target)}\n§fTổng chi phí: §c${cost} điểm\n§fĐiểm còn lại: §b${data.points-cost}${target===stat.max?"\n\n§6✦ Sẽ mở khóa phần thưởng Tinh Thông!":""}`
  ).button1("§7Quay lại").button2("§aNâng ngay").show(player);
  if(confirm.canceled||confirm.selection!==1)return;
  const latest=getMasteryData(player);const latestCurrent=latest.stats[stat.id]??0;const latestCost=costBetween(latestCurrent,target);
  if(target<=latestCurrent||target>stat.max||latest.points<latestCost){player.sendMessage("§cĐiểm hoặc rank đã thay đổi; hãy chọn lại.");return;}
  latest.points-=latestCost;latest.stats[stat.id]=target;awardMasteryReward(player,latest,stat.id,stat.max);save(player,latest);applyMasteryAttributes(player);
  player.sendMessage(`§aĐã nâng ${stat.label} từ ${latestCurrent} lên ${target}, dùng ${latestCost} điểm.`);
}
function awardMasteryReward(player:Player,data:MasteryData,statId:StatId,maxRank:number):void{
  if((data.stats[statId]??0)<maxRank||data.rewards[statId])return;
  const reward=MASTERY_REWARDS.find(entry=>entry.statId===statId);if(!reward)return;
  data.rewards[statId]=true;giveItem(player,reward.itemId,[`§r§6Tinh Thông: ${reward.statName} ${reward.maxRank}`,`§r§7${reward.description}`]);
  player.sendMessage(`§6✦ TINH THÔNG ${reward.statName.toUpperCase()}! §fBạn nhận được §d${reward.itemName}§f. Năng lực chỉ hoạt động khi ${reward.statName} vẫn đạt tối đa.`);
}
function ensureEarnedRewards(player:Player):void{
  const data=getMasteryData(player);const before=JSON.stringify(data.rewards);
  for(const reward of MASTERY_REWARDS)awardMasteryReward(player,data,reward.statId as StatId,reward.maxRank);
  if(JSON.stringify(data.rewards)!==before)save(player,data);
}
function handleCommand(player: Player, message: string): void {
  const [cmd, raw] = message.trim().toLowerCase().split(/\s+/);
  if (cmd === "give") { giveItem(player, raw === "codex" ? MASTERY_CODEX : AWAKENING_TOME); return; }
  if (cmd === "xp") { addXp(player, Number(raw) || 0); return; }
  if (cmd === "open") { void openCodex(player); return; }
  if (cmd === "reset") {
    if (raw !== "confirm") { player.sendMessage("§cLệnh này xóa toàn bộ Mastery. Dùng: §f/scriptevent mcpp:mastery reset confirm"); return; }
    save(player, freshData());
    applyMasteryAttributes(player);
    player.sendMessage("§cĐã reset hoàn toàn Arcane Mastery. Bạn có thể dùng Awakening Tome để bắt đầu lại.");
    return;
  }
  player.sendMessage("§7mcpp:mastery: give awakening|codex, xp <số>, open, reset confirm");
}
