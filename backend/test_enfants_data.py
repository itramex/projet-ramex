#!/usr/bin/env python
"""
Script de diagnostic pour vérifier les données des enfants dans la base de données
"""
import os
import sys
import django

# Configuration Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from producteurs.models import Producteur
from datetime import datetime

print("=" * 80)
print("DIAGNOSTIC DES DONNÉES ENFANTS")
print("=" * 80)

# 1. Compter les producteurs
total_producteurs = Producteur.objects.count()
actifs = Producteur.objects.filter(actif=True).count()

print(f"\n📊 PRODUCTEURS:")
print(f"   Total: {total_producteurs}")
print(f"   Actifs: {actifs}")
print(f"   Inactifs: {total_producteurs - actifs}")

# 2. Vérifier les champs d'enfants
print(f"\n👶 CHAMPS ENFANTS (nb_enfants_*):")

producteurs_avec_garcons = Producteur.objects.filter(nb_enfants_garcons__gt=0).count()
producteurs_avec_filles = Producteur.objects.filter(nb_enfants_filles__gt=0).count()
producteurs_avec_scolarises = Producteur.objects.filter(nb_enfants_scolarises__gt=0).count()
producteurs_avec_non_scolarises = Producteur.objects.filter(nb_enfants_non_scolarises__gt=0).count()

print(f"   Producteurs avec nb_enfants_garcons > 0: {producteurs_avec_garcons}")
print(f"   Producteurs avec nb_enfants_filles > 0: {producteurs_avec_filles}")
print(f"   Producteurs avec nb_enfants_scolarises > 0: {producteurs_avec_scolarises}")
print(f"   Producteurs avec nb_enfants_non_scolarises > 0: {producteurs_avec_non_scolarises}")

# 3. Calculer les totaux
from django.db.models import Sum, F

agregats = Producteur.objects.filter(actif=True).aggregate(
    total_garcons=Sum('nb_enfants_garcons'),
    total_filles=Sum('nb_enfants_filles'),
    total_autres_garcons=Sum('nb_autres_garcons'),
    total_autres_filles=Sum('nb_autres_filles'),
    total_scolarises=Sum('nb_enfants_scolarises'),
    total_non_scolarises=Sum('nb_enfants_non_scolarises')
)

print(f"\n📈 TOTAUX (producteurs actifs):")
print(f"   Garçons (nb_enfants_garcons): {agregats['total_garcons'] or 0}")
print(f"   Filles (nb_enfants_filles): {agregats['total_filles'] or 0}")
print(f"   Autres garçons (nb_autres_garcons): {agregats['total_autres_garcons'] or 0}")
print(f"   Autres filles (nb_autres_filles): {agregats['total_autres_filles'] or 0}")
print(f"   Scolarisés (nb_enfants_scolarises): {agregats['total_scolarises'] or 0}")
print(f"   Non scolarisés (nb_enfants_non_scolarises): {agregats['total_non_scolarises'] or 0}")

total_enfants_calcule = (
    (agregats['total_garcons'] or 0) + 
    (agregats['total_filles'] or 0) + 
    (agregats['total_autres_garcons'] or 0) + 
    (agregats['total_autres_filles'] or 0)
)
print(f"   TOTAL ENFANTS (calculé): {total_enfants_calcule}")

# 4. Vérifier les années de naissance
print(f"\n🎂 ANNÉES DE NAISSANCE (annee_naissance_enfant_*):")

annee_actuelle = datetime.now().year
enfants_avec_annee = 0
enfants_3_18_ans = 0

for i in range(1, 11):
    field_name = f'annee_naissance_enfant_{i}'
    count = Producteur.objects.filter(actif=True).exclude(**{f'{field_name}__isnull': True}).count()
    print(f"   {field_name}: {count} producteurs ont renseigné ce champ")
    
    # Compter les enfants avec année de naissance
    for p in Producteur.objects.filter(actif=True).exclude(**{f'{field_name}__isnull': True}):
        annee_naissance = getattr(p, field_name)
        if annee_naissance:
            enfants_avec_annee += 1
            age = annee_actuelle - annee_naissance
            if 3 <= age <= 18:
                enfants_3_18_ans += 1

print(f"\n   TOTAL enfants avec année de naissance: {enfants_avec_annee}")
print(f"   TOTAL enfants 3-18 ans: {enfants_3_18_ans}")

# 5. Vérifier le champ continue_ecole
print(f"\n🎓 SCOLARISATION (continue_ecole_enfant_*):")

for i in range(1, 11):
    field_name = f'continue_ecole_enfant_{i}'
    count_true = Producteur.objects.filter(actif=True, **{field_name: True}).count()
    print(f"   {field_name}=True: {count_true} producteurs")

# 6. Échantillon de données
print(f"\n📋 ÉCHANTILLON (5 premiers producteurs actifs avec enfants):")

producteurs_sample = Producteur.objects.filter(actif=True).exclude(
    nb_enfants_garcons=0, nb_enfants_filles=0
)[:5]

for p in producteurs_sample:
    print(f"\n   Producteur: {p.code} - {p.nom} {p.prenom}")
    print(f"      Garçons: {p.nb_enfants_garcons}, Filles: {p.nb_enfants_filles}")
    print(f"      Scolarisés: {p.nb_enfants_scolarises}, Non scolarisés: {p.nb_enfants_non_scolarises}")
    print(f"      Taux scolarisation: {p.taux_scolarisation}%")
    
    # Vérifier les années de naissance
    annees = []
    for i in range(1, 11):
        annee = getattr(p, f'annee_naissance_enfant_{i}', None)
        if annee:
            age = annee_actuelle - annee
            continue_ecole = getattr(p, f'continue_ecole_enfant_{i}', False)
            annees.append(f"{annee} ({age}ans, {'✓' if continue_ecole else '✗'})")
    
    if annees:
        print(f"      Années naissance: {', '.join(annees)}")

# 7. Diagnostic du problème
print(f"\n" + "=" * 80)
print("🔍 DIAGNOSTIC:")
print("=" * 80)

if total_enfants_calcule == 0:
    print("❌ PROBLÈME: Aucun enfant trouvé dans nb_enfants_garcons/filles")
    print("   → Les champs nb_enfants_* sont vides ou à zéro")
    print("   → Vérifiez l'import des données Excel")
elif enfants_3_18_ans == 0:
    print("❌ PROBLÈME: Aucun enfant avec année de naissance entre 3-18 ans")
    print("   → Les champs annee_naissance_enfant_* sont vides")
    print("   → Le calcul du taux de scolarisation nécessite ces données")
else:
    print("✅ Données trouvées:")
    print(f"   - {total_enfants_calcule} enfants au total")
    print(f"   - {enfants_3_18_ans} enfants en âge scolaire (3-18 ans)")
    print(f"   - {agregats['total_scolarises'] or 0} enfants scolarisés")
    
    if enfants_3_18_ans > 0:
        taux = round((agregats['total_scolarises'] or 0) / enfants_3_18_ans * 100, 2)
        print(f"   - Taux de scolarisation: {taux}%")

print("\n" + "=" * 80)
