import fs from "node:fs";
import path from "node:path";

const roots = ["BP", "RP"];
const jsonFiles = [];
const errors = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith(".json")) jsonFiles.push(file);
  }
}

for (const root of roots) walk(root);
const parsed = new Map();
for (const file of jsonFiles) {
  try { parsed.set(file, JSON.parse(fs.readFileSync(file, "utf8"))); }
  catch (error) { errors.push(`${file}: JSON lỗi: ${error.message}`); }
}

const itemIds = new Map();
for (const [file, data] of parsed) {
  const id = data?.["minecraft:item"]?.description?.identifier;
  if (!id) continue;
  if (itemIds.has(id)) errors.push(`Item ID trùng ${id}: ${itemIds.get(id)} và ${file}`);
  else itemIds.set(id, file);
}

const atlas = parsed.get(path.join("RP", "textures", "item_texture.json"))?.texture_data ?? {};
for (const [id, file] of itemIds) {
  const texture = parsed.get(file)?.["minecraft:item"]?.components?.["minecraft:icon"]?.texture;
  if (texture?.startsWith("mcpp_") && !atlas[texture]) errors.push(`${id}: thiếu item atlas ${texture}`);
}

function textureFiles(value) {
  const raw = typeof value === "string" ? [value] : Array.isArray(value) ? value : value?.textures;
  const paths = typeof raw === "string" ? [raw] : Array.isArray(raw) ? raw : [];
  return paths.map((texture) => path.join("RP", `${texture}.png`));
}
for (const atlasFile of [path.join("RP", "textures", "item_texture.json"), path.join("RP", "textures", "terrain_texture.json")]) {
  const textureData = parsed.get(atlasFile)?.texture_data ?? {};
  for (const [key, value] of Object.entries(textureData)) {
    const candidates = textureFiles(value);
    if (candidates.length === 0) errors.push(`${atlasFile}: atlas ${key} không có đường dẫn texture`);
    for (const textureFile of candidates) if (!fs.existsSync(textureFile)) errors.push(`${atlasFile}: thiếu file ${textureFile} cho ${key}`);
  }
}

const entityIds = new Set();
const clientEntityIds = new Set();
const spawnRuleIds = new Set();
for (const [, data] of parsed) {
  const entityId = data?.["minecraft:entity"]?.description?.identifier;
  const clientEntityId = data?.["minecraft:client_entity"]?.description?.identifier;
  const spawnId = data?.["minecraft:spawn_rules"]?.description?.identifier;
  if (entityId) entityIds.add(entityId);
  if (clientEntityId) clientEntityIds.add(clientEntityId);
  if (spawnId) spawnRuleIds.add(spawnId);
}
for (const spawnId of spawnRuleIds) if (!entityIds.has(spawnId)) errors.push(`Spawn rule ${spawnId} không có entity tương ứng`);
for (const entityId of entityIds) {
  if (entityId.startsWith("mcpp:") && !clientEntityIds.has(entityId)) errors.push(`Entity ${entityId} thiếu client entity trong RP`);
}

const customGeometryIds = new Set();
const customGeometryById = new Map();
for (const [file, data] of parsed) {
  if (!file.includes(`${path.sep}models${path.sep}`)) continue;
  for (const geometry of data?.["minecraft:geometry"] ?? []) {
    const id = geometry?.description?.identifier;
    if (id) {
      customGeometryIds.add(id);
      customGeometryById.set(id, { file, geometry });
    }
  }
  for (const key of Object.keys(data ?? {})) {
    if (key.startsWith("geometry.mcpp")) customGeometryIds.add(key.split(":")[0]);
  }
}
for (const [file, data] of parsed) {
  const description = data?.["minecraft:client_entity"]?.description;
  const geometryValues = description?.geometry;
  if (!description) continue;
  for (const geometryId of Object.values(geometryValues ?? {})) {
    if (typeof geometryId === "string" && geometryId.startsWith("geometry.mcpp") && !customGeometryIds.has(geometryId)) {
      errors.push(`${file}: thiếu geometry tùy chỉnh ${geometryId}`);
    }
  }
  for (const texturePath of Object.values(description.textures ?? {})) {
    if (typeof texturePath !== "string") continue;
    const textureFile = path.join("RP", `${texturePath}.png`);
    if (!fs.existsSync(textureFile)) errors.push(`${file}: thiếu client texture ${textureFile}`);
  }
}

const animationIds = new Set();
for (const [, data] of parsed) for (const id of Object.keys(data?.animations ?? {})) animationIds.add(id);
for (const [file, data] of parsed) {
  const animations = data?.["minecraft:client_entity"]?.description?.animations ?? {};
  for (const animationId of Object.values(animations)) {
    if (typeof animationId === "string" && animationId.startsWith("animation.mcpp") && !animationIds.has(animationId)) {
      errors.push(`${file}: thiếu animation tùy chỉnh ${animationId}`);
    }
  }
}

const specialWeaponIds = [
  "mcpp:conqueror_greatsword", "mcpp:chronoblade", "mcpp:arcane_spear", "mcpp:frost_hammer",
  "mcpp:shadow_dagger", "mcpp:runeblade", "mcpp:titan_maul", "mcpp:gale_glaive",
  "mcpp:ember_cleaver", "mcpp:void_reaper",
];
const attachableIds = new Map();
for (const [file, data] of parsed) {
  const description = data?.["minecraft:attachable"]?.description;
  if (description?.identifier) attachableIds.set(description.identifier, { file, description });
}
for (const weaponId of specialWeaponIds) {
  const itemFile = itemIds.get(weaponId);
  if (!itemFile) { errors.push(`Thiếu item vũ khí đặc biệt ${weaponId}`); continue; }
  const category = parsed.get(itemFile)?.["minecraft:item"]?.description?.menu_category?.category;
  if (category !== "equipment") errors.push(`${weaponId}: chưa nằm trong kho Sáng tạo Equipment`);

  const attachable = attachableIds.get(weaponId);
  if (!attachable) { errors.push(`${weaponId}: thiếu attachable/model cầm tay`); continue; }
  const geometryId = attachable.description.geometry?.default;
  if (!geometryId || !customGeometryIds.has(geometryId)) errors.push(`${attachable.file}: thiếu geometry ${geometryId ?? "default"}`);
  const geometryEntry = customGeometryById.get(geometryId);
  const renderableBoundBones = geometryEntry?.geometry?.bones?.filter((bone) =>
    typeof bone?.binding === "string" && Array.isArray(bone?.cubes) && bone.cubes.length > 0
  ) ?? [];
  if (renderableBoundBones.length !== 1) {
    errors.push(`${geometryEntry?.file ?? attachable.file}: ${weaponId} phải có đúng 1 bone vừa binding vừa chứa cubes để không rơi model xuống chân`);
  }
  const boundBone = renderableBoundBones[0];
  const pivot = boundBone?.pivot;
  if (!Array.isArray(pivot) || pivot[0] !== 0 || pivot[1] !== 24 || pivot[2] !== 0) {
    errors.push(`${geometryEntry?.file ?? attachable.file}: ${weaponId} phải dùng pivot tay [0,24,0]`);
  } else {
    const gripCrossesPivot = boundBone.cubes.some((cube) => {
      if (!Array.isArray(cube.origin) || !Array.isArray(cube.size)) return false;
      return cube.origin.every((origin, axis) => origin <= pivot[axis] && origin + cube.size[axis] >= pivot[axis]);
    });
    if (!gripCrossesPivot) errors.push(`${geometryEntry.file}: ${weaponId} không có phần cán đi qua pivot tay [0,24,0]`);
  }
  if (!attachable.description.item?.[weaponId]) errors.push(`${attachable.file}: thiếu item binding dành cho player ${weaponId}`);
  for (const texturePath of Object.values(attachable.description.textures ?? {})) {
    if (typeof texturePath !== "string" || texturePath === "textures/misc/enchanted_item_glint") continue;
    if (!fs.existsSync(path.join("RP", `${texturePath}.png`))) errors.push(`${attachable.file}: thiếu texture ${texturePath}.png`);
  }
  for (const animationId of Object.values(attachable.description.animations ?? {})) {
    if (typeof animationId === "string" && animationId.startsWith("animation.mcpp") && !animationIds.has(animationId)) {
      errors.push(`${attachable.file}: thiếu animation ${animationId}`);
    }
  }
}

for (const [file, data] of parsed) {
  if (!file.includes(`${path.sep}loot_tables${path.sep}`)) continue;
  for (const pool of data.pools ?? []) {
    for (const entry of pool.entries ?? []) {
      if (entry.type === "item" && entry.name?.startsWith("mcpp:") && !itemIds.has(entry.name)) {
        errors.push(`${file}: loot item không tồn tại ${entry.name}`);
      }
    }
  }
}

const vanillaChestTables = [
  "abandoned_mineshaft.json", "ancient_city.json", "bastion_treasure.json", "desert_pyramid.json",
  "end_city_treasure.json", "jungle_temple.json", "monster_room.json", "nether_bridge.json",
  "pillager_outpost.json", "shipwrecktreasure.json", "stronghold_library.json", "woodland_mansion.json",
];
const customBooks = [
  "mcpp:vampire_book_1", "mcpp:sloth_book_1", "mcpp:momentum_book_1", "mcpp:piercing_book_1",
  "mcpp:frostbite_book_1", "mcpp:critical_book_1", "mcpp:parry_book_1", "mcpp:bounty_book_1",
  "mcpp:decay_book_1", "mcpp:earthshatter_book_1", "mcpp:vein_miner_book_1",
];
for (const tableName of vanillaChestTables) {
  const file = path.join("BP", "loot_tables", "chests", tableName);
  const table = parsed.get(file);
  if (!table) { errors.push(`Thiếu vanilla chest override: ${file}`); continue; }
  const names = new Set((table.pools ?? []).flatMap((pool) => (pool.entries ?? []).map((entry) => entry.name)));
  for (const book of customBooks) if (!names.has(book)) errors.push(`${file}: thiếu loot ${book}`);
}

const legendaryLoot = {
  "ancient_city.json": "mcpp:void_reaper",
  "end_city_treasure.json": "mcpp:void_reaper",
  "bastion_treasure.json": "mcpp:ember_cleaver",
  "nether_bridge.json": "mcpp:ember_cleaver",
};
for (const [tableName, weaponId] of Object.entries(legendaryLoot)) {
  const file = path.join("BP", "loot_tables", "chests", tableName);
  const names = new Set((parsed.get(file)?.pools ?? []).flatMap((pool) => (pool.entries ?? []).map((entry) => entry.name)));
  if (!names.has(weaponId)) errors.push(`${file}: thiếu vũ khí loot ${weaponId}`);
}

for (const weaponId of ["mcpp:runeblade", "mcpp:titan_maul", "mcpp:gale_glaive"]) {
  const found = [...parsed.entries()].some(([file, data]) => file.includes(`${path.sep}recipes${path.sep}`)
    && data?.["minecraft:recipe_shaped"]?.result?.item === weaponId);
  if (!found) errors.push(`${weaponId}: thiếu công thức chế tạo`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Audit OK: ${jsonFiles.length} JSON, ${itemIds.size} custom item, ${specialWeaponIds.length} vũ khí 3D, ${[...parsed.keys()].filter((file) => file.includes(`${path.sep}loot_tables${path.sep}`)).length} loot table, ${vanillaChestTables.length} vanilla chest table đã xác minh.`);
