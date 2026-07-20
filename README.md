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
  (nguồn version/UUID duy nhất — không sửa tay 2 file manifest).
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
| `mcpp:iron_sword` | `minecraft:iron_sword` | 8 (nhanh hơn tương đối) | Speed III, 4s khi đánh trúng đủ charge |

## Việc còn mở (chưa giải quyết)

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
