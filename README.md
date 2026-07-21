# Minecraft++ (MC++)

Bedrock addon cải tổ combat: HP ×5 hiển thị, Combat Core (crit/xuyên giáp/knockback/tốc
đánh/anti-heal), Target HUD.

> **Lưu ý về nguồn gốc repo này:** repo được tái tạo lại từ file `.mcaddon` đã build sẵn
> (v0.3.1), vì bản đó không kèm source. Từ v0.3.2 trở đi, mọi thay đổi đều đi qua repo
> này. Nếu có source TypeScript gốc "thật" (trước v0.3.1) ở nơi khác, nên đối chiếu lại
> trước khi tin tưởng tuyệt đối vào bản tái tạo.

## Phiên bản hiện tại: v0.3.3

## Cài đặt & build

```bash
npm install
npm run package   # sinh manifest -> build TS->JS -> đóng gói .mcaddon vào dist/
```

Các lệnh con:
- `npm run manifests` — sinh `BP/manifest.json` + `RP/manifest.json` từ `mcpp.config.json`
  (nguồn version/UUID duy nhất — không sửa tay 2 file manifest). Tên hiển thị của cả
  Behavior Pack và Resource Pack tự động kèm version, ví dụ `Minecraft++ v0.3.10`.
- `npm run build` — sinh manifest rồi bundle `src/scripts/main.ts` → `BP/scripts/main.js`
  (esbuild, `@minecraft/server` để external vì do runtime cung cấp).
- `npm run package` — build rồi zip `BP/` + `RP/` thành `dist/MinecraftPlusPlus_vX_Y_Z.mcaddon`.

Muốn đổi version: sửa **duy nhất** `mcpp.config.json`, không sửa `BP/manifest.json` hay
`RP/manifest.json` trực tiếp (2 file này bị gitignore vì là output sinh ra).

## Cấu trúc

```
mcpp.config.json     # version + UUID duy nhất cho toàn dự án
src/scripts/         # TypeScript source (bundle bằng esbuild)
BP/                  # Behavior Pack (manifest.json + scripts/main.js là output, gitignored)
RP/                  # Resource Pack
tools/               # script sinh manifest + đóng gói .mcaddon
build.mjs            # cấu hình esbuild
```

## Quyết định gameplay đã chốt (nguồn sự thật — không suy đoán lại)

1. Phạm vi damage qua CombatContext = chỉ `entityAttack` + `projectile`. Giáp = Hybrid
   (vanilla tính giáp, MC++ cộng xuyên giáp dựa trên phần bị giáp chặn).
2. Xuyên giáp trần toàn cục 80%. Crit MC++ độc lập crit vanilla, mặc định ×1.825; crit kép
   ×1.825×1.4 ≈ ×2.555.
3. Knockback MC++ cộng thêm vào vanilla. Tốc đánh: đòn sớm giảm damage tuyến tính, sàn tối
   thiểu 20%, không kích hoạt trigger phụ nếu chưa đủ "charge".
4. PvP đi qua CombatContext như PvE, nhưng chỉ phần bonus (crit/xuyên giáp/Life Steal/True
   Damage) × 0.6 — base damage và knockback giữ nguyên 100%.
5. Life Steal tính trước, Anti-Heal áp sau cùng. Anti-Heal áp dụng cho Regeneration +
   SelfHeal; loại trừ Totem of Undying và Absorption. Cause `Heal` (potion) chưa chốt.
6. Anti-Heal là debuff có thời hạn cố định 3 giây (mọi cấp), mỗi đòn trúng làm mới đồng hồ.
7. **(Mới, v0.3.2+)** Hệ thống `attackSpeed` (tick tối thiểu giữa 2 đòn) **chỉ có ý nghĩa so
   sánh tương đối giữa các vũ khí đã đăng ký trong `WeaponRegistry`**. Vũ khí không đăng ký
   hoàn toàn không bị giới hạn (Bedrock vốn không có attack cooldown như Java). Baseline
   tham chiếu: `CombatConstants.BASELINE_ATTACK_SPEED_TICKS = 13`.

## Nội dung đã đăng ký (WeaponRegistry)

| id | item | attackSpeed | onHitEffects |
|---|---|---|---|
| `mcpp:diamond_sword` | `minecraft:diamond_sword` | 13 (baseline) | — |
| `mcpp:iron_sword` | `minecraft:iron_sword` | 13 (baseline; Sloth giảm thời gian chờ) | Speed III, 4s khi đánh trúng đủ charge và kiếm có Knockback |

## Vein Miner

## Bách Khoa v0.4

- Chọn rank đích bằng thanh trượt và nâng nhiều rank trong một lần.
- Tổng chi phí vẫn tính riêng từng rank: I–V tốn 1 điểm, VI trở lên tốn 2 điểm.
- Sau khi nâng, giao diện quay lại danh sách chỉ số để tiếp tục phân phối điểm.
- Thông báo chưa thức tỉnh có chống spam; Sách Thức Tỉnh có texture trắng-vàng riêng.

## Hiệu ứng Bàn Arcane

- Particle nghỉ chỉ chạy khi bàn đã được phát hiện và có người chơi trong phạm vi 9 block.
- Gắn hoặc ghép sách tạo âm thanh và nhiều đợt particle; cấp sách cao có hiệu ứng mạnh hơn.

- Giữ Shift khi phá quặng bằng cuốc hoặc chặt thân cây bằng rìu.
- Công cụ bắt buộc phải có Unbreaking (bất kỳ cấp nào).
- Tìm các khối cùng loại liền nhau, kể cả nối chéo; tối đa 128 khối phụ mỗi lần.

## Custom Enchant: Vampire

- Dùng `/scriptevent mcpp:enchant vampire <cap>` khi đang cầm kiếm; cấp hợp lệ I–V.
- Enchant được hiển thị bằng một dòng lore `Vampire I–V` và được lưu cùng item.
- Vampire hồi máu cho người đánh sau một đòn hợp lệ.
- Tỷ lệ hút máu bằng `cấp Vampire × 5%`: cấp I = 5%, II = 10%, III = 15%...
- Tính trên sát thương thực tế gây ra; phần overkill không tạo thêm hồi máu.
- Trong PvP, lượng hút máu chịu hệ số bonus PvP 60%; Anti-Heal áp dụng sau cùng.

## Custom Enchant: Sloth

- Dùng `/scriptevent mcpp:enchant sloth <cap>` khi đang cầm kiếm; cấp hợp lệ I–III.
- Mỗi cấp tăng 20% tốc độ đánh: Sloth I = 120%, II = 140%, III = 160% tốc độ gốc.
- Với baseline 13 tick, thời gian chờ tương ứng là 11, 10 và 9 tick.

## Custom Enchanted Books

- `/scriptevent mcpp:book vampire <1-5>` — nhận Vampire Enchanted Book theo cấp.
- `/scriptevent mcpp:book sloth <1-3>` — nhận Sloth Enchanted Book theo cấp.
- `/scriptevent mcpp:book momentum <1-3>` — nhận Momentum Enchanted Book theo cấp.
- Sách có glint và lore lưu enchant/cấp, sẵn sàng làm đầu vào cho bàn phù phép đặc biệt.
- Vanilla anvil chưa áp dụng được custom enchant; hiện tại dùng `mcpp:enchant` để gắn trực tiếp.

## Arcane Enchanting Table

- Block `mcpp:arcane_enchanting_table` mở giao diện khi tương tác.
- Gắn một custom enchanted book vào công cụ tương thích và tiêu thụ sách.
- Ghép hai sách cùng enchant/cùng cấp thành một sách cấp kế tiếp; không vượt max level.
- Phí gắn sách cấp I–V lần lượt là 15/40/90/180/350 Arcane Coin.
- Phí ghép ra sách cấp II–V lần lượt là 25/75/200/500 Arcane Coin.
- Recipe: amethyst + obsidian + crying obsidian bao quanh một enchanting table vanilla.
- Model là pedestal cao 12/16 block với open book tĩnh, collision thấp và selection box bao trọn sách.

## Currency: Arcane Coin

- ID `mcpp:arcane_coin`, lưu số dư nguyên không âm trên player dynamic properties.
- Không chiếm inventory; khi chết ở Survival mất 20% số dư cộng ngẫu nhiên 0–500, tối đa bằng số dư hiện có.
- Lệnh test: `/scriptevent mcpp:currency balance|add|remove|set [so tien]`.
- Thay đổi số dư phát event `mcpp:currency_balance_changed` để UI/cửa hàng có thể theo dõi.
- Action Bar hiện số dư trong 3 giây khi tiền thay đổi; khi có target, số dư được ghép cùng tên/HP mục tiêu.

## Arcane Merchant và phần thưởng

- Triệu hồi bằng `/summon mcpp:arcane_merchant`; thương nhân mang ngoại hình phù thủy nhưng không tấn công.
- Mỗi thương nhân bán ngẫu nhiên tối đa 3 loại custom enchanted book cấp I; stock mỗi sách là 3.
- Giá sách theo cấp tối đa của enchant: max 5 = 200, max 3 = 300, max 1 = 650 Arcane Coin.
- Hàng thường có stock tối đa 500; stock và danh mục sách tự restock sau 30 phút thời gian thực.
- Mỗi người chơi bán tối đa 500 đơn vị của từng loại item trong một kỳ restock.
- Màn mua/bán cho phép nhập số lượng; danh sách bán luôn hiện toàn bộ mặt hàng thương nhân thu mua kể cả khi người chơi đang có 0.
- Arcane Merchant có texture Witch riêng với áo tím đen, viền vàng và điểm nhấn Arcane.
- Hạ mob được thưởng theo độ nguy hiểm; zombie nhận ngẫu nhiên 2–7 Arcane Coin.
- Merchant không bán Ender Pearl. Giá hàng thường được cân theo thu nhập zombie trung bình: Lapis 12, Amethyst 30, XP Bottle 80 và Golden Apple 750 Arcane Coin.
- Kho bán được mở rộng với vật tư xây dựng, thức ăn, khoáng sản, nguyên liệu Nether/Ocean/Deep Dark; mỗi món vẫn có stock và restock độc lập.
- Merchant có 20 HP, nhận sát thương như sinh vật thường, hoảng loạn khi bị đánh và chạy tránh mob thuộc nhóm quái thù địch như dân làng.

## Custom Enchant: Bounty

- Dùng `/scriptevent mcpp:book bounty <1-5>` để nhận sách test.
- Khi hạ mob: Bounty I 20% +3, II 25% +3, III 30% +3, IV 35% +3, V 50% +5 Arcane Coin.
- Bonus Bounty không áp dụng cho boss để giữ phần thưởng boss cân bằng.

## Custom Enchant: Momentum

- Dùng `/scriptevent mcpp:enchant momentum <1-3>` khi đang cầm kiếm.
- Đánh trúng bằng đòn hợp lệ nhận Speed trong tổng 4 giây; đòn tiếp theo làm mới chu kỳ.
- Momentum I: +20%. Momentum II: +40% rồi +20%. Momentum III: +60%, +40%, rồi +20%.
- Knockback không còn là điều kiện kích hoạt tăng tốc chạy.

## Custom Enchant: Piercing

- Áp dụng cho kiếm, tối đa cấp III; sách cấp I có giá merchant 300 Arcane Coin.
- Piercing I/II/III gây thêm 5%/10%/15% damage gốc của loại kiếm dưới dạng True Damage.
- True Damage dùng damage cause `override` để bỏ qua giáp, không tính Sharpness và vẫn giữ người tấn công làm kill attribution.
- Lệnh test: `/scriptevent mcpp:book piercing <1-3>`.

## Custom Enchant: Decay

- Áp dụng cho kiếm, tối đa cấp III; mỗi đòn hợp lệ gây Anti-Heal trong 5 giây và làm mới thời gian.
- PvE: Decay I/II/III giảm 35%/70%/100% hồi phục. PvP: giảm 21%/42%/60%.
- Áp dụng cho potion Heal, Regeneration, hồi tự nhiên và Vampire; không giảm Totem of Undying hay Absorption.
- Lệnh test: `/scriptevent mcpp:book decay <1-3>`.
- Warden, Ender Dragon và Wither mặc định gây Decay II trong 5 giây khi trực tiếp gây damage; projectile của boss cũng truy ngược về owner.

## Custom Enchant: Frostbite

- Mọi đòn hợp lệ luôn giảm 10%/20%/30% tốc chạy trong 1/1,5/2 giây ở cấp I/II/III.
- Đồng thời có 10%/15%/20% cơ hội khóa hoàn toàn chuyển động trong cùng thời lượng.
- Warden, Wither và Ender Dragon chỉ bị Freeze nửa thời gian, sau đó miễn nhiễm Freeze 8 giây; slow vẫn áp dụng.
- Lệnh test: `/scriptevent mcpp:book frostbite <1-3>`.

## Custom Enchant: Critical

- Áp dụng cho kiếm, tối đa cấp V; tỷ lệ Critical I–V là 10%/15%/20%/25%/30%.
- Critical MC++ nhân damage hiện tại ×1.85 và hoạt động độc lập với crit nhảy vanilla.
- Nếu Critical MC++ và crit vanilla cùng kích hoạt, multiplier MC++ là ×1.85 ×1.4 = ×2.59 trên damage mà game đã tính.
- Crit vanilla không có Critical MC++ vẫn giữ nguyên cơ chế mặc định. Lệnh test: `/scriptevent mcpp:book critical <1-5>`.

## Custom Enchant: Parry

- Bấm sneak khi cầm kiếm để mở cửa sổ Parry I/II/III trong 4/5/6 tick; cooldown 3/2,5/2 giây.
- Parry đúng lúc hủy damage và knockback, rồi phản 30%/50%/70% damage bị chặn bằng damage cause riêng không kích hoạt enchant tấn công.
- Thành công luôn Stagger kẻ đánh 0,5 giây. Parry III có 10% đổi Stagger thành Freeze 1 giây; boss bị nửa thời gian và miễn nhiễm Freeze 8 giây.
- Lệnh test: `/scriptevent mcpp:book parry <1-3>`.

## Việc còn mở (chưa giải quyết)

## Arcane Mastery — nền tảng

- Awakening Tome mở khóa Mastery một lần, bắt đầu Level 1 với 1 điểm và tặng Mastery Codex.
- Diệt mob trong reward registry nhận Mastery XP riêng; công thức XP kế tiếp là `80 + 20L + 4L²`, tối đa Level 50.
- Codex lưu Level, XP, điểm và 8 nhánh thuộc tính trên player; rank 1–5 tốn 1 điểm, rank 6+ tốn 2 điểm.
- Lệnh test: `/scriptevent mcpp:mastery give awakening`, `give codex`, `xp <số>`, `open`.
- Reset hoàn toàn bằng `/scriptevent mcpp:mastery reset confirm`; lệnh xóa Level, XP, điểm và rank rồi gỡ modifier.
- Modifier Mastery đã hoạt động: Vitality qua Health Boost, Strength/Precision/Dexterity trong DamageService, Agility qua movement attribute, Defense ở HurtBefore, Recovery trong HealingService và Prosperity trên tiền gốc trước Bounty.
- Codex và shop có giao diện tiếng Việt dạng bảng cho chỉ số, khả năng, từng cấp và giá; Creative chứa 33 sách riêng theo level, còn item sách runtime không cấp được ẩn để tránh trùng.

- **Độ lệch damage ~0.8** khi đánh Husk bằng kiếm sắt/kim cương (quan sát từ checkpoint
  2026-07-19, xem lịch sử). Log chẩn đoán (`observedDamageMcpp`, `bonusDamageMcpp`,
  `finalDamageMcpp`) **chưa được thêm lại** vào bản v0.3.2+ theo yêu cầu — cần làm ở bản
  build kế tiếp trước khi coi Combat Core là "xong".
- 25 unit test toán học thuần túy (`tests/unit/combat_math.test.mjs`) được nhắc tới trong
  checkpoint gốc nhưng **chưa có trong repo này** (file `.mcaddon` không chứa tests) — cần
  viết lại nếu muốn khôi phục coverage đó.
- Cause `Heal` (potion uống trực tiếp) cho Anti-Heal — phạm vi chưa chốt.

## Sửa lỗi đáng chú ý khi tái tạo (v0.3.2)

`weapon_lookup.ts` bản build gốc tra `WeaponRegistry.get(item.typeId)`, nhưng registry lưu
khóa theo `id` dạng `mcpp:xxx` — hai khóa không bao giờ khớp. Chưa lộ ra vì `WeaponRegistry`
trước đó luôn rỗng. Đã sửa thành duyệt `WeaponRegistry.all()` và so khớp theo `itemTypeId`.
