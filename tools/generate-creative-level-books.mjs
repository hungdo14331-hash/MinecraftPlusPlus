import fs from "node:fs";
import path from "node:path";
const root = path.resolve("BP/items");
const books = [
  ["vampire","Hút Máu",5],["sloth","Tốc Đánh",3],["momentum","Động Lực",3],
  ["bounty","Tiền Thưởng",5],["piercing","Xuyên Giáp",3],["decay","Suy Tàn",3],
  ["frostbite","Băng Giá",3],["critical","Chí Mạng",5],["parry","Phản Đòn",3],
  ["earthshatter","Địa Chấn",3],
  ["vein_miner","Khai Mạch",1],
];
const roman=["","I","II","III","IV","V"];
for (const [id,name,max] of books) {
  const basePath=path.join(root,`${id}_book.json`);
  const base=JSON.parse(fs.readFileSync(basePath,"utf8"));
  delete base["minecraft:item"].description.menu_category;
  base["minecraft:item"].components["minecraft:display_name"].value=`Sách ${name}`;
  fs.writeFileSync(basePath,JSON.stringify(base,null,2)+"\n");
  for(let level=1;level<=max;level++){
    const item={format_version:"1.20.30","minecraft:item":{description:{identifier:`mcpp:${id}_book_${level}`,menu_category:{category:"items",group:"itemGroup.name.enchantedBook"}},components:{"minecraft:display_name":{value:`Sách ${name} ${roman[level]}`},"minecraft:icon":{texture:`mcpp_${id}_book`},"minecraft:glint":true,"minecraft:max_stack_size":1}}};
    fs.writeFileSync(path.join(root,`${id}_book_${level}.json`),JSON.stringify(item,null,2)+"\n");
  }
}
console.log("Đã sinh sách Creative theo từng cấp.");
