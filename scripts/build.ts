import { cp, rm } from "node:fs/promises";

await rm("dist", { force: true, recursive: true });

// The main process and the preloads are CommonJS: a sandboxed preload cannot
// load an ES module. electron-updater is bundled in, so the packaged app ships
// no node_modules at all.
const main = await Bun.build({
  entrypoints: ["src/main.ts", "src/preload.ts", "src/local-preload.ts"],
  external: ["electron"],
  format: "cjs",
  outdir: "dist",
  target: "node",
});

const pages = await Bun.build({
  entrypoints: ["src/pages/setup.ts", "src/pages/picker.ts"],
  format: "iife",
  outdir: "dist/pages",
  target: "browser",
});

for (const result of [main, pages]) {
  if (!result.success) {
    throw new AggregateError(result.logs, "Build failed");
  }
}

await Promise.all([
  cp("src/pages/setup.html", "dist/pages/setup.html"),
  cp("src/pages/picker.html", "dist/pages/picker.html"),
  cp("src/pages/pages.css", "dist/pages/pages.css"),
  cp("build/icon.png", "dist/icon.png"),
]);
