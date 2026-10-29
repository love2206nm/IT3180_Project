#!/usr/bin/env node

/**
 * =============================================================================
 * VERIFICATION LOOPS (verify_loops.mjs)
 * Delivery Hub Management System - IT3180
 *
 * Automated verification loop to enforce:
 *  1. Clean Architecture directory integrity
 *  2. Architectural import boundaries (Domain -> Application -> Infra -> Presentation)
 *  3. Next.js Client Component safety ("use client" leaks)
 *  4. Strict anti-hardcoding / anti-magic-strings rules
 *  5. TypeScript strict typing (no 'any')
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// ANSI Color Helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

const stats = {
  totalChecks: 0,
  passed: 0,
  warnings: 0,
  failed: 0,
  errors: [],
};

function logHeader() {
  console.log(`\n${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  DELIVERY HUB ARCHITECTURAL VERIFICATION LOOP (Node.js/ESM)     ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================================${colors.reset}\n`);
}

/**
 * Recursively find all files matching extensions
 */
function getFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs']) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        results = results.concat(getFiles(filePath, extensions));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  return results;
}

/**
 * LOOP 1: Check Required Clean Architecture Directories
 */
function verifyDirectoryStructure() {
  stats.totalChecks++;
  console.log(`${colors.bold}[Loop 1/5] Checking Clean Architecture Directory Structure...${colors.reset}`);

  const requiredDirs = [
    'src/domain/entities',
    'src/domain/interface/repositories',
    'src/domain/interface/services',
    'src/domain/value-objects',
    'src/domain/constants',
    'src/domain/exceptions',
    'src/application/use-cases',
    'src/application/dtos',
    'src/application/interfaces',
    'src/infrastructure/database',
    'src/infrastructure/storage',
    'src/infrastructure/security',
    'src/infrastructure/config',
    'src/presentation/actions',
    'src/presentation/components',
    'src/presentation/hooks',
    'src/app',
  ];

  let missingDirs = [];
  for (const dir of requiredDirs) {
    const fullPath = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      missingDirs.push(dir);
    }
  }

  // Also check that redundant frontend/backend dirs do NOT exist
  const forbiddenDirs = ['frontend', 'backend'];
  let existingForbidden = [];
  for (const dir of forbiddenDirs) {
    if (fs.existsSync(path.join(ROOT_DIR, dir))) {
      existingForbidden.push(dir);
    }
  }

  if (missingDirs.length === 0 && existingForbidden.length === 0) {
    stats.passed++;
    console.log(`  ${colors.green}✔ PASS:${colors.reset} All 17 Clean Architecture subdirectories exist cleanly.`);
  } else {
    stats.failed++;
    if (missingDirs.length > 0) {
      const msg = `Missing required Clean Architecture directories:\n   ${missingDirs.join('\n   ')}`;
      stats.errors.push(msg);
      console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${msg}`);
    }
    if (existingForbidden.length > 0) {
      const msg = `Redundant root directories detected: ${existingForbidden.join(', ')} (Must be removed in Fullstack setup)`;
      stats.errors.push(msg);
      console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${msg}`);
    }
  }
}

/**
 * LOOP 2: Check Import Boundaries (Clean Architecture Layers)
 */
function verifyImportBoundaries() {
  stats.totalChecks++;
  console.log(`\n${colors.bold}[Loop 2/5] Checking Architectural Import Boundaries...${colors.reset}`);

  const allFiles = getFiles(SRC_DIR);
  let violations = [];

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

    // Rule A: Domain must never import Application, Infrastructure, or Presentation
    if (relativePath.startsWith('src/domain/')) {
      const forbiddenPatterns = [
        /from\s+['"][^'"]*(application|infrastructure|presentation|app)[^'"]*['"]/g,
        /require\(['"][^'"]*(application|infrastructure|presentation|app)[^'"]*['"]\)/g,
      ];
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push(`[Domain Violation] ${relativePath} must NOT import from outer layers (application/infrastructure/presentation).`);
        }
      }
    }

    // Rule B: Application must never import Infrastructure or Presentation directly
    if (relativePath.startsWith('src/application/')) {
      const forbiddenPatterns = [
        /from\s+['"][^'"]*(infrastructure|presentation|app)[^'"]*['"]/g,
        /require\(['"][^'"]*(infrastructure|presentation|app)[^'"]*['"]\)/g,
      ];
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push(`[Application Violation] ${relativePath} must NOT import directly from infrastructure or presentation.`);
        }
      }
    }

    // Rule C: Presentation/App must never import directly from database (bypass use cases)
    if (relativePath.startsWith('src/presentation/') || relativePath.startsWith('src/app/')) {
      const forbiddenPatterns = [
        /from\s+['"][^'"]*infrastructure\/database[^'"]*['"]/g,
        /require\(['"][^'"]*infrastructure\/database[^'"]*['"]\)/g,
      ];
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push(`[Presentation Bypass] ${relativePath} must access data through src/application use-cases, never directly from infrastructure/database.`);
        }
      }
    }
  }

  if (violations.length === 0) {
    stats.passed++;
    console.log(`  ${colors.green}✔ PASS:${colors.reset} 0 import boundary violations found across ${allFiles.length} source files.`);
  } else {
    stats.failed++;
    for (const v of violations) {
      stats.errors.push(v);
      console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${v}`);
    }
  }
}

/**
 * LOOP 3: Check Next.js Client Component Safety ("use client")
 */
function verifyClientComponentSafety() {
  stats.totalChecks++;
  console.log(`\n${colors.bold}[Loop 3/5] Checking Next.js Client Component ("use client") Safety...${colors.reset}`);

  const allFiles = getFiles(SRC_DIR);
  let leaks = [];

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

    const isClientComponent = /['"]use client['"]/.test(content);
    if (isClientComponent) {
      // Check for forbidden database or secret leaks
      const leakPatterns = [
        { pattern: /@prisma\/client/g, name: '@prisma/client' },
        { pattern: /from\s+['"][^'"]*(database|prisma)[^'"]*['"]/g, name: 'database/prisma adapter' },
        { pattern: /from\s+['"][^'"]*security[^'"]*['"]/g, name: 'security/crypto helper' },
        { pattern: /process\.env\.(DATABASE_URL|JWT_SECRET|ADMIN_PASSWORD)/g, name: 'sensitive environment secret' },
      ];

      for (const { pattern, name } of leakPatterns) {
        if (pattern.test(content)) {
          leaks.push(`[Client Leak] ${relativePath} has 'use client' but imports ${name}!`);
        }
      }
    }
  }

  if (leaks.length === 0) {
    stats.passed++;
    console.log(`  ${colors.green}✔ PASS:${colors.reset} No server-side secrets or DB clients leaked in Client Components.`);
  } else {
    stats.failed++;
    for (const l of leaks) {
      stats.errors.push(l);
      console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${l}`);
    }
  }
}

/**
 * LOOP 4: Anti-Hardcode & Magic Strings/Numbers Guardrail
 */
function verifyNoHardcoding() {
  stats.totalChecks++;
  console.log(`\n${colors.bold}[Loop 4/5] Checking Anti-Hardcode & Magic Value Guardrails...${colors.reset}`);

  const allFiles = getFiles(SRC_DIR);
  let hardcodeIssues = [];

  // Magic order status strings that MUST be in src/domain/constants
  const magicStatusStrings = [
    '"CREATED"', "'CREATED'",
    '"AT_HUB"', "'AT_HUB'",
    '"OUT_FOR_DELIVERY"', "'OUT_FOR_DELIVERY'",
    '"DELIVERED"', "'DELIVERED'",
    '"FAILED_ATTEMPT"', "'FAILED_ATTEMPT'",
    '"RETURN_PENDING"', "'RETURN_PENDING'",
    '"RETURNED"', "'RETURNED'",
    '"CANCELLED"', "'CANCELLED'"
  ];

  for (const file of allFiles) {
    const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

    // Skip constants and definition files themselves
    if (relativePath.includes('src/domain/constants') || relativePath.endsWith('.d.ts')) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');
    for (const str of magicStatusStrings) {
      // Look for comparison operators or assignment: === "DELIVERED", == 'AT_HUB'
      const regex = new RegExp(`(===|==|!==|!=)\\s*\\${str}`, 'g');
      if (regex.test(content)) {
        hardcodeIssues.push(`[Hardcode Alert] ${relativePath} compares raw string ${str}. Use constants from @/domain/constants (e.g. ORDER_STATUS.*).`);
      }
    }
  }

  if (hardcodeIssues.length === 0) {
    stats.passed++;
    console.log(`  ${colors.green}✔ PASS:${colors.reset} No raw hardcoded status strings found. Constants properly utilized.`);
  } else {
    stats.failed++;
    for (const issue of hardcodeIssues) {
      stats.errors.push(issue);
      console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${issue}`);
    }
  }
}

/**
 * LOOP 5: Strict Typing Check (No 'any')
 */
function verifyStrictTyping() {
  stats.totalChecks++;
  console.log(`\n${colors.bold}[Loop 5/5] Checking Strict Typing (Prohibition of 'any')...${colors.reset}`);

  const allFiles = getFiles(SRC_DIR, ['.ts', '.tsx']);
  let anyViolations = [];

  for (const file of allFiles) {
    const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
    if (relativePath.endsWith('.d.ts')) continue;

    const lines = fs.readFileSync(file, 'utf-8').split('\n');
    lines.forEach((line, index) => {
      // Match ': any', 'as any', '<any>'
      if (/:\s*any\b|as\s+any\b|<any>/.test(line) && !line.trim().startsWith('//')) {
        anyViolations.push(`[Explicit Any] ${relativePath}:${index + 1} uses 'any'. Replace with explicit Interface/Type or 'unknown'.`);
      }
    });
  }

  if (anyViolations.length === 0) {
    stats.passed++;
    console.log(`  ${colors.green}✔ PASS:${colors.reset} 100% strict typing compliance. No ': any' usage detected.`);
  } else {
    stats.warnings++;
    for (const v of anyViolations) {
      console.log(`  ${colors.yellow}⚠ WARN:${colors.reset} ${v}`);
    }
  }
}

/**
 * Main Runner & Scorecard
 */
function run() {
  logHeader();
  const startTime = Date.now();

  verifyDirectoryStructure();
  verifyImportBoundaries();
  verifyClientComponentSafety();
  verifyNoHardcoding();
  verifyStrictTyping();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${colors.bold}${colors.cyan}-----------------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bold}  VERIFICATION SCORECARD (Time: ${elapsed}s)${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}-----------------------------------------------------------------${colors.reset}`);
  console.log(`  Total Checks : ${stats.totalChecks}`);
  console.log(`  Passed       : ${colors.green}${stats.passed}${colors.reset}`);
  console.log(`  Warnings     : ${colors.yellow}${stats.warnings}${colors.reset}`);
  console.log(`  Failed       : ${stats.failed > 0 ? colors.red + stats.failed : colors.green + '0'}${colors.reset}`);

  if (stats.failed > 0) {
    console.log(`\n${colors.bgRed}${colors.bold} [RESULT: FAILED] ${colors.reset} ${colors.red}Please fix the architectural violations above before proceeding!${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.bgGreen}${colors.bold} [RESULT: ALL PASSED] ${colors.reset} ${colors.green}Clean Architecture guardrails intact. Ready for Vibe Coding!${colors.reset}\n`);
    process.exit(0);
  }
}

run();
