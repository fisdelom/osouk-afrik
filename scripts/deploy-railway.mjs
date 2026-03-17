#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: isWin,
    ...options,
  });
  return result;
}

function runOrExit(cmd, args, options = {}) {
  const result = run(cmd, args, options);
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

function getOutput(cmd, args) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf-8',
    shell: isWin,
  });
  if (result.status !== 0) return '';
  return (result.stdout || '').trim();
}

console.log('🚀 Déploiement Railway (mode guidé)');

const railwayCheck = run('railway', ['--version']);
if (railwayCheck.status !== 0) {
  console.error('❌ Railway CLI introuvable. Lance d\'abord: npm run railway:setup');
  process.exit(1);
}

console.log('➡️ Vérification du projet avant déploiement...');
runOrExit('node', ['scripts/check-deploy-readiness.mjs']);

console.log('➡️ Vérification de l\'auth Railway...');
const whoami = run('railway', ['whoami']);
if (whoami.status !== 0) {
  console.log('⚠️ Tu n\'es pas connecté. Connexion requise...');
  runOrExit('railway', ['login']);
}

console.log('➡️ Vérification du lien au projet Railway...');
if (!existsSync('.railway')) {
  console.log('⚠️ Repo non lié. Suis l\'assistant Railway pour le lier:');
  runOrExit('railway', ['link']);
}

console.log('➡️ Déploiement en cours...');
runOrExit('railway', ['up', '--detach']);

console.log('➡️ Récupération du lien public...');
const domainOut = getOutput('railway', ['domain']);
if (domainOut) {
  const lines = domainOut.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const serviceUrl = lines[lines.length - 1];
  console.log(`✅ Déploiement lancé. Domaine: ${serviceUrl}`);
  console.log(`🔎 Test API: ${serviceUrl.replace(/\/$/, '')}/api/products`);
} else {
  console.log('✅ Déploiement lancé.');
  console.log('ℹ️ Pour obtenir l\'URL, exécute: railway domain');
}
