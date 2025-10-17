const fs = require("fs");
const p = ".next/server/pages-manifest.json";
fs.mkdirSync(".next/server", { recursive: true });
if (!fs.existsSync(p)) fs.writeFileSync(p, "{}", "utf8");
