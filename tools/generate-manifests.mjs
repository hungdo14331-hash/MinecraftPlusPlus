// Doc mcpp.config.json va sinh ra BP/manifest.json + RP/manifest.json.
// Muc tieu: version va UUID chi ton tai o DUY NHAT 1 noi (mcpp.config.json),
// tranh tinh trang quen bump version o 1 trong nhieu cho khi build thu cong.
import { readFileSync, writeFileSync } from "node:fs";

const cfg = JSON.parse(readFileSync(new URL("../mcpp.config.json", import.meta.url), "utf8"));
const v = cfg.version;

const bpManifest = {
  format_version: 2,
  header: {
    name: cfg.name,
    description: `${cfg.name} Behavior Pack`,
    uuid: cfg.uuids.bp_header,
    version: v,
    min_engine_version: cfg.min_engine_version,
  },
  modules: [
    { type: "data", uuid: cfg.uuids.bp_data_module, version: v },
    {
      type: "script",
      language: "javascript",
      uuid: cfg.uuids.bp_script_module,
      entry: "scripts/main.js",
      version: v,
    },
  ],
  dependencies: [
    { module_name: "@minecraft/server", version: cfg.server_api_version },
    { uuid: cfg.uuids.rp_header, version: v },
  ],
};

const rpManifest = {
  format_version: 2,
  header: {
    name: cfg.name,
    description: `${cfg.name} Resource Pack`,
    uuid: cfg.uuids.rp_header,
    version: v,
    min_engine_version: cfg.min_engine_version,
  },
  modules: [{ type: "resources", uuid: cfg.uuids.rp_resources_module, version: v }],
};

writeFileSync(new URL("../BP/manifest.json", import.meta.url), JSON.stringify(bpManifest, null, 2) + "\n");
writeFileSync(new URL("../RP/manifest.json", import.meta.url), JSON.stringify(rpManifest, null, 2) + "\n");

console.log(`Manifest sinh xong cho v${v.join(".")}`);
