#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: isWin,
    ...options,
  });
}

console.log('🚆 Installation Railway CLI...');

let r = run('railway', ['--version']);
if (r.status === 0) {
  console.log('✅ Railway CLI déjà installé.');
  process.exit(0);
}

console.log('➡️ Tentative d\'installation via npm (global)...');
r = run('npm', ['install', '-g', '@railway/cli']);
if (r.status === 0) {
  console.log('✅ Railway CLI installé avec succès.');
  run('railway', ['--version']);
  process.exit(0);
}

console.error('❌ Installation automatique impossible dans cet environnement.');
console.error('   Action manuelle (sur ta machine locale) :');
console.error('   1) npm install -g @railway/cli');
console.error('   2) railway --version');
process.exit(1);
