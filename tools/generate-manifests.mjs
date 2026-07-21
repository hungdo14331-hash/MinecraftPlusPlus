// Doc mcpp.config.json va sinh ra BP/manifest.json + RP/manifest.json.
// Muc tieu: version va UUID chi ton tai o DUY NHAT 1 noi (mcpp.config.json),
// tranh tinh trang quen bump version o 1 trong nhieu cho khi build thu cong.
import { readFileSync, writeFileSync } from "node:fs";

const cfg = JSON.parse(readFileSync(new URL("../mcpp.config.json", import.meta.url), "utf8"));
const v = cfg.version;
const versionText = v.join(".");
const displayName = `${cfg.name} v${versionText}`;

const bpManifest = {
  format_version: 2,
  header: {
    name: displayName,
    description: `${displayName} Behavior Pack`,
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
    { module_name: "@minecraft/server-ui", version: cfg.server_ui_version },
    { uuid: cfg.uuids.rp_header, version: v },
  ],
};

const rpManifest = {
  format_version: 2,
  header: {
    name: displayName,
    description: `${displayName} Resource Pack`,
    uuid: cfg.uuids.rp_header,
    version: v,
    min_engine_version: cfg.min_engine_version,
  },
  modules: [{ type: "resources", uuid: cfg.uuids.rp_resources_module, version: v }],
};

writeFileSync(new URL("../BP/manifest.json", import.meta.url), JSON.stringify(bpManifest, null, 2) + "\n");
writeFileSync(new URL("../RP/manifest.json", import.meta.url), JSON.stringify(rpManifest, null, 2) + "\n");

// Sinh them file version cho script (constants.ts import tu day) — tranh viet cung tay
// tach roi khoi mcpp.config.json, dan den lech version (vd 0.3.2 vs 0.3.3 tung xay ra).
const versionTs = `// FILE NAY DUOC SINH TU DONG boi tools/generate-manifests.mjs — KHONG SUA TAY.
// Nguon that duy nhat: mcpp.config.json
export const ADDON_VERSION = "${versionText}";
`;
writeFileSync(new URL("../src/scripts/core/config/generated_version.ts", import.meta.url), versionTs);

console.log(`Manifest + generated_version.ts sinh xong: ${displayName}`);
