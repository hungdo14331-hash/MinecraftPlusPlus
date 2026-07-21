import fs from "node:fs";import path from "node:path";
const roots=["BP","RP"];const jsonFiles=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(p.endsWith(".json"))jsonFiles.push(p);}}
for(const root of roots)walk(root);
const parsed=new Map();const errors=[];
for(const file of jsonFiles){try{parsed.set(file,JSON.parse(fs.readFileSync(file,"utf8")));}catch(e){errors.push(`${file}: JSON lỗi: ${e.message}`);}}
const itemIds=new Map();
for(const [file,data] of parsed){const id=data?.["minecraft:item"]?.description?.identifier;if(!id)continue;if(itemIds.has(id))errors.push(`Item ID trùng ${id}: ${itemIds.get(id)} và ${file}`);else itemIds.set(id,file);}
const atlas=parsed.get(path.join("RP","textures","item_texture.json"))?.texture_data??{};
for(const [id,file] of itemIds){const texture=parsed.get(file)?.["minecraft:item"]?.components?.["minecraft:icon"]?.texture;if(texture?.startsWith("mcpp_")&&!atlas[texture])errors.push(`${id}: thiếu item atlas ${texture}`);}
for(const [file,data] of parsed){if(!file.includes(`${path.sep}loot_tables${path.sep}`))continue;for(const pool of data.pools??[])for(const entry of pool.entries??[]){if(entry.type==="item"&&entry.name?.startsWith("mcpp:")&&!itemIds.has(entry.name))errors.push(`${file}: loot item không tồn tại ${entry.name}`);}}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}console.log(`Audit OK: ${jsonFiles.length} JSON, ${itemIds.size} custom item, ${[...parsed.keys()].filter(f=>f.includes(`${path.sep}loot_tables${path.sep}`)).length} loot table.`);
