# Déploiement Railway — Guide débutant (pas à pas)

Ce guide est fait pour un profil **novice**. Suis les étapes dans l'ordre.

✅ Les scripts npm fonctionnent sur **Windows / macOS / Linux** (plus besoin de bash).

## Étape 0 — Ce qu'il te faut
- Un compte Railway: https://railway.app
- Ce repo sur GitHub (ou en local)
- Node.js installé sur ta machine

## Étape 1 — Installer Railway CLI
Dans le terminal, à la racine du projet:

```bash
npm run railway:setup
```

Si ça échoue, fais:

```bash
npm install -g @railway/cli
railway --version
```

## Étape 2 — Vérifier que le projet build correctement

```bash
npm run deploy:check
```

Tu dois voir la fin: `✅ Readiness check terminé.`

## Étape 3 — Se connecter à Railway

```bash
railway login
```

Une page web s'ouvre, tu confirmes la connexion.

## Étape 4 — Créer/Lier ton projet Railway

```bash
railway link
```

- Si tu as déjà un projet Railway: sélectionne-le.
- Sinon: crée un nouveau projet.

## Étape 5 — Ajouter PostgreSQL (obligatoire)
Dans le dashboard Railway:
1. Ouvre ton projet.
2. `New` → `Database` → `PostgreSQL`.
3. Attends qu'il soit "healthy".
4. Vérifie que `DATABASE_URL` est bien injectée dans ton service web.

## Étape 6 — Déployer

```bash
npm run deploy:railway
```

Le script fait automatiquement:
- la vérification `deploy:check`,
- la vérification login Railway,
- le link projet si besoin,
- le `railway up`.

## Étape 7 — Obtenir et tester le lien final

```bash
railway domain
```

Puis teste:
- `https://TON-DOMAINE/health`
- La page d'accueil `https://TON-DOMAINE`

## Résolution d'erreurs fréquentes
- `DATABASE_URL non défini`:
  - Assure-toi que PostgreSQL est ajouté au même projet Railway.
- `railway: command not found`:
  - Relance `npm run railway:setup` ou installe globalement avec npm.
- `healthcheck failed`:
  - Vérifie que `/health` répond (même si la DB démarre lentement).
  - Ensuite vérifie `DATABASE_URL` et `/api/products`.

## Config déjà présente dans le repo
- Build: `npm install && npm run build`.
- Start: `npm start`.
- Healthcheck: `/health`.
- Fichiers: `railway.toml`, `railway.json`.


## Option B — Déployer ailleurs (Render)
Si Railway continue de poser problème, utilise Render:
1. Va sur https://render.com et connecte ton GitHub.
2. New + > Web Service > choisis ce repo.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Ajoute une base PostgreSQL Render (New + > PostgreSQL).
6. Ajoute la variable `DATABASE_URL` du service PostgreSQL dans le Web Service.
7. Déploie puis teste `https://TON-URL/health`.


## Sécuriser la console admin (important)
1. Dans Railway > Variables, ajoute `ADMIN_TOKEN` avec un mot de passe fort.
2. Ouvre `https://TON-DOMAINE/#admin`.
3. Entre le même `ADMIN_TOKEN` dans le formulaire de connexion admin.
4. Tu pourras ensuite ajouter, modifier et supprimer les produits (prix, description, image).
