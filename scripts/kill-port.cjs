#!/usr/bin/env node
/* kill-port.cjs – Windows-friendly */
/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
/* eslint-disable sonarjs/os-command, sonarjs/no-ignored-exceptions */
const { execSync } = require("node:child_process");

const port = process.env.PORT || "3002";

try {
  // Busca línea con LISTENING en ese puerto
  const out = execSync(`netstat -ano | findstr :${port}`, { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .split(/\r?\n/)
    .filter(Boolean);

  const listening = out.find(l => l.includes(`:${port}`) && /LISTENING/i.test(l));
  if (!listening) process.exit(0);

  const pid = listening.trim().split(/\s+/).pop();
  if (!/^\d+$/.test(pid)) process.exit(0);

  execSync(`taskkill /PID ${pid} /F`, { stdio: "inherit" });
  console.log(`[kill-port] PID ${pid} en puerto ${port} eliminado.`);
} catch {
  // Silencioso si no hay coincidencias
  process.exit(0);
}
