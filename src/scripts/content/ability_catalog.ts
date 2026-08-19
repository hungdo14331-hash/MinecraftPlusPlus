export interface AbilityGuide {
  id: string; name: string; maxLevel: number; price: number; usage: string; levels: string[];
}
export const ABILITY_GUIDES: AbilityGuide[] = [
  { id:"mcpp:vampire", name:"Hút Máu (Vampire)", maxLevel:5, price:200, usage:"Nội tại khi kiếm gây sát thương.", levels:["Hồi 5% sát thương","Hồi 10%","Hồi 15%","Hồi 20%","Hồi 25%"] },
  { id:"mcpp:sloth", name:"Tốc Đánh (Sloth)", maxLevel:3, price:300, usage:"Nội tại khi cầm kiếm.", levels:["+20% tốc đánh","+40% tốc đánh","+60% tốc đánh"] },
  { id:"mcpp:momentum", name:"Động Lực (Momentum)", maxLevel:3, price:300, usage:"Đánh trúng để tăng tốc chạy 4 giây.", levels:["Tối đa +20%","Tối đa +40%","Tối đa +60%"] },
  { id:"mcpp:bounty", name:"Tiền Thưởng (Bounty)", maxLevel:5, price:200, usage:"Cầm kiếm khi hạ quái.", levels:["20% nhận +3 xu","25% nhận +3 xu","30% nhận +3 xu","35% nhận +3 xu","50% nhận +5 xu"] },
  { id:"mcpp:piercing", name:"Xuyên Giáp (Piercing)", maxLevel:3, price:300, usage:"Nội tại khi kiếm đánh trúng.", levels:["5% damage kiếm thành True Damage","10% True Damage","15% True Damage"] },
  { id:"mcpp:decay", name:"Suy Tàn (Decay)", maxLevel:3, price:300, usage:"Đánh trúng gây giảm hồi máu trong 5 giây.", levels:["PvE 35% / PvP 21%","PvE 70% / PvP 42%","PvE 100% / PvP 60%"] },
  { id:"mcpp:frostbite", name:"Băng Giá (Frostbite)", maxLevel:3, price:300, usage:"Mỗi đòn luôn làm chậm; Freeze hiếm và có miễn nhiễm để không khóa liên tục.", levels:["-10% 1s; 3% Freeze","-20% 1,5s; 5% Freeze","-30% 2s; 8% Freeze"] },
  { id:"mcpp:critical", name:"Chí Mạng (Critical)", maxLevel:5, price:200, usage:"Roll riêng mỗi đòn kiếm hợp lệ; damage ×1,85.", levels:["10% Crit","15% Crit","20% Crit","25% Crit","30% Crit"] },
  { id:"mcpp:parry", name:"Phản Đòn (Parry)", maxLevel:3, price:300, usage:"Thả rồi bấm sneak ngay trước khi bị đánh cận chiến.", levels:["4 tick; phản 30%; CD 3s","5 tick; phản 50%; CD 2,5s","6 tick; phản 70%; CD 2s; 10% Freeze"] },
  { id:"mcpp:earthshatter", name:"Địa Chấn (Earthshatter)", maxLevel:3, price:300, usage:"Cúi người rồi đào bằng cuốc để phá vùng 3×3. Không cộng dồn Vein Miner.", levels:["Đào vùng 3×3","Đào 3×3 và hút vật phẩm về người chơi","Như cấp II; 15% không mất độ bền trên mỗi block phụ"] },
  { id:"mcpp:vein_miner", name:"Khai Mạch (Vein Miner)", maxLevel:1, price:650, usage:"Gắn vào cuốc hoặc rìu có Unbreaking; cúi người khi đào quặng hoặc chặt cây.", levels:["Phá tối đa 128 block cùng loại nối liền, gồm cả kết nối chéo"] },
];
export const ROMAN_LEVELS = ["","I","II","III","IV","V"];
