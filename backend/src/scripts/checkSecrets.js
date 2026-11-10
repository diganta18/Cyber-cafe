'use strict';
const { execSync } = require('child_process');
const fs = require('fs');

console.log('[pre-commit] Scanning staged files for sensitive data...');

try {
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((f) => f.trim())
    .filter(Boolean);

  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  const blockedExtensions = /\.(pem|key|crt|cert|p12|pfx|pdf|docx|xlsx|pptx)$/i;
  const blockedFileNames = /^\.env(\..+)?$/i;

  const violations = [];

  for (const file of stagedFiles) {
    // 1. Check blocked file names
    const basename = file.split(/[/\\]/).pop();
    if (blockedFileNames.test(basename) && basename !== '.env.example') {
      violations.push(`Blocked environment file: ${file}`);
    }

    // 2. Check blocked extensions
    if (blockedExtensions.test(file)) {
      violations.push(`Blocked sensitive file extension: ${file}`);
    }

    // 3. Check blocked directory: uploads
    if (file.startsWith('backend/uploads/') || file.startsWith('uploads/')) {
      if (!file.endsWith('.gitkeep')) {
        violations.push(`Blocked user upload file in repository: ${file}`);
      }
    }
  }

  // 4. Scan staged diff for secrets
  const diffOutput = execSync('git diff --cached', { encoding: 'utf8' });
  const secretPatterns = [
    { pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/, name: 'Private Key' },
    { pattern: /AVNS_[A-Za-z0-9_-]{16,}/, name: 'Aiven DB Secret' },
    { pattern: /ghp_[A-Za-z0-9]{36}/, name: 'GitHub Personal Token' },
    { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key ID' },
  ];

  for (const { pattern, name } of secretPatterns) {
    if (pattern.test(diffOutput)) {
      violations.push(`Detected exposed credential pattern: ${name}`);
    }
  }

  if (violations.length > 0) {
    console.error('\n🚨 [PRE-COMMIT BLOCKED] Security scan detected private data:');
    violations.forEach((v) => console.error(`  - ${v}`));
    console.error('\nPlease unstage these files before committing.\n');
    process.exit(1);
  }

  console.log('✅ [pre-commit] All staged files passed security check.');
  process.exit(0);
} catch (err) {
  if (err.status) {
    process.exit(err.status);
  }
  console.error('[pre-commit] Error running scanner:', err.message);
  process.exit(0);
}

