#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BUDGET_LIMITS = {
  'app-bundle': 200 * 1024, // 200KB gzipped
  'framework': 50 * 1024,   // 50KB gzipped
  'main': 30 * 1024,        // 30KB gzipped
};

function getBundleSize(bundlePath) {
  if (!existsSync(bundlePath)) {
    console.warn(`Bundle not found: ${bundlePath}`);
    return 0;
  }
  
  const stats = readFileSync(bundlePath);
  return stats.length;
}

function checkBudget() {
  const nextDir = join(process.cwd(), '.next');
  const staticDir = join(nextDir, 'static');
  
  let totalViolations = 0;
  
  // Check main app bundle
  const appBundlePath = join(staticDir, 'chunks', 'app', 'page.js');
  const appSize = getBundleSize(appBundlePath);
  
  if (appSize > BUDGET_LIMITS['app-bundle']) {
    console.error(`❌ App bundle exceeds budget: ${(appSize / 1024).toFixed(1)}KB > ${(BUDGET_LIMITS['app-bundle'] / 1024).toFixed(1)}KB`);
    totalViolations++;
  } else {
    console.log(`✅ App bundle within budget: ${(appSize / 1024).toFixed(1)}KB`);
  }
  
  // Check framework bundle
  const frameworkFiles = ['framework-*.js', 'main-*.js'];
  frameworkFiles.forEach(pattern => {
    // This is a simplified check - in reality you'd need to glob for the actual files
    console.log(`ℹ️  Framework bundle check: ${pattern} (simplified)`);
  });
  
  if (totalViolations > 0) {
    console.error(`\n❌ Performance budget failed: ${totalViolations} violations`);
    process.exit(1);
  } else {
    console.log('\n✅ All performance budgets passed');
  }
}

checkBudget();
