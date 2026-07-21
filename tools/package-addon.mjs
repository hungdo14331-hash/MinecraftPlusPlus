// Dong goi BP/ + RP/ thanh 1 file .mcaddon (zip) trong dist/.
// KHONG goi lenh `zip` cua he dieu hanh (Windows khong co san) — dung zip-writer.mjs
// thuan Node.js thay the.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createZip } from "./zip-writer.mjs";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const cfg = JSON.parse(readFileSync(join(rootDir, "mcpp.config.json"), "utf8"));
const version = cfg.version.join("_");
const outDir = join(rootDir, "dist");
const outFile = `MinecraftPlusPlus_v${version}.mcaddon`;

function walk(dir, baseDir, out) {
  for (const name of readdirSync(dir)) {
    if (name === ".gitkeep") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, baseDir, out);
    } else {
      const rel = relative(baseDir, full).split(sep).join("/");
      out.push({ name: rel, data: readFileSync(full) });
    }
  }
}

const entries = [];
walk(join(rootDir, "BP"), rootDir, entries);
walk(join(rootDir, "RP"), rootDir, entries);

if (entries.length === 0) {
  console.error("Khong tim thay file nao trong BP/ hoac RP/ — kiem tra da build chua (npm run build).");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const zipBuffer = createZip(entries);
const outPath = join(outDir, outFile);
writeFileSync(outPath, zipBuffer);

console.log(`Da dong goi (${entries.length} file): dist/${outFile}`);
