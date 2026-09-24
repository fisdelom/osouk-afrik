# Déployer Osouk d'Afrik gratuitement

Cette boutique est une application Node.js : le frontend React et l'API Express
sont servis ensemble. Les commandes sont envoyées directement vers WhatsApp ; le
site ne conserve donc aucune coordonnée client ni aucune commande dans sa base.

## Services recommandés

- **Render** : héberge le site et l'API Express sur un Web Service gratuit.
- **Neon** : héberge le catalogue dans une base PostgreSQL gratuite et persistante.

Render met le service gratuit en veille après une période d'inactivité. Le
premier chargement suivant peut être plus lent. Neon reste la source de vérité
pour les produits : ne pas utiliser le disque local de Render pour les données.

## 1. Créer la base Neon

1. Crée un projet gratuit sur https://neon.com.
2. Copie la chaîne de connexion PostgreSQL fournie par Neon (elle contient
   généralement `sslmode=require`).
3. Ne publie jamais cette valeur dans GitHub.

## 2. Créer le Web Service Render

1. Connecte GitHub à https://render.com puis choisis **New > Web Service**.
2. Sélectionne le dépôt `fisdelom/osouk-afrik`.
3. Choisis la branche à publier et renseigne :

   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Health Check Path** : `/health`

4. Dans **Environment**, ajoute :

   - `NODE_ENV=production`
   - `DATABASE_URL` : la chaîne Neon complète
   - `ADMIN_TOKEN` : un secret long, unique et impossible à deviner

Ne règle pas `DATABASE_SSL` : la valeur par défaut active TLS, requis par Neon.

## 3. Vérifier après déploiement

1. Ouvre `https://ton-domaine.onrender.com/health` : le statut doit être `ok`
   et `dbReady` doit devenir `true` après l'initialisation.
2. Ouvre la boutique et vérifie le catalogue.
3. Ouvre `https://ton-domaine.onrender.com/#admin`, saisis `ADMIN_TOKEN`, puis
   crée un produit de test et confirme qu'il reste visible après actualisation.
4. Ajoute un article au panier et vérifie que le bouton WhatsApp contient le
   produit, le prix promotionnel éventuel et le total correct.

## Administration

Le back-office ne doit jamais être publié sans `ADMIN_TOKEN`. Le token est
conservé dans le navigateur de l'administrateur pour éviter de le ressaisir ;
déconnecte-toi après usage sur un appareil partagé.

Les images de produits sont actuellement fournies sous forme d'URL HTTPS. Pour
des images personnelles, héberge-les dans un service d'images puis colle leur
URL dans le formulaire admin.
