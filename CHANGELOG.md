# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier, au format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Chaque entrée référence la compétence de l'examen (E21-E29) qu'elle traite.

## [Unreleased]

### Sécurité (E28)

- **IDOR corrigée** : `PUT`/`DELETE /api/tasks/:id` vérifient désormais que la tâche appartient bien à l'utilisateur authentifié (`403 Not authorized` sinon).
- **Secret JWT renforcé** : remplacement de `secretkey123` par une valeur aléatoire de 128 caractères hexadécimaux ; ajout de `.env.example` pour documenter les variables attendues sans exposer de secret.
- **CORS restreint** : n'accepte plus que l'origine configurée via `FRONTEND_URL` au lieu de toutes les origines.
- **Validation des entrées** : schémas Joi ajoutés sur `register`, `login`, la création et la mise à jour de tâches.
- **Dépendances vulnérables mises à jour** : `mongoose`, `jsonwebtoken`, `cors`, `path-to-regexp`, `qs`, `ip-address`, `body-parser` (backend, 0 vulnérabilité connue) ; `axios`, `react-router-dom` (frontend).
- **Token JWT déplacé de `localStorage` vers un cookie `httpOnly`** : ajout de `POST /api/auth/logout` et `GET /api/auth/me`, `cookie-parser` et `credentials: true` en CORS.

### Corrigé (E27)

- La liste des tâches ne se mettait pas à jour après l'ajout d'une tâche sans recharger la page.
- Aucun message d'erreur n'était affiché à l'utilisateur en cas d'échec de connexion/inscription.
- Un token invalide renvoyait `418 I'm a teapot` au lieu de `401 Unauthorized`.

### Ajouté

- **Sécurisation de la production (E22)** : `helmet` (headers HTTP sécurisés), rate limiting (10 tentatives/15 min sur `login`/`register`), `trust proxy` pour un fonctionnement correct derrière le reverse proxy de Railway/Vercel.
- **Conteneurisation (E24)** : `Dockerfile` backend et frontend (multi-stage avec nginx), `docker-compose.yml` orchestrant backend + frontend + MongoDB, testé de bout en bout en local.
- **CI/CD (E24)** : pipeline GitHub Actions (`.github/workflows/ci-cd.yml`) - audit de sécurité, tests, build, et build des images Docker à chaque push/pull request.
- **Journalisation (E25)** : logger Winston (fichiers JSON + console) remplaçant tous les `console.log`/`console.error`, et middleware d'audit HTTP consignant chaque requête (méthode, URL, statut, durée, IP, utilisateur).
- **Supervision (E26)** : endpoint `GET /api/health` exposant l'état de l'application et de la connexion MongoDB.

### Documentation (E29)

- JSDoc ajouté sur toutes les routes de l'API (`routes/auth.js`, `routes/tasks.js`) et sur deux composants React (`pages/Tasks.js`, `components/TaskForm.js`).
- Handlers de routes refactorisés en fonctions nommées pour permettre la génération de documentation HTML (`npm run docs` dans `backend/`, via `jsdoc`).
- `docs/DEPLOYMENT.md` : choix d'hébergement (E21), sécurisation de la production (E22), stratégie de nom de domaine/DNS/certificats (E23), conteneurisation et CI/CD (E24), journalisation (E25), supervision et alertes (E26).
- Ce `CHANGELOG.md`.
