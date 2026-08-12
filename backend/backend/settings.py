import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ============================================
# SECURITY SETTINGS
# ============================================
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# ============================================
# APPLICATION DEFINITION
# ============================================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'django_extensions',
    
    # Third party
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'rest_framework_gis',
    'corsheaders',
    'simple_history',
    'django_filters',
    'drf_spectacular',
    
    # Apps locales
    'users',
    'producteurs',
    'parcelles',
    'cooperatives',
    'formations',
    'tracabilite',
    'qualite',
    'finances',
    'dashboard',
    'api',
    'chatbot',
    'recommandations',
    'history',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'simple_history.middleware.HistoryRequestMiddleware',
    'backend.middleware.TokenRateLimitMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# ============================================
# DATABASE CONFIGURATION (PostGIS)
# ============================================
DATABASES = {
    'default': {
        'ENGINE': config('DB_ENGINE', default='django.contrib.gis.db.backends.postgis'),
        'NAME': config('DB_NAME', default='postgres'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c search_path=public',
        },
        'CONN_MAX_AGE': 60,  # Réutilise les connexions DB pendant 60s (pooling)
    }
}

import dj_database_url

# Configuration base de données via URL (pour Render/Supabase)
# Cette configuration écrase les valeurs ci-dessus si DATABASE_URL est défini

# ============================================
# CACHE CONFIGURATION (for rate limiting)
# ============================================
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'rate-limit-cache',
        'OPTIONS': {
            'MAX_ENTRIES': 10000
        }
    }
}

# ============================================
# PASSWORD VALIDATION
# ============================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ============================================
# INTERNATIONALIZATION
# ============================================
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Indian/Antananarivo'
USE_I18N = True
USE_TZ = True

# ============================================
# STATIC & MEDIA FILES
# ============================================
STATIC_URL = config('STATIC_URL', default='/static/')
STATIC_ROOT = BASE_DIR / config('STATIC_ROOT', default='staticfiles')

MEDIA_URL = config('MEDIA_URL', default='/media/')
MEDIA_ROOT = BASE_DIR / config('MEDIA_ROOT', default='media')

# ============================================
# DEFAULT PRIMARY KEY FIELD TYPE
# ============================================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================
# REST FRAMEWORK CONFIGURATION
# ============================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ============================================
# DRF SPECTACULAR (OpenAPI/Swagger) CONFIGURATION
# ============================================
SPECTACULAR_SETTINGS = {
    'TITLE': 'Systeme d\'Historique Annuel des Données - API',
    'DESCRIPTION': '''
    API REST pour le systeme d'historique annuel des données agricoles.
    
    Cette API permet de gérer et d'analyser l'évolution des données clés des producteurs :
    - Productions agricoles par parcelle et par année
    - Revenus des activités génératrices de revenus (AGR)
    - Indicateurs sociaux (scolarisation, santé, habitat)
    - Snapshots annuels pour référence
    - Analyse des tendances et détection d'anomalies
    
    ## Authentification
    
    L'API utilise JWT (JSON Web Tokens) pour l'authentification.
    Obtenez un token via `/api/users/token/` puis incluez-le dans l'en-tête :
    ```
    Authorization: Bearer <votre_token>
    ```
    
    ## Permissions
    
    - **Lecture** : Tous les utilisateurs authentifiés
    - **Écriture** : Administrateurs et gestionnaires uniquement
    
    ## Pagination
    
    Les listes sont paginées avec 100 éléments par page par défaut.
    Utilisez les paramètres `page` et `page_size` pour naviguer.
    ''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/',
    'SERVERS': [
        {'url': 'http://localhost:8000', 'description': 'Serveur de développement'},
        {'url': 'http://127.0.0.1:8000', 'description': 'Serveur de développement (alt)'},
    ],
    'TAGS': [
        {'name': 'Production History', 'description': 'Historique des productions agricoles'},
        {'name': 'AGR History', 'description': 'Historique des revenus AGR'},
        {'name': 'Social Indicators', 'description': 'Historique des indicateurs sociaux'},
        {'name': 'Snapshots', 'description': 'Snapshots annuels'},
        {'name': 'Trend Analysis', 'description': 'Analyse des tendances'},
    ],
    'CONTACT': {
        'name': 'Support API',
        'email': 'support@example.com',
    },
    'LICENSE': {
        'name': 'Propriétaire',
    },
}

# ============================================
# JWT CONFIGURATION
# ============================================
SIMPLE_JWT = {
    # Access token: courte durée pour sécurité (15 minutes)
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=15, cast=int)
    ),
    # Refresh token: longue durée pour UX mobile (30 jours)
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=30, cast=int)
    ),
    # Rotation des refresh tokens pour sécurité
    'ROTATE_REFRESH_TOKENS': config('JWT_ROTATE_REFRESH_TOKENS', default=True, cast=bool),
    'BLACKLIST_AFTER_ROTATION': config('JWT_BLACKLIST_AFTER_ROTATION', default=True, cast=bool),
    'UPDATE_LAST_LOGIN': False,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',

    'JTI_CLAIM': 'jti',

    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# ============================================
# CORS CONFIGURATION
# ============================================
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173,http:192.168.1.80:5173',
    cast=Csv()
)
CORS_ALLOW_CREDENTIALS = config('CORS_ALLOW_CREDENTIALS', default=True, cast=bool)

# ============================================
# LOGGING CONFIGURATION
# ============================================
import os

# Créer le dossier logs s'il n'existe pas
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': str(LOGS_DIR / 'django.log'),
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': config('LOG_LEVEL', default='INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': config('LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'cooperatives': {
            'handlers': ['console'],
            'level': config('COOPERATIVES_LOG_LEVEL', default='DEBUG'),
            'propagate': False,
        },
        'producteurs': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}


# ============================================
# GDAL / GEOS CONFIGURATION
# ============================================
# Ces chemins sont configurables via les variables d'environnement.
# Laissez-les vides si GDAL/GEOS sont dans le PATH système (Linux/Mac)
# ou si vous utilisez un gestionnaire de paquets (conda, apt, etc.).
#
# Exemple Windows (PostgreSQL 17) :
#   GDAL_LIBRARY_PATH=C:\Program Files\PostgreSQL\17\bin\libgdal-35.dll
#   GEOS_LIBRARY_PATH=C:\Program Files\PostgreSQL\17\bin\libgeos_c.dll
#   OSGEO4W_PATH=C:\Program Files\PostgreSQL\17\bin
#
# Exemple Windows (OSGeo4W) :
#   GDAL_LIBRARY_PATH=C:\OSGeo4W\bin\gdal308.dll
#   GEOS_LIBRARY_PATH=C:\OSGeo4W\bin\geos_c.dll
#   OSGEO4W_PATH=C:\OSGeo4W\bin

# Chemin du dossier OSGeo4W / PostgreSQL bin (optionnel, Windows uniquement)
OSGEO4W_PATH = config('OSGEO4W_PATH', default='')
if OSGEO4W_PATH:
    os.environ['PATH'] = OSGEO4W_PATH + ';' + os.environ['PATH']

# Chemins explicites des bibliothèques GDAL et GEOS (optionnel)
GDAL_LIBRARY_PATH = config('GDAL_LIBRARY_PATH', default='')
GEOS_LIBRARY_PATH = config('GEOS_LIBRARY_PATH', default='')

# Si les chemins sont vides, Django tentera de trouver les bibliothèques
# automatiquement via le PATH système ou les emplacements par défaut.
if GDAL_LIBRARY_PATH:
    os.environ['GDAL_LIBRARY_PATH'] = GDAL_LIBRARY_PATH
if GEOS_LIBRARY_PATH:
    os.environ['GEOS_LIBRARY_PATH'] = GEOS_LIBRARY_PATH


# ============================================
# EMAIL CONFIGURATION (Optionnel)
# ============================================
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

# ============================================
# SECURITY SETTINGS (PRODUCTION ONLY)
# ============================================
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_AGE = 30 * 24 * 60 * 60
    SESSION_SAVE_EVERY_REQUEST = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
