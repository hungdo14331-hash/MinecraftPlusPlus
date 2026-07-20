// Dong goi BP/ + RP/ thanh 1 file .mcaddon (zip) trong dist/
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, existsSync, rmSync } from "node:fs";

const cfg = JSON.parse(readFileSync(new URL("../mcpp.config.json", import.meta.url), "utf8"));
const version = cfg.version.join("_");
const outDir = new URL("../dist/", import.meta.url);
const outFile = `MinecraftPlusPlus_v${version}.mcaddon`;

mkdirSync(outDir, { recursive: true });
const outPath = new URL(outFile, outDir).pathname;
if (existsSync(outPath)) rmSync(outPath);

execSync(`zip -r "${outPath}" BP RP -x '*.gitkeep'`, {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: "inherit",
});

console.log(`Da dong goi: dist/${outFile}`);
