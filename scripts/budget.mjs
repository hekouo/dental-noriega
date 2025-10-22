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
function getGzipSizeIfExists(filePath) {
  try {
    const buf = readFileSync(filePath);
    return gzipSize(buf);
  } catch (e) {
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
  } catch (e) {
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
  const frameworkFiles = allChunkFiles.filter((f) => /[\\/]framework-[^/\\]+\.js$/.test(f));
  const frameworkSize = frameworkFiles.length ? findLargestGzipped(frameworkFiles).size : 0;
  if (frameworkSize === 0) {
    console.warn("No se encontró framework-*.js; puede variar por versión de Next.");
  } else if (frameworkSize > BUDGET_LIMITS["framework"]) {
    console.error(`❌ Framework excede: ${formatKB(frameworkSize)} > ${formatKB(BUDGET_LIMITS["framework"])}`);
    totalViolations++;
  } else {
    console.log(`✅ Framework ok: ${formatKB(frameworkSize)}`);
  }

  // main-*.js
  const mainFiles = allChunkFiles.filter((f) => /[\\/]main-[^/\\]+\.js$/.test(f));
  const mainSize = mainFiles.length ? findLargestGzipped(mainFiles).size : 0;
  if (mainSize === 0) {
    console.warn("No se encontró main-*.js; puede variar por versión de Next.");
  } else if (mainSize > BUDGET_LIMITS["main"]) {
    console.error(`❌ Main excede: ${formatKB(mainSize)} > ${formatKB(BUDGET_LIMITS["main"])}`);
    totalViolations++;
  } else {
    console.log(`✅ Main ok: ${formatKB(mainSize)}`);
  }

  if (totalViolations > 0) {
    console.error(`\n❌ Performance budget falló: ${totalViolations} violación(es).`);
    process.exit(1);
  } else {
    console.log("\n✅ Todos los performance budgets pasaron.");
  }
}

try {
  checkBudget();
} catch (e) {
  const err = e instanceof Error ? e : new Error(String(e));
  console.error("❌ Error ejecutando budget script:", err.message);
  process.exit(1);
}
