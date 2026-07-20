import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/scripts/main.ts"],
  bundle: true,
  outfile: "BP/scripts/main.js",
  format: "esm",
  target: "es2020",
  external: ["@minecraft/server", "@minecraft/server-ui"],
  legalComments: "none",
  minify: false,
});

console.log("Build OK — BP/scripts/main.js");
