# 📋 Checklist BDD — Demandes d'amélioration de la Direction

> **Source** : `Projet_BDD_SAVA/Checklist BDD.xlsx` — Test du **10/09/2026**
> **Type** : Checklist de recette de l'application (Web) par le supérieur hiérarchique.
> Les commentaires d'origine (français / malgache) sont conservés **en italique**, suivis de leur traduction.
> Note : le développement mobile est **en pause** — ces demandes concernent l'application **web**.

## 📊 Synthèse

| Statut | Nombre | Signification |
|---|---|---|
| ✅ Terminés | **11** | Déjà réalisé |
| 🔶 En cours | **13** | Corrections / ajustements à faire |
| ⛔ Bloqués | **0** | — |
| 🔴 À faire | **12** | Restant à développer |
| **Total** | **36** | Avancement **~31 %** |

**Répartition** : Coopérative 5 · Producteur 4 · Ménage 4 · Parcelle 2 · Certification & Formation 6 · Activités 5 · Scolarisation 1 · Dotation 1 · Admin 2 · Dashboard 6.

---

## 🏢 Coopérative

| # | Demande | Statut | Commentaire d'origine (traduction) |
|---|---|---|---|
| 1 | Date d'adhésion d'un producteur dans une coopérative | ✅ Terminés | — |
| 2 | Voir l'année de création d'une coopérative | ✅ Terminés | — |
| 3 | Liste coopérative : liste des responsables par coopérative | ✅ Terminés | — |
| 4 | Liste coopérative : savoir quels villages sont regroupés dans quelles coopératives | ✅ Terminés | — |
| 5 | Utilisation de l'historique et du snapshot | 🔶 En cours | *« Mila simulena @donnée maromaro ve zay vo mety ? »* → **Il faut tester avec beaucoup de données pour vérifier que ça marche.** |

---

## 👤 Producteur

| # | Demande | Statut | Commentaire d'origine (traduction) |
|---|---|---|---|
| 6 | Personnalisation de l'affichage (colonnes) | ✅ Terminés | — |
| 7 | **Filtre par agence à ajouter pour l'admin** | 🔴 À faire | — |
| 8 | **Historique : pouvoir voir les données cumulées d'un producteur / village** (estimation, dotation, réalisations, etc.) | 🔴 À faire | — |
| 9 | **Fiche récapitulative d'un producteur** : tout ce qui le concerne avec toutes les données dispo en BDD | 🔶 En cours | *« Mila alamina kely ny contenu à afficher »* → **Il faut aménager un peu le contenu à afficher.** |

---

## 🏠 Ménage

| # | Demande | Statut | Commentaire d'origine (traduction) |
|---|---|---|---|
| 10 | Ménage : hommes et femmes — à partir de quel âge ? | ✅ Terminés | — |
| 11 | **Formule du taux de scolarisation** | 🔶 En cours | — |
| 12 | **Taux de scolarisation : filtre par an ou multi-ans ?** (pour voir l'évolution d'année en année) | 🔶 En cours | — |
| 13 | **Impact des kits scolaires : à revoir** | 🔶 En cours | *« Mila manana donnée avy any @école (résultat d'examen ou taux d'inscription) »* → **Il faut disposer de données provenant de l'école (résultat d'examen ou taux d'inscription).** |

---

## 🌱 Parcelle

| # | Demande | Statut | Commentaire d'origine (traduction) |
|---|---|---|---|
| 14 | **Filtre à revoir** (page parcelle) — ✅ corrigé | ✅ Terminés | *« Tsy mamoaka donnée sauf autre produit »* → **Ne renvoyait que « autre produit » car le filtre matcher uniquement `culture_principale` au lieu de la liste JSON `cultures_pratiquees` (parcelles multi-cultures invisibles). Corrigé : matche maintenant les DEUX (culture principale + cultures pratiquées). Vérifié en base : vanille 392→393, café 238.** |
| 15 | **Les autres produits doivent avoir des données parcellaires** (vanille, café, girofle…) | 🔴 À faire | *« autres produits koa tokony hanana donnée parcellaire na koa oe sady vanille no café ou vanille no girofle »* → **Les autres produits doivent aussi avoir des données parcellaires (soit vanille, soit café, soit vanille + girofle…).** |

---
## 🎓 Certification & Formation

| # | Demande | Statut | Commentaire d'origine (traduction) |
|---|---|---|---|
| 16 | **Filtre à choix multiples** | 🔴 À faire | — |
| 17 | Formation : année de formation ? Formateur ? Lieu ? | ✅ Terminés | — |
| 18 | **Formation : filtre par producteur et par formation** | 🔶 En cours | — |
| 19 | **Formation : filtre par village** pour faciliter le choix des producteurs | 🔴 À faire | — |
| 20 | **Historique de certification par année avec visuel** : liste des producteurs, pièce jointe (certificat + résultat / rapport d'audit), suivi des non-conformités avec preuve jointe | 🔴 À faire | — |
| 21 | Liste des certifications : affichage côte à côte (par ex. sur une ligne : nom du producteur et ses certifications G4G, BIO, etc.) pour faciliter les recherches | ✅ Terminés | — |

---

## 🛠️ Activités

| # | Demande | Statut | Commentaire d'origine (traduction) |
|---|---|---|---|
| 22 | **Dotation : préciser de quoi on a doté les producteurs** (kits scolaires ? poisson ? volailles ? etc.) | 🔶 En cours | *« il ne faut pas faire un calcul cumulé du nombre des dotations mais séparé selon la rubrique / Asiana bouton afahana mijery liste des bénéficiaires si possible »* → **Ne pas faire de total cumulé : séparer par rubrique. Ajouter un bouton pour voir la liste des bénéficiaires.** |
| 23 | **Mahavelona : année ? Possibilité de voir les archivages par an** (les critères changeront à chaque fois) | 🔶 En cours | — |
| 24 | **Gestion AGR : filtre par producteur, village, année** | 🔶 En cours | *« possibilité de cumuler les données d'un prod/village sur plusieurs années ? »* → **Possibilité de cumuler les données d'un producteur / village sur plusieurs années ?** |
| 25 | **Historique des activités** | 🔶 En cours | *« possibilité de cumuler les données d'un prod/village sur plusieurs années ? »* → **Idem : possibilité de cumul multi-années.** |
| 26 | **Menu « Dotation » à intégrer dans « Activité »** | 🔴 À faire | — |

---

## 🎒 Scolarisation

| # | Demande | Statut | Commentaire d'origine (traduction) |
|---|---|---|---|
| 27 | **Mettre des années et possibilité de cumuler** — ex. : Producteur A a reçu un kit scolaire en 2023, 2 kits en 2024 et 0 kit en 2025 | 🔴 À faire | — |

---

## 🐟 Dotation (détache)

| # | Demande | Statut | Commentaire d'origine (traduction) |
|---|---|---|---|
| 28 | **Comment relier les dotations avec le ménage ?** (ex. : kits scolaire → taux de scolarisation ; poulet → AGR) | 🔴 À faire | — |

---

## 🔐 Admin

| # | Demande | Statut | Commentaire d'origine (traduction) |
|---|---|---|---|
| 29 | **Login partagé par agence (confidentialité des données)** : seuls les BL (?) et les responsables voient tout, les autres avec filtre | 🔴 À faire | *« Login tokony mizara par agence (resaka confidentialité des données) fa ny BL sy ny responsable ihany no mahita jiaby fa manao filtre »* → **Le login doit être séparé par agence (confidentialité des données) : seuls les BL et les responsables voient tout, les autres voient avec un filtre.** |
| 30 | **Méthode de mise à jour des données à discuter** — même fichier de base à importer ou autre méthode ? Semestrielle ou annuelle ? | 🔴 À faire | *« Même fichier de base à importer sa misy methode hafa ? Semestrielle ou annuelle ? »* → **Même fichier de base à importer ou une autre méthode ? Semestrielle ou annuelle ?** |

---

## 📊 Dashboard

| # | Demande | Statut | Commentaire d'origine (traduction) |
|---|---|---|---|
| 31 | **Les filtres à vérifier** — ✅ corrigé | ✅ Terminés | *« Tsy manaraka filtre ny résultat affiché »* → **Les onglets Hygiène / Enfants / Environnement ignoraient les filtres (le loadSocialData n'envoyait AUCUN paramètre, et les endpoints backend ne les écoutaient pas). Corrigé des deux côtés : les 3 endpoints appliquent désormais village / commune / fokontany.** |
| 32 | **Statistiques AGR à revoir** | 🔶 En cours | *« Tsy cumulena ny total fa sarahana par type / Tsy cumulena ihany koa ny total revenu fa sarahana par type »* → **Le total n'est pas cumulé mais séparé par type / le total des revenus non plus : les séparer par type.** |
| 33 | **Social : ajouter une option pour voir la liste des producteurs qui n'ont pas de WC / assurance santé** (par exemple) | 🔶 En cours | *« tokony asiana option voir liste ireo producteur tsy manana WC/assurance santé par exemple »* → **Il faut une option pour lister les producteurs sans WC / sans assurance santé.** |
| 34 | **Enfants et scolarisation : à revoir** — ✅ corrigé | ✅ Terminés | *« Lasa 0 enfant scolarisé »* → **Le score sommait le champ agrégé `nb_enfants_scolarises` (laissé à 0) au lieu des enfants détaillés `continue_ecole_enfant_N`. Corrigé : calcul depuis les enfants 3-18 ans (même règle que le dashboard global), avec filtres village/commune/fokontany.** |
| 35 | **Décisionnel : à discuter avec les concernés** | 🔴 À faire | — |
| 36 | **Autre produit : seule l'estimation est dispo, le reste manque** — analyse de la résilience des producteurs (ex. : est-ce vendu ou consommé ? Si vendu, quel %) | 🔶 En cours | *« tokony affiché ilay % raha amidy, firy % raha ohanina / tsy cumulena ny total »* → **Afficher le % si vendu, le % si consommé / le total n'est pas cumulé.** |

---
## 🎯 Synthèse par priorité

### 🔴 Bogues identifiés (à corriger en premier)
✅ **3 bogues corrigés le 11/09/2026** : #14 (filtre Parcelle multi-cultures) · #31 (filtres Dashboard Social) · #34 (enfant scolarisé = 0) — voir détail dans les tableaux.

### 🆕 Fonctionnalités à développer (À faire — 12)
- **#7** Filtre par agence (admin) · **#16** Filtres à choix multiples · **#19** Filtre formation par village
- **#20** Historique certification + pièces jointes + non-conformités
- **#26** Intégrer « Dotation » dans le menu « Activité »
- **#27** Scolarisation multi-années cumulables
- **#28** Liaison dotation ↔ ménage
- **#29** Confidentialité par agence (login/filtres)
- **#30** Méthode de mise à jour des données (à discuter)
- **#35** Dashboard décisionnel (à discuter)

### 🔶 À affiner (En cours — 13)
- Cumuls multi-années par producteur/village (**#8, #24, #25**), fiche récap producteur (**#9**), visuels d'impact (**#13, #23, #36**), ventes/consommations (**#36**), statistiques AGR par type (**#32**), liste des bénéficiaires et rubriques dotations (**#22**), liste des sans-WC / sans-assurance (**#33**), taux de scolarisation (**#11, #12**).

---

## 📈 Progression

| Date | Événement | Avancement |
|---|---|---|
| 10/09/2026 | Test checklist par la direction | ~22 % (8 Terminés / 16 En cours / 12 À faire) |
| 11/09/2026 | **3 bogues corrigés** : #14 filtre Parcelle multi-cultures (matche `culture_principale` + JSON `cultures_pratiquees`), #31 filtres Dashboard appliqués aux onglets Hygiène/Enfants/Environnement (backend + frontend), #34 scolarisation recalculée depuis les enfants détaillés 3-18 ans | ~31 % (11 / 13 / 12) |