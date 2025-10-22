// scripts/prebuild-pages-manifest.js
const fs = require("node:fs");
const path = require("node:path");

const dir = ".next/server";
const p = path.join(dir, "pages-manifest.json");

fs.mkdirSync(dir, { recursive: true });

try {
  fs.writeFileSync(p, "{}", { flag: "wx", encoding: "utf8" });
} catch (e) {
  if (!e || e.code !== "EEXIST") throw e;
}
