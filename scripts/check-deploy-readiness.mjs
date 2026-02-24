#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('🔎 Vérification de la readiness de déploiement...');

if (!process.version) {
  console.error('❌ Node.js est requis mais introuvable.');
  process.exit(1);
}

if (!existsSync('package.json')) {
  console.error('❌ package.json introuvable.');
  process.exit(1);
}

console.log(`✅ Node: ${process.version}`);

console.log('➡️ Installation des dépendances (npm ci)...');
run('npm', ['ci']);

console.log('➡️ Vérification TypeScript...');
run('npm', ['run', '-s', 'lint']);

console.log('➡️ Build front...');
run('npm', ['run', '-s', 'build']);

if (existsSync('railway.toml') || existsSync('railway.json')) {
  console.log('✅ Configuration Railway détectée.');
} else {
  console.warn('⚠️ Aucune configuration Railway détectée.');
}

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL non défini dans cet environnement.');
  console.warn('   Le déploiement cloud devra fournir DATABASE_URL (ex: Railway Postgres).');
} else {
  console.log('✅ DATABASE_URL présent.');
}

console.log('✅ Readiness check terminé.');
