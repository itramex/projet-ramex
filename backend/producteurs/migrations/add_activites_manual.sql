-- Script SQL pour ajouter les colonnes des activités
-- À exécuter si la migration Django échoue

-- Connexion à la base de données
-- psql -U vanille_user -d vanille_db (pour PostgreSQL)
-- ou python manage.py dbshell

-- ==============================================
-- AJOUTER LES COLONNES AU MODÈLE PRODUCTEUR
-- ==============================================
-- IMPORTANT: dotation, agr1, agr2 sont TEXT (pas BOOLEAN)
-- Seul mahavelona est BOOLEAN

-- Ajouter la colonne dotation (TEXT)
ALTER TABLE producteurs_producteur 
ADD COLUMN IF NOT EXISTS dotation TEXT DEFAULT '';

-- Ajouter la colonne agr1 (TEXT)
ALTER TABLE producteurs_producteur 
ADD COLUMN IF NOT EXISTS agr1 TEXT DEFAULT '';

-- Ajouter la colonne agr2 (TEXT)
ALTER TABLE producteurs_producteur 
ADD COLUMN IF NOT EXISTS agr2 TEXT DEFAULT '';

-- Ajouter la colonne mahavelona (BOOLEAN)
ALTER TABLE producteurs_producteur 
ADD COLUMN IF NOT EXISTS mahavelona BOOLEAN DEFAULT FALSE;

-- ==============================================
-- AJOUTER LES COLONNES AU MODÈLE HISTORIQUE
-- (django-simple-history)
-- ==============================================

-- Ajouter la colonne dotation à l'historique (TEXT)
ALTER TABLE producteurs_historicalproducteur 
ADD COLUMN IF NOT EXISTS dotation TEXT DEFAULT '';

-- Ajouter la colonne agr1 à l'historique (TEXT)
ALTER TABLE producteurs_historicalproducteur 
ADD COLUMN IF NOT EXISTS agr1 TEXT DEFAULT '';

-- Ajouter la colonne agr2 à l'historique (TEXT)
ALTER TABLE producteurs_historicalproducteur 
ADD COLUMN IF NOT EXISTS agr2 TEXT DEFAULT '';

-- Ajouter la colonne mahavelona à l'historique (BOOLEAN)
ALTER TABLE producteurs_historicalproducteur 
ADD COLUMN IF NOT EXISTS mahavelona BOOLEAN DEFAULT FALSE;

-- ==============================================
-- VÉRIFICATION
-- ==============================================

-- Vérifier que les colonnes ont été ajoutées au modèle Producteur
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'producteurs_producteur'
  AND column_name IN ('dotation', 'agr1', 'agr2', 'mahavelona')
ORDER BY column_name;

-- Vérifier que les colonnes ont été ajoutées au modèle HistoricalProducteur
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'producteurs_historicalproducteur'
  AND column_name IN ('dotation', 'agr1', 'agr2', 'mahavelona')
ORDER BY column_name;

-- ==============================================
-- MARQUER LA MIGRATION COMME APPLIQUÉE
-- ==============================================

-- Insérer l'enregistrement de migration dans django_migrations
INSERT INTO django_migrations (app, name, applied)
VALUES ('producteurs', '0002_add_activites_fields', NOW())
ON CONFLICT DO NOTHING;

-- Vérifier que la migration est enregistrée
SELECT * FROM django_migrations 
WHERE app = 'producteurs' 
ORDER BY applied DESC;
