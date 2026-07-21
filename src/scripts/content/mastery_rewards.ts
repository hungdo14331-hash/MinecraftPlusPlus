export interface MasteryRewardGuide {
  statId:string; statName:string; maxRank:number; itemId:string; itemName:string; icon:string; description:string;
}

export const MASTERY_REWARDS:MasteryRewardGuide[]=[
  {statId:"vitality",statName:"Sinh Lực",maxRank:10,itemId:"mcpp:immortal_heart",itemName:"Trái Tim Bất Diệt",icon:"textures/items/immortal_heart",description:"Khi máu sắp xuống dưới 20%, giảm 40% sát thương của đòn đó; hồi 90 giây."},
  {statId:"strength",statName:"Sức Mạnh",maxRank:10,itemId:"mcpp:conqueror_greatsword",itemName:"Đại Kiếm Kẻ Chinh Phục",icon:"textures/items/conqueror_greatsword",description:"Đại kiếm 12 damage, 10% xuyên giáp và chém lan khi Sức Mạnh vẫn ở rank X."},
  {statId:"precision",statName:"Chính Xác",maxRank:8,itemId:"mcpp:hunter_eye",itemName:"Mắt Thần Thợ Săn",icon:"textures/items/hunter_eye",description:"Tăng thêm 5% tỷ lệ chí mạng MC++ khi mang trong inventory."},
  {statId:"agility",statName:"Nhanh Nhẹn",maxRank:8,itemId:"mcpp:wind_talisman",itemName:"Bùa Gió Arcane",icon:"textures/items/wind_talisman",description:"Tăng thêm 10% tốc chạy khi mang trong inventory."},
  {statId:"dexterity",statName:"Khéo Léo",maxRank:8,itemId:"mcpp:chronoblade",itemName:"Thời Đao",icon:"textures/items/chronoblade",description:"Vũ khí nhẹ 8 damage; gây được đòn nhanh mỗi 6 tick, còn 4–5 tick khi có Sloth."},
  {statId:"defense",statName:"Phòng Thủ",maxRank:8,itemId:"mcpp:fortress_core",itemName:"Lõi Thành Trì",icon:"textures/items/fortress_core",description:"Giảm thêm 10% sát thương khi mang trong inventory."},
  {statId:"recovery",statName:"Hồi Phục",maxRank:6,itemId:"mcpp:life_relic",itemName:"Thánh Vật Sinh Mệnh",icon:"textures/items/life_relic",description:"Tăng thêm 15% hồi máu và thanh tẩy Decay mỗi giây."},
  {statId:"prosperity",statName:"Thịnh Vượng",maxRank:6,itemId:"mcpp:royal_charm",itemName:"Bùa Vương Giả",icon:"textures/items/royal_charm",description:"Tăng thêm 25% tiền cơ bản từ quái khi mang trong inventory."},
];
