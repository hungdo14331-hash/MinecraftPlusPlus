export interface SpecialWeaponGuide {
  itemId:string;
  name:string;
  rarity:"Hiếm"|"Sử Thi"|"Huyền Thoại"|"Thần Thoại";
  rarityColor:string;
  weaponClass:string;
  source:string;
  ability:string;
  description:string;
  trigger:string;
  activeSkill:string;
  activeDescription:string;
  activeTrigger:string;
  combatInfo:string;
  icon:string;
}

export const SPECIAL_WEAPONS:ReadonlyArray<SpecialWeaponGuide> = [
  {itemId:"mcpp:conqueror_greatsword",name:"Đại Kiếm Kẻ Chinh Phục",rarity:"Thần Thoại",rarityColor:"§6",weaponClass:"Đại kiếm",source:"Tinh Thông Sức Mạnh X",ability:"Chém Lan",description:"Chém thêm các mục tiêu quanh nạn nhân chính khi phần thưởng Tinh Thông còn hoạt động.",trigger:"Hồi chiêu 1 giây",activeSkill:"Vương Trảm",activeDescription:"Quét cung 120° trong 4,5 block, gây 9 damage lên tối đa 6 mục tiêu.",activeTrigger:"Cúi + vung • Hồi 12 giây",combatInfo:"12 damage • 22 tick • Xuyên giáp 10%",icon:"textures/items/conqueror_greatsword"},
  {itemId:"mcpp:chronoblade",name:"Thời Đao",rarity:"Thần Thoại",rarityColor:"§d",weaponClass:"Kiếm nhanh",source:"Tinh Thông Khéo Léo VIII",ability:"Gia Tốc Thời Gian",description:"Gây sát thương thật ở nhịp đánh cực nhanh; Sloth tiếp tục rút ngắn nhịp.",trigger:"Nội tại liên tục",activeSkill:"Thời Giới",activeDescription:"Tăng tốc bản thân, làm chậm quái trong 5 block và cường hóa 3 đòn kế tiếp.",activeTrigger:"Cúi + vung • Hồi 18 giây",combatInfo:"8 damage • 8 tick • Crit 5%",icon:"textures/items/chronoblade"},
  {itemId:"mcpp:arcane_spear",name:"Thương Arcane",rarity:"Sử Thi",rarityColor:"§b",weaponClass:"Thương",source:"Arcane Merchant",ability:"Xuyên Kích Arcane",description:"Gây thêm 2,5 sát thương chuẩn, giảm một nửa khi đánh người chơi.",trigger:"Mỗi đòn thứ 3",activeSkill:"Nhất Tuyến Xuyên Tinh",activeDescription:"Đâm xuyên 7 block và tối đa 4 mục tiêu, gây 6 damage cùng 2 damage chuẩn.",activeTrigger:"Cúi + vung • Hồi 9 giây",combatInfo:"9 damage • 15 tick • Xuyên giáp 20%",icon:"textures/items/arcane_spear"},
  {itemId:"mcpp:frost_hammer",name:"Búa Băng Nặng",rarity:"Sử Thi",rarityColor:"§3",weaponClass:"Búa chiến",source:"Arcane Merchant",ability:"Chấn Động Băng Giá",description:"Tạo sóng băng làm chậm mục tiêu và gây damage lên quái xung quanh.",trigger:"Hồi chiêu 5 giây",activeSkill:"Đại Chấn Vĩnh Đông",activeDescription:"Gây 6 damage trong bán kính 4 block, làm chậm và đông cứng ngắn mob thường.",activeTrigger:"Cúi + vung • Hồi 14 giây",combatInfo:"11 damage • 22 tick • Knockback cao",icon:"textures/items/frost_hammer"},
  {itemId:"mcpp:shadow_dagger",name:"Dao Găm Bóng Tối",rarity:"Sử Thi",rarityColor:"§5",weaponClass:"Dao găm",source:"Arcane Merchant",ability:"Bước Bóng",description:"Gây thêm sát thương chuẩn và nhận Speed II trong thời gian ngắn.",trigger:"Mỗi đòn thứ 4",activeSkill:"Ảnh Kích",activeDescription:"Lao 4 block, gây 6 damage chuẩn rồi tăng tốc và tàng hình trong chốc lát.",activeTrigger:"Cúi + vung • Hồi 9 giây",combatInfo:"6 damage • 7 tick • Crit 15%",icon:"textures/items/shadow_dagger"},
  {itemId:"mcpp:runeblade",name:"Kiếm Cổ Ngữ",rarity:"Hiếm",rarityColor:"§9",weaponClass:"Kiếm",source:"Chế tạo",ability:"Dội Âm Cổ Ngữ",description:"Kích nổ rune trên mục tiêu để gây thêm 2 sát thương chuẩn.",trigger:"Mỗi đòn thứ 3",activeSkill:"Ấn Rune Bộc Phá",activeDescription:"Gây 5 damage trong 3,5 block và khiến Dội Âm kế tiếp mạnh thêm 3 damage chuẩn.",activeTrigger:"Cúi + vung • Hồi 11 giây",combatInfo:"9 damage • 13 tick • Xuyên giáp 10%",icon:"textures/items/runeblade"},
  {itemId:"mcpp:titan_maul",name:"Chùy Titan",rarity:"Sử Thi",rarityColor:"§6",weaponClass:"Đại chùy",source:"Chế tạo",ability:"Địa Chấn Titan",description:"Gây damage diện rộng và hất văng quái quanh mục tiêu.",trigger:"Hồi chiêu 6 giây",activeSkill:"Thiên Chùy Giáng Thế",activeDescription:"Nện bán kính 4,5 block, gây 8 damage, hất văng và làm suy yếu mục tiêu.",activeTrigger:"Cúi + vung • Hồi 16 giây",combatInfo:"13 damage • 26 tick • Knockback cực cao",icon:"textures/items/titan_maul"},
  {itemId:"mcpp:gale_glaive",name:"Trường Đao Cuồng Phong",rarity:"Sử Thi",rarityColor:"§b",weaponClass:"Trường đao",source:"Chế tạo",ability:"Phong Bộ",description:"Mỗi đòn cho Speed II; đòn thứ tư tạo lực đẩy mạnh.",trigger:"Mỗi đòn thứ 4",activeSkill:"Cuồng Phong Luân Vũ",activeDescription:"Quét 360° trong 4 block, gây 5 damage, hất văng và nhận Speed III.",activeTrigger:"Cúi + vung • Hồi 10 giây",combatInfo:"8 damage • 11 tick • Xuyên giáp 12%",icon:"textures/items/gale_glaive"},
  {itemId:"mcpp:ember_cleaver",name:"Đại Đao Dung Nham",rarity:"Huyền Thoại",rarityColor:"§c",weaponClass:"Đại đao",source:"Bastion/Pháo đài Nether",ability:"Hỏa Ngục",description:"Thiêu cháy mục tiêu và định kỳ phát nổ lửa không phá block.",trigger:"Hồi chiêu bùng nổ 4 giây",activeSkill:"Liệt Hỏa Trảm",activeDescription:"Phóng nón lửa dài 6 block, gây 8–10 damage và thiêu cháy trong 5 giây.",activeTrigger:"Cúi + vung • Hồi 13 giây",combatInfo:"12 damage • 19 tick • Xuyên giáp 18%",icon:"textures/items/ember_cleaver"},
  {itemId:"mcpp:void_reaper",name:"Lưỡi Hái Hư Không",rarity:"Thần Thoại",rarityColor:"§5",weaponClass:"Lưỡi hái",source:"Ancient City/End City",ability:"Thu Hoạch Linh Hồn",description:"Gây thêm 4 sát thương chuẩn lên mục tiêu dưới 30% máu và hồi 1 tim.",trigger:"Hồi chiêu 2 giây",activeSkill:"Nguyệt Thực Linh Hồn",activeDescription:"Quét cung 140° trong 5 block; mục tiêu yếu chịu thêm damage và hồi máu cho chủ nhân.",activeTrigger:"Cúi + vung • Hồi 18 giây",combatInfo:"10 damage • 15 tick • Xuyên giáp 25%",icon:"textures/items/void_reaper"},
];

export const SPECIAL_WEAPON_BY_ID = new Map(SPECIAL_WEAPONS.map(weapon => [weapon.itemId, weapon]));
