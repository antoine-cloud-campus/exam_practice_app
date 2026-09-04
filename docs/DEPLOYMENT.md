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
