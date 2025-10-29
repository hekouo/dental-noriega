#!/usr/bin/env node
/* kill-port.cjs – Windows-friendly */
/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
/* eslint-disable sonarjs/no-ignored-exceptions */
const { spawnSync } = require("node:child_process");

const raw = process.env.PORT || process.argv[2] || "3002";
const port = /^\d{2,5}$/.test(String(raw)) ? Number(raw) : 3000;

function run(cmd, args) {
  return spawnSync(cmd, args, { stdio: "ignore", shell: false });
}

try {
  if (process.platform === "win32") {
    // Usa PowerShell para matar proceso dueño del puerto
    run("powershell", [
      "-NoProfile",
      "-Command",
      `Get-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force`,
    ]);
  } else {
    // Linux/macOS
    run("bash", [
      "-lc",
      `fuser -k ${port}/tcp >/dev/null 2>&1 || true`,
    ]);
  }
} catch {
  // Silencioso
}
