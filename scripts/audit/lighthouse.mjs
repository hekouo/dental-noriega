// scripts/audit/lighthouse.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lighthouse from "lighthouse";
import chromeLauncher from "chrome-launcher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIT_URL = process.env.AUDIT_URL || process.env.NEXT_PUBLIC_SITE_URL;
if (!AUDIT_URL) {
  console.error(
    "❌ Define AUDIT_URL o NEXT_PUBLIC_SITE_URL para auditar (ej. https://<tu-deploy>.vercel.app)",
  );
  process.exit(1);
}

const OUT_DIR = path.resolve(__dirname, "../../reports/lighthouse");
fs.mkdirSync(OUT_DIR, { recursive: true });

const configPath = path.resolve(__dirname, "../../config/lighthouse/lighthouserc.json");
const configJson = JSON.parse(fs.readFileSync(configPath, "utf8"));

(async () => {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox"],
  });
  const options = {
    logLevel: "info",
    output: ["html", "json"],
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    port: chrome.port,
  };
  const runnerResult = await lighthouse(AUDIT_URL, options);

  const html = runnerResult.report[0];
  const json = runnerResult.report[1];

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.join(OUT_DIR, `lh-${stamp}`);
  fs.writeFileSync(`${base}.html`, html);
  fs.writeFileSync(`${base}.json`, json);

  const scores = runnerResult.lhr.categories;
  console.log(
    "✅ Lighthouse scores",
    Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v.score])),
  );

  await chrome.kill();
  console.log(`📁 Reportes: ${base}.html y ${base}.json`);
})();

