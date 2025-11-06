import fs from "node:fs/promises";
import path from "node:path";
import { launch as launchChrome } from "chrome-launcher";
import lighthouse from "lighthouse";

const AUDIT_URL = process.env.AUDIT_URL || "http://localhost:3000";

const reportsDir = path.join(process.cwd(), "reports", "lighthouse");
await fs.mkdir(reportsDir, { recursive: true });

// Usa el Chrome instalado por browser-actions/setup-chrome
// (ese action exporta CHROME_PATH en el entorno).
const chrome = await launchChrome({
  chromePath: process.env.CHROME_PATH,
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});

const options = {
  logLevel: "info",
  output: ["html", "json"],
  port: chrome.port,
};
const config = { extends: "lighthouse:default" };

const runnerResult = await lighthouse(AUDIT_URL, options, config);

// Timestamp simple para los archivos
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const base = path.join(reportsDir, `lh-${timestamp}`);

// eslint-disable-next-line security/detect-non-literal-fs-filename
await fs.writeFile(`${base}.html`, runnerResult.report[0], "utf8");
// eslint-disable-next-line security/detect-non-literal-fs-filename
await fs.writeFile(`${base}.json`, runnerResult.report[1], "utf8");

console.log("Lighthouse scores:", {
  performance: runnerResult.lhr.categories.performance.score,
  accessibility: runnerResult.lhr.categories.accessibility.score,
  best_practices: runnerResult.lhr.categories["best-practices"].score,
  seo: runnerResult.lhr.categories.seo.score,
});

await chrome.kill();
