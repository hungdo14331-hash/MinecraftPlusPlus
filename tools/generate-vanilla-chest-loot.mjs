import fs from "node:fs";
import path from "node:path";

const sourceRoot=path.resolve("tmp/bedrock-samples/behavior_pack/loot_tables/chests");
const outputRoot=path.resolve("BP/loot_tables/chests");
const targets={
  "abandoned_mineshaft.json":0.18,"ancient_city.json":0.32,"bastion_treasure.json":0.30,
  "desert_pyramid.json":0.16,"end_city_treasure.json":0.32,"jungle_temple.json":0.18,
  "monster_room.json":0.15,"nether_bridge.json":0.20,"pillager_outpost.json":0.18,
  "stronghold_library.json":0.25,"woodland_mansion.json":0.28,"shipwrecktreasure.json":0.18,
};
const books=["vampire","sloth","momentum","bounty","piercing","decay","frostbite","critical","parry","earthshatter","vein_miner"];
fs.mkdirSync(outputRoot,{recursive:true});
for(const [file,chance] of Object.entries(targets)){
  const source=path.join(sourceRoot,file);if(!fs.existsSync(source))throw new Error(`Thiếu loot table Mojang: ${source}`);
  const table=JSON.parse(fs.readFileSync(source,"utf8"));
  table.pools??=[];
  table.pools.push({rolls:1,conditions:[{condition:"random_chance",chance}],entries:books.map(id=>({type:"item",name:`mcpp:${id}_book_1`,weight:id==="vein_miner"?1:3}))});
  fs.writeFileSync(path.join(outputRoot,file),JSON.stringify(table,null,2)+"\n");
}
console.log(`Đã mở rộng ${Object.keys(targets).length} loot table vanilla từ bedrock-samples chính thức.`);
