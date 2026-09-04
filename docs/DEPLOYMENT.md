# Déploiement et exploitation

Ce document couvre les compétences E21 à E26 : choix d'hébergement, sécurisation de la production, nom de domaine et certificats, CI/CD, journalisation et supervision.

## E21 — Choix de la solution d'hébergement

### Critères retenus

| Critère | Poids | Justification |
|---|---|---|
| Coût | Élevé | Projet d'entraînement, pas de budget d'entreprise |
| Simplicité de mise en place | Élevé | Pas d'équipe infra dédiée, doit rester maintenable seul |
| Sécurité par défaut | Moyen | HTTPS, isolation réseau doivent être pris en charge par la plateforme |
| Maintenance | Moyen | Pas de serveur à patcher/mettre à jour manuellement |
| Scalabilité | Faible | Trafic attendu très faible pour ce projet |

### Solutions comparées

| Solution | Coût mensuel | Effort de mise en place | Gestion HTTPS/DNS |
|---|---|---|---|
| VPS (Hetzner/Scaleway/OVH) + Docker Compose | ~4-6 € | Élevé (OS, Docker, nginx, certbot, mises à jour de sécurité à la charge de l'utilisateur) | Manuelle (certbot) |
| Cloud majeur (AWS ECS/Fargate, Azure, GCP) | Variable, difficile à prévoir | Élevé (IAM, VPC, load balancer, etc.) | Managée mais complexe à configurer |
| **PaaS managé (retenu)** | **~5 $ / mois** | **Faible** (connexion du repo Git, déploiement automatique) | **Automatique** (certificats Let's Encrypt gérés par la plateforme) |

### Solution retenue

- **Frontend** → **Vercel** (plan Hobby, gratuit). Build et déploiement automatique à chaque push, CDN global, HTTPS automatique, déploiements de preview par branche.
- **Backend (API Express)** → **Railway** (plan Hobby, ~5 $/mois). Déploiement à partir du repo Git, variables d'environnement gérées dans l'interface, HTTPS automatique.
- **Base de données** → **MongoDB Atlas**, cluster **M0** (gratuit à vie, 512 Mo). Managé, sauvegardes et sécurité réseau (IP allowlist) gérées par MongoDB.

### Coût total estimé

- Vercel : 0 $/mois (usage personnel, hors cadre commercial)
- MongoDB Atlas M0 : 0 $/mois
- Railway Hobby : ~5 $/mois

**Total : environ 5 $/mois**, contre plusieurs dizaines d'euros/mois pour une architecture cloud majeur équivalente, et un coût de maintenance humaine quasi nul comparé à un VPS auto-géré (pas de mises à jour OS, pas de configuration nginx/certbot à maintenir).

### Environnements

Cette architecture permet nativement de séparer préproduction et production (voir E23) :
- **Vercel** : chaque Pull Request génère un déploiement de preview isolé ; la branche `main` déploie en production.
- **Railway** : deux services distincts dans le même projet (`backend-staging` et `backend-production`), chacun avec ses propres variables d'environnement (`MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`).
- **MongoDB Atlas** : deux bases séparées sur le même cluster M0 (`exam_practice_db_staging` et `exam_practice_db`), ou deux clusters M0 si l'isolation complète est préférée.

## E22 — Sécurisation de l'environnement de production

### Mesures appliquées dans le code

- **Headers HTTP de sécurité** (`helmet`) : ajouté dans `server.js`, protège contre le clickjacking, force `X-Content-Type-Options`, désactive la divulgation de la stack technique via les headers par défaut d'Express.
- **Rate limiting anti brute-force** (`express-rate-limit`) : `/api/auth/login` et `/api/auth/register` sont limités à 10 tentatives par IP toutes les 15 minutes.
- **`app.set('trust proxy', 1)`** : nécessaire en production car Railway/Vercel terminent le TLS et transmettent la requête via un reverse proxy interne. Sans ce réglage, `express-rate-limit` limiterait par l'IP du proxy (donc tout le monde en même temps) au lieu de l'IP réelle du client, et le flag `secure` du cookie de session ne serait pas fiable.
- **Cookie d'authentification `httpOnly` + `secure` en production** : déjà en place depuis E28 (`backend/routes/auth.js`), `secure: true` n'est actif que lorsque `NODE_ENV=production`.
- **Secrets hors du code** : `.env` non versionné, `.env.example` documente les variables attendues (voir E28).

### Configuration à faire au niveau des plateformes (à faire lors du déploiement réel, E24)

- **Railway** : définir `NODE_ENV=production`, `JWT_SECRET` (valeur forte, différente de celle du `.env` local), `MONGO_URI` (pointant vers Atlas) et `FRONTEND_URL` (URL Vercel de production) dans les variables d'environnement du service — jamais dans le code.
- **MongoDB Atlas** :
  - Créer un utilisateur de base de données dédié à l'application, avec des droits limités à la base `exam_practice_db` (pas de rôle `admin`/`root`).
  - Restreindre l'accès réseau (Network Access) aux IP sortantes de Railway plutôt qu'à `0.0.0.0/0`, quand Railway fournit une IP sortante stable sur le plan utilisé.
- **Vercel** : aucune variable sensible nécessaire côté frontend (l'URL de l'API backend suffit, elle n'est pas secrète).

## E23 — Nom de domaine, DNS et certificats

Un nom de domaine personnalisé (`.com`, `.fr`...) est payant (~8-15 €/an) et n'apporte pas de valeur pédagogique supplémentaire pour ce projet d'entraînement. Vercel et Railway fournissent chacun un sous-domaine gratuit avec HTTPS déjà géré automatiquement — c'est ce qui est retenu ici.

### Sous-domaines retenus

| Environnement | Frontend (Vercel) | Backend (Railway) |
|---|---|---|
| Production | `exam-practice-app.vercel.app` | `exam-practice-app-production.up.railway.app` |
| Préproduction | `exam-practice-app-git-develop.vercel.app` (preview auto par branche) | `exam-practice-app-staging.up.railway.app` |

### Fonctionnement DNS

Avec des sous-domaines de plateforme, la zone DNS est entièrement gérée par Vercel/Railway : aucun enregistrement à créer manuellement, l'attribution `sous-domaine → conteneur applicatif` est automatique dès la connexion du dépôt Git au service.

Si un nom de domaine personnalisé était ajouté plus tard, la procédure serait :
1. Acheter le domaine chez un registrar (OVH, Gandi, Namecheap...).
2. Dans Vercel/Railway, ajouter le domaine personnalisé au projet : la plateforme fournit un enregistrement DNS à créer (`CNAME` pointant vers le sous-domaine de la plateforme, ou `A` vers son IP).
3. Créer cet enregistrement chez le registrar (ex. `app.mondomaine.fr CNAME cname.vercel-dns.com`).
4. Attendre la propagation DNS (quelques minutes à 24h), la plateforme détecte automatiquement le domaine validé.

### Certificats HTTPS

Vercel et Railway émettent et renouvellent automatiquement un certificat **Let's Encrypt** dès qu'un domaine (par défaut ou personnalisé) est validé — aucune manipulation `certbot` n'est nécessaire, contrairement à un VPS auto-géré (voir E21).

**Vérification du certificat** une fois l'application déployée (E24) :
```bash
curl -vI https://exam-practice-app.vercel.app 2>&1 | grep -i "SSL certificate"
# ou, pour le détail complet (émetteur, date d'expiration) :
openssl s_client -connect exam-practice-app.vercel.app:443 -servername exam-practice-app.vercel.app </dev/null 2>/dev/null | openssl x509 -noout -issuer -dates
```
