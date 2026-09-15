# Projet RAMEX
 
## Description

Application de gestion et de traçabilité pour la filière vanille, avec :

- **Backend** : API REST en Django avec support **PostGIS** pour la géolocalisation des parcelles.
- **Frontend** : SPA en **React** (Vite) pour l’interface utilisateur.
- **Base de données** : **PostgreSQL + extension PostGIS**.

L’objectif est de pouvoir déployer et lancer facilement le projet en **local (localhost)** sur n’importe quel poste.

---

## Stack technique

- **Backend** :
  - Django / Django REST Framework
  - `django.contrib.gis` + PostGIS
  - JWT / authentification
- **Base de données** :
  - PostgreSQL
  - Extension PostGIS activée sur la base
- **Frontend** :
  - React 19 + Vite
  - React Router, Axios, Chart.js, Leaflet, React-Leaflet, Tailwind CSS
- **Orchestration** :
  - Docker & Docker Compose

---

## Prérequis

Selon la méthode d’installation choisie :

- **Pour l’installation avec Docker (recommandée)** :
  - Docker Desktop (Windows / macOS) ou Docker Engine + Docker Compose (Linux).
  - Git.

- **Pour l’installation manuelle (sans Docker)** :
  - Python 3.10+ (idéalement 3.11).
  - Node.js 18+ et npm.
  - PostgreSQL + extension PostGIS.
  - Outils GIS nécessaires (GDAL, GEOS, etc. selon l’OS).

---

## Installation avec Docker (recommandée)

### 1. Cloner le dépôt

```bash
git clone <URL_DU_DEPOT> projet-ramex
cd projet-ramex
```

### 2. Lancer les services

Depuis la racine du projet (là où se trouve `docker-compose.yml`) :

```bash
docker compose up -d --build
# ou, selon la version :
# docker-compose up -d --build
```

Cela va :

- Créer un conteneur PostgreSQL avec PostGIS :
  - DB : `vanille_db`
  - USER : `vanille_user`
  - PASSWORD : `vanille_pass_2025`
- Construire et démarrer le backend Django (port interne `8000`).
- Construire et démarrer le frontend (exposé sur le port `80`).

### 3. Migrations et super utilisateur (optionnel si déjà automatisé)

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

### 4. Accès à l’application

- Frontend : http://localhost
- API (backend) : http://localhost:8000/api
- Django admin : http://localhost:8000/admin

Les variables d’environnement critiques sont déjà définies dans `docker-compose.yml` :

- Base de données (service `backend`) :
  - `DB_ENGINE=django.contrib.gis.db.backends.postgis`
  - `DB_NAME=vanille_db`
  - `DB_USER=vanille_user`
  - `DB_PASSWORD=vanille_pass_2025`
  - `DB_HOST=db`
  - `DB_PORT=5432`
- Frontend (service `frontend`) :
  - `VITE_API_URL=http://localhost:8000/api`

---

## Installation manuelle (sans Docker)

> À utiliser seulement si Docker n’est pas disponible ou souhaité.

### ⚡ Démarrage rapide (Windows)

Le plus simple : utilisez le script de démarrage automatique à la racine du projet.

**Option A - PowerShell :**
```powershell
.\start-dev.ps1
```

**Option B - CMD (double-clic) :**
```
start-dev.bat
```

Le script va automatiquement :
1. Vérifier que Python et Node.js sont installés
2. Créer l'environnement virtuel backend si absent
3. Installer les dépendances Python et Node si absentes
4. Créer les fichiers `.env` à partir des `.env.example` si absents
5. Appliquer les migrations Django
6. Lancer le backend (http://localhost:8000) et le frontend (http://localhost:5173) dans deux fenêtres séparées

---

### 1. Installer PostgreSQL + PostGIS

1. Installer PostgreSQL sur la machine.
2. Ajouter l’extension **PostGIS** (souvent proposée dans l’installateur ou via un package séparé).
3. Créer la base et l’utilisateur :

```sql
CREATE DATABASE vanille_db;
CREATE USER vanille_user WITH PASSWORD 'vanille_pass_2025';
GRANT ALL PRIVILEGES ON DATABASE vanille_db TO vanille_user;
GRANT USAGE ON SCHEMA public to vanille_user;
GRANT CREATE ON SCHEMA public to vanille_user;


\c vanille_db;
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER DATABASE vanille_db OWNER TO vanille_user;
```

Tu peux changer les noms et le mot de passe, mais il faudra adapter la configuration dans le fichier `.env` du backend.

### 2. Backend (Django)

Depuis le dossier `backend` :

#### a) Créer et activer un environnement virtuel

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
# source venv/bin/activate
```

#### b) Installer les dépendances Python

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### c) Créer le fichier `.env`

Copiez le fichier `.env.example` en `.env` et adaptez les valeurs :

```bash
# Windows
copy .env.example .env

# Linux / macOS
# cp .env.example .env
```

Le fichier `.env` contient toutes les variables configurables, y compris les chemins GDAL/GEOS :

```env
# --- Django Core ---
DEBUG=True
SECRET_KEY=django-insecure-dev-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1

# --- Base de données (PostgreSQL + PostGIS) ---
DB_ENGINE=django.contrib.gis.db.backends.postgis
DB_NAME=vanille_db
DB_USER=vanille_user
DB_PASSWORD=vanille_pass_2025
DB_HOST=localhost
DB_PORT=5432

# --- CORS ---
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# --- Chatbot (optionnel) ---
# IA locale Ollama désactivée par défaut : l'assistant utilise l'analyse
# locale par patterns (aucun appel réseau). Mettre True pour activer Ollama
# (modèle llama3.2 attendu sur localhost:11434).
CHATBOT_USE_OLLAMA=False

# --- GDAL / GEOS (Windows uniquement) ---
# Laissez vide si GDAL est dans le PATH système ou si vous utilisez Linux/Mac
GDAL_LIBRARY_PATH=
GEOS_LIBRARY_PATH=
OSGEO4W_PATH=
```

#### d) Configurer GDAL/GEOS (Windows uniquement)

Les chemins GDAL/GEOS sont désormais **configurables via le fichier `.env`** (plus besoin de modifier `settings.py`).

**Exemple pour PostgreSQL 17 (Windows) :**
```env
OSGEO4W_PATH=C:\Program Files\PostgreSQL\17\bin
GDAL_LIBRARY_PATH=C:\Program Files\PostgreSQL\17\bin\libgdal-35.dll
GEOS_LIBRARY_PATH=C:\Program Files\PostgreSQL\17\bin\libgeos_c.dll
```

**Exemple pour OSGeo4W (Windows) :**
```env
OSGEO4W_PATH=C:\OSGeo4W\bin
GDAL_LIBRARY_PATH=C:\OSGeo4W\bin\gdal308.dll
GEOS_LIBRARY_PATH=C:\OSGeo4W\bin\geos_c.dll
```

> **Note** : Sur Linux/Mac, laissez ces variables vides. Django trouvera automatiquement les bibliothèques via le PATH système.

#### e) Appliquer les migrations

```bash
python manage.py migrate
```

#### f) Créer un super utilisateur

```bash
python manage.py createsuperuser
```

#### g) Lancer le serveur Django

```bash
python manage.py runserver 0.0.0.0:8000
```

Le backend sera accessible sur : http://localhost:8000

### 3. Frontend (React + Vite)

Depuis le dossier `frontend` :

#### a) Installer les dépendances Node

```bash
cd ../frontend
npm install
```

#### b) Créer le fichier `.env`

Copiez le fichier `.env.example` en `.env` :

```bash
# Windows
copy .env.example .env

# Linux / macOS
# cp .env.example .env
```

Le fichier `.env` contient :

```env
VITE_API_URL=http://localhost:8000/api
```

#### c) Lancer le frontend en mode développement

```bash
npm run dev
```

Par défaut, Vite tourne sur : http://localhost:5173

### 4. URLs principales (installation manuelle)

- Frontend : http://localhost:5173
- API : http://localhost:8000/api
- Django admin : http://localhost:8000/admin
- Swagger : http://localhost:8000/api/schema/swagger-ui/
- ReDoc : http://localhost:8000/api/schema/redoc/

---

## Commandes utiles

### Docker

- Démarrer les services :

```bash
docker compose up -d --build
```

- Arrêter les services :

```bash
docker compose down
```

- Voir les logs :

```bash
docker compose logs -f
```

### Backend (local, sans Docker)

- Lancer le serveur : `python manage.py runserver`
- Appliquer les migrations : `python manage.py migrate`
- Créer un super utilisateur : `python manage.py createsuperuser`

### Frontend (local, sans Docker)

- Lancer le frontend : `npm run dev`
- Build de production : `npm run build`

---

## Contributions

Les contributions (issues, merge requests, suggestions) sont les bienvenues. Documenter les changements importants dans ce fichier ou dans un CHANGELOG dédié.

---

## Licence

Licence à définir selon le besoin du projet.
