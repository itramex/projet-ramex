# RAMEX Mobile (Expo / React Native)

Application mobile du projet RAMEX (gestion de la production de vanille), connectée à **la même API Django** que le frontend web. Fait partie du monorepo : `backend/` (API), `frontend/` (web), `mobile/` (cette app).

**Stack** : Expo **SDK 57** (`expo@57.0.21`, `react-native@0.86.3`, `expo-router@57.0.20`, TypeScript 6) — compatible avec Expo Go du store.

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

### Dépannage « serveur injoignable » sur téléphone

1. **`backend/.env`** : ajouter l'IP du PC à `ALLOWED_HOSTS` puis **redémarrer Django** :
   ```
   ALLOWED_HOSTS=localhost,127.0.0.1,<IP-du-PC>
   ```
2. **Binding** : lancer le serveur sur toutes les interfaces : `python manage.py runserver 0.0.0.0:8000`
3. **Pare-feu Windows** : autoriser le port 8000 (à exécuter en admin) :
   ```powershell
   netsh advfirewall firewall add rule name="RAMEX Django 8000" dir=in action=allow protocol=TCP localport=8000 profile=any
   ```
4. Vérifier la connexion depuis le PC : `Test-NetConnection <IP-du-PC> -Port 8000`

## 🔐 Authentification (JWT — identique au web)

- `POST /api/token/` : login (renvoie access, refresh **et** le profil utilisateur avec rôle)
- `POST /api/token/refresh/` : refresh **silencieux automatique** sur 401 (un seul refresh partagé)
- `POST /api/token/blacklist/` : à la déconnexion
- Tokens stockés dans le **Keychain/Keystore** (`expo-secure-store`), jamais en clair

## 📱 Écrans (v1)

- **Login** — mêmes identifiants que l'application web
- **Accueil** — statistiques producteurs (total / actifs / inactifs) + rôle de l'utilisateur
- **Producteurs** — liste paginée (20/page), recherche serveur anti-rebond, pull-to-refresh, **création / modification / suppression**
- **Détail producteur** — village, commune, fokontany, téléphone, badges actif/sexe/vérifié, accès à ses dotations, modifier / supprimer
- **Dotations producteur** — liste des dotations d'un producteur (type, année, quantité) + formulaire de saisie
- **Parcelles** — liste paginée avec recherche (code, producteur, lieu), détail (type de vanille, superficie, pieds, GPS), lien vers la fiche du producteur, **création / modification / suppression**
- **Profil** — rôle, agence/coopérative, déconnexion

## 🗺️ Roadmap — priorité à la collecte de données

L'objectif premier de l'app mobile est la **saisie terrain** (les données sont ensuite traitées sur le web) : les CRUD passent donc avant les écrans de consultation restants.

- ✅ **Socle** — login JWT (secure-store), accueil statistiques, profil, client API partagé avec le web
- ✅ **Consultation Producteurs & Parcelles** — listes paginées, recherche, fiches détail
- ✅ **Lot C1 — CRUD Producteurs** — formulaire création/édition, suppression, bouton « + Ajouter »
- ✅ **Lot C2 — CRUD Parcelles** — formulaire (producteur, culture, superficie, pieds, GPS), modifier, supprimer
- ✅ **Lot C4 — Dotations producteur** — liste + formulaire de saisie
- ⏭️ **Lot C3 — CRUD Ménages** (composition du ménage par producteur)
- ⏭️ **Lot C5 — Saisie Traçabilité** (FABC, fiches de collecte, transport, lots, colis)
- ⏭️ **Lot C6 — Consultations restantes** (coopératives, cycle annuel, formations, développement durable)
- ⏭️ **Lot C7 — Offline-first** : cache de lecture, file d'écriture locale (SQLite), synchronisation incrémentale (nécessitera des endpoints `?updated_since=` côté backend)
- ⏭️ **Lot C8 — Build APK/AAB** via EAS Build, déploiement

> Note : les *typed routes* d'Expo Router sont désactivées (`app.json`) pour permettre l'ajout d'écrans sans régénération de types — les `router.push()` acceptent des chemins dynamiques.

## 🧪 Qualité

```bash
npm run typecheck   # tsc --noEmit
```
