/* eslint-disable security/detect-non-literal-fs-filename */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const KB = 1024;

// Presupuestos en tamaño gzip
const BUDGET_LIMITS = {
  "app-bundle": 200 * KB,
  framework: 50 * KB,
  main: 40 * KB,
};

function safeJoin(base, target) {
  const resolvedBase = path.resolve(base);
  const resolvedPath = path.resolve(resolvedBase, target);
  const baseWithSep = resolvedBase.endsWith(path.sep) ? resolvedBase : resolvedBase + path.sep;
  if (!resolvedPath.startsWith(baseWithSep)) {
    throw new Error(`Path traversal blocked: ${target}`);
  }
  return resolvedPath;
}

function gzipSize(buf) {
  return gzipSync(buf, { level: 9 }).length;
}

// Sin exists/stat previos: intenta leer y, si falla, devuelve 0.
// Esto evita la condición de carrera “fue verificado pero cambió”.
function getGzipSizeIfExists(filePath) {
  try {
    const buf = readFileSync(filePath);
    return gzipSize(buf);
  } catch {
    return 0;
  }
}

// Recorre el árbol usando Dirent, sin statSync por archivo.
function listFiles(dir) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const out = [];
    for (const d of entries) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) out.push(...listFiles(full));
      else if (d.isFile()) out.push(full);
    }
    return out;
  } catch {
    return [];
  }
}

function findLargestGzipped(files) {
  let best = { file: null, size: 0 };
  for (const f of files) {
    const size = getGzipSizeIfExists(f);
    if (size > best.size) best = { file: f, size };
  }
  return best;
}

function formatKB(bytes) {
  return `${(bytes / KB).toFixed(1)}KB`;
}

function checkBudget() {
  const projectRoot = process.cwd();
  const nextDir = safeJoin(projectRoot, ".next");
  const staticDir = safeJoin(nextDir, "static");
  const chunksDir = safeJoin(staticDir, "chunks");

  let totalViolations = 0;

  // App bundle
  const appChunksDir = safeJoin(chunksDir, "app");
  const appJsFiles = listFiles(appChunksDir).filter((f) => f.endsWith(".js"));
  const appBest = findLargestGzipped(appJsFiles);
  if (appBest.size === 0) {
    console.warn("No JS found in .next/static/chunks/app.");
  } else if (appBest.size > BUDGET_LIMITS["app-bundle"]) {
    console.error(
      `❌ App bundle excede: ${formatKB(appBest.size)} > ${formatKB(BUDGET_LIMITS["app-bundle"])}\n` +
        `   archivo: ${path.relative(projectRoot, appBest.file)}`
    );
    totalViolations++;
  } else {
    console.log(`✅ App bundle ok: ${formatKB(appBest.size)} (${path.basename(appBest.file)})`);
  }

  // framework-*.js
  const allChunkFiles = listFiles(chunksDir).filter((f) => f.endsWith(".js"));
  const frameworkFiles =
