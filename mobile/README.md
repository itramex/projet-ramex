# RAMEX Mobile (Expo / React Native)

Application mobile du projet RAMEX (gestion de la production de vanille), connectée à **la même API Django** que le frontend web. Fait partie du monorepo : `backend/` (API), `frontend/` (web), `mobile/` (cette app).

## 🚀 Démarrage

```bash
cd mobile
npm install
npx expo start
```

Puis scanner le QR code avec **Expo Go** (Android/iOS), ou appuyer sur `a` (émulateur Android) / `w` (navigateur).

## 🔌 Connexion à l'API Django

Par défaut l'app appelle `http://127.0.0.1:8000/api` (backend Django local).

| Contexte | Configuration |
|---|---|
| Émulateur Android | `10.0.2.2` remplace localhost (alias du PC hôte) |
| Appareil physique (même Wi-Fi) | Créer `mobile/.env` avec `EXPO_PUBLIC_API_URL=http://<IP-du-PC>:8000/api` (IP visible via `ipconfig`) et lancer le backend avec `python manage.py runserver 0.0.0.0:8000` |

## 🔐 Authentification (JWT — identique au web)

- `POST /api/token/` : login (renvoie access, refresh **et** le profil utilisateur avec rôle)
- `POST /api/token/refresh/` : refresh **silencieux automatique** sur 401 (un seul refresh partagé)
- `POST /api/token/blacklist/` : à la déconnexion
- Tokens stockés dans le **Keychain/Keystore** (`expo-secure-store`), jamais en clair

## 📱 Écrans (v1)

- **Login** — mêmes identifiants que l'application web
- **Accueil** — statistiques producteurs (total / actifs / inactifs) + rôle de l'utilisateur
- **Producteurs** — liste paginée (20/page) avec recherche serveur anti-rebond, pull-to-refresh
- **Détail producteur** — village, commune, fokontany, téléphone, badges actif/sexe/vérifié
- **Profil** — rôle, agence/coopérative, déconnexion

## 🗺️ Roadmap

- **Phase 2** : saisie terrain (formulaires création/édition, photos, GPS)
- **Phase 3** : offline-first — cache de lecture, file d'écriture locale (SQLite), synchronisation incrémentale (nécessitera des endpoints `?updated_since=` côté backend)
- **Phase 4** : build APK/AAB via EAS Build, déploiement

## 🧪 Qualité

```bash
npm run typecheck   # tsc --noEmit
```
