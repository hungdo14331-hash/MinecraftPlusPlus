// Tu dong tang PATCH version (X.Y.Z -> X.Y.Z+1) trong mcpp.config.json.
// Day la nguon THAT DUY NHAT cho version toan du an — sua o day, moi noi khac
// (manifest.json, ADDON_VERSION) se tu dong theo trong buoc build ke tiep (xem
// tools/generate-manifests.mjs). Chay tu dong moi lan "npm run package" (xem package.json).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cfgPath = fileURLToPath(new URL("../mcpp.config.json", import.meta.url));
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));

const [major, minor, patch] = cfg.version;
const oldVersion = `${major}.${minor}.${patch}`;
cfg.version = [major, minor, patch + 1];

writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");

console.log(`Version tang: ${oldVersion} -> ${cfg.version.join(".")}`);
