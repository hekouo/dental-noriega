#!/usr/bin/env node
/**
 * Borra .next con reintentos. Estabiliza verify en Windows cuando .next/trace queda bloqueado (EPERM).
 * Uso: node scripts/clean-next.mjs
 */

import fs from "fs";
import path from "path";

const DIR = ".next";
const MAX_RETRIES = 3;
const RETRY_MS = 300;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rmNext() {
  const full = path.resolve(process.cwd(), DIR);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
  }
}

async function main() {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await rmNext();
      process.exit(0);
    } catch (e) {
      const isLast = i === MAX_RETRIES - 1;
      if (isLast) {
        console.error("\n[clean-next] No se pudo borrar .next después de " + MAX_RETRIES + " intentos.");
        console.error("[clean-next] Error:", e.message || e.code || e);
        console.error("\nEn Windows, .next/trace puede quedar bloqueado. Prueba:");
        console.error("  1. Cerrar procesos Node (Task Manager o: taskkill /F /IM node.exe)");
        console.error("  2. Cerrar Explorer/OneDrive que tengan abierta la carpeta del proyecto");
        console.error("  3. Ejecutar de nuevo: pnpm clean:next");
        console.error("  4. Excluir la carpeta del proyecto en Windows Defender si aplica");
        console.error("  5. Evitar sincronizar el repo con OneDrive");
        console.error("\nVer más: docs/windows-next-eperm.md\n");
        process.exit(1);
      }
      await sleep(RETRY_MS);
    }
  }
}

main();
