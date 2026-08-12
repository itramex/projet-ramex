# Spécification métier — Chaîne de valeur Vanille RAMEX
### Certification, Développement Durable, Traçabilité

> Document de référence extrait et structuré depuis `CHAINE_DE_VALEUR_VANILLE_JUIL_25.pptx`, destiné à être utilisé comme contexte métier pour le développement d'une application (vibe coding).

---

## 1. Contexte

RAMEX (RAMANANDRAIBE EXPORTATION S.A.) est un exportateur de vanille opérant dans la région SAVA (Madagascar), avec des districts couvrant Sambava, Antalaha, Vohemar et Andapa, ainsi que des extensions vers Ambatosoa, Maroantsetra (WMN) et Mananara Nord (MNA).

L'entreprise gère sa filière vanille autour de **trois piliers d'intervention** appliqués au même réseau d'acteurs terrain :

1. **Certification**
2. **Développement Durable (DD)**
3. **Traçabilité**

Ces trois piliers ne sont pas des processus indépendants : ils s'appliquent à la **même structure terrain** et sont mis en œuvre par les **mêmes agents RAMEX**. Ils diffèrent par leur nature, leurs référentiels et le type de données qu'ils produisent.

---

## 2. Structure terrain (hiérarchie commune aux 3 piliers)

```
Région (ex: SAVA)
  └── District (ex: Sambava, Antalaha, Vohemar, Andapa)
        └── Agence RAMEX (une agence n'existe pas dans tous les districts)
              └── Commune
                    └── Coopérative / Association (regroupe les producteurs d'une commune)
                          └── Fokontany
                                └── Structure intermédiaire (représentants des producteurs par Fokontany)
                                      └── Village
                                            └── Producteur
                                                  └── Parcelle(s) de vanille
```

**Règles métier importantes :**
- Il n'y a pas d'agence RAMEX dans tous les districts.
- Toutes les agences RAMEX n'ont pas de réseau de producteurs de vanille rattaché.
- Les **responsables des Associations/Coopératives** sont les **premiers interlocuteurs de RAMEX** (point de contact officiel).
- Les **représentants des producteurs par Fokontany** sont un niveau intermédiaire entre le producteur individuel et la coopérative.

---

## 3. Les trois piliers en détail

### 3.1 Certification

**Nature :** conformité à des référentiels externes reconnus.

**Référentiels/labels concernés :**
- BIO
- RA (Rainforest Alliance)
- UEBT
- G4G
- FFL
- PACT
- FairTrade
- (liste extensible — champ ouvert dans le référentiel de programmes)

**Contenu couvert :**
- Normes qualitatives
- Normes de sécurité alimentaire
- Pratiques durables
- Cahier des charges clients

**Activités de mise en œuvre :**
- Séances de sensibilisation
- Formations
- Audit interne
- Audit externe

**Portée :** appliquée par coopérative/producteur ; peut être partielle (ex. réseau WMN = 100% G4G + 100% BIO, alors que d'autres réseaux ont des combinaisons différentes ou sont "à mettre en place").

**Acteurs responsables :** agents terrain RAMEX (animateurs et superviseurs).

---

### 3.2 Développement Durable (DD)

**Nature :** programme d'impact social et environnemental, non normatif (pas de certification externe à obtenir, mais des objectifs clients à satisfaire).

**Objectifs typiques (exemples cités, liste non exhaustive) :**
- Résilience des producteurs
- Responsabilisation / autonomisation des femmes
- Droits de l'homme, incluant la lutte contre le travail des enfants
- Préservation de l'environnement et de la biodiversité

**Activités concrètes observées :**
- Reboisement (activité continue sur l'année)
- Convention de partenariat (ex. convention FRAM, saisonnière ~août-septembre)
- Production de jeunes plants / pépinières (ex. novembre-décembre)
- Séances de sensibilisation
- Formations
- Audit interne
- Audit externe

**Acteurs impliqués :** agents terrain RAMEX (animateurs et superviseurs) + **autorités locales** + **partenaires de mise en œuvre** (acteurs externes, à modéliser comme une entité à part).

---

### 3.3 Traçabilité

**Nature :** enregistrement factuel et continu du parcours physique de la vanille, sans référentiel externe — c'est une preuve documentaire interne.

**Objectif :** justifier/tracer tout achat de vanille verte et/ou préparée, depuis la parcelle du producteur (village/Fokontany) en passant par le transport, les magasins intermédiaires, les magasins RAMEX, jusqu'à l'entrepôt du client final.

**Documents/données concernés :**
- Estimation de production par producteur
- Facture d'achat
- Bon de transport
- Bon de livraison
- Bon d'entrée magasin
- Fiche de stock
- (autres justificatifs — champ extensible)

**Acteur responsable :** Agent de collecte RAMEX (rôle distinct des animateurs/superviseurs qui gèrent Certification et DD).

**Particularité :** la Traçabilité est **transversale** aux deux autres piliers — un lot de vanille tracé peut être qualifié comme "vanille verte durable et certifiée" (cf. structure terrain), ce qui signifie que le statut de certification/DD d'un producteur ou d'une coopérative doit pouvoir être consulté au moment d'enregistrer une transaction de traçabilité.

---

## 4. Tableau comparatif de synthèse

| Dimension | Certification | Développement Durable | Traçabilité |
|---|---|---|---|
| Nature | Conformité à un référentiel externe | Programme d'impact, objectifs clients | Preuve documentaire d'un flux physique |
| Référentiel | BIO, RA, UEBT, G4G, FFL, PACT, FairTrade... | Objectifs définis par client (résilience, genre, droits humains, biodiversité...) | Aucun — factuel |
| Données produites | Statuts de conformité, résultats d'audit | Registre d'activités et de partenariats | Registre de transactions et de documents |
| Fréquence | Saisonnière / périodique | Continue sur l'année | Continue, par transaction |
| Acteur porteur | Animateurs / superviseurs RAMEX | Animateurs / superviseurs RAMEX + partenaires externes | Agent de collecte RAMEX |
| Niveau d'application | Producteur / Coopérative | Producteur / Coopérative / Communauté | Chaque transaction (lot) |

---

## 5. Cycle annuel (dimension temporelle)

Les trois piliers ne sont pas synchrones — l'application doit modéliser un calendrier de campagne, pas seulement des dates isolées.

| Période | Événement |
|---|---|
| Janv-Fév | Période de floraison (1er cycle) ; Expédition vers entrepôts clients |
| Mars-Mai | Période de géoréférencement (GPS parcelles) ; Formations certification (bonnes pratiques agricoles/hygiène) ; Contrôle interne (estimation prod, non-usage de produits chimiques) ; Audit interne |
| Juin-Juil | Campagne vanille verte |
| Juil-Sept | Période de floraison (2e cycle) |
| Août-Oct | Campagne vanille préparée (vanille vrac) |
| Oct | Expédition |
| Oct-Nov | Période de géoréférencement (2e cycle) ; Formations certification (2e cycle) |
| Toute l'année | Reboisement (DD, activité continue) |
| Août-Sept | Convention de partenariat FRAM (DD) |
| Nov-Déc | Production de jeunes plants / pépinières (DD) |

**Implication pour l'app :** prévoir une entité `Campagne` (type vanille_verte / vanille_préparée, année, dates) comme axe structurant des transactions de traçabilité, distincte du calendrier des activités Certification/DD qui suit son propre rythme (fenêtres de mars-mai et octobre-novembre).

---

## 6. Base de données cible RAMEX — vue existante

Le document confirme une architecture cible en 3 domaines de données, alimentée par des outils de collecte terrain déjà en usage :

**Domaines de données :**
- Données Certification
- Données Développement Durable
- Données Traçabilité

**Outils de collecte actuels (contexte, pas nécessairement à répliquer) :**
- KoboCollect (enquêtes terrain mobiles)
- Carnet Prods (support producteur)
- Farmforce
- Baseline / Farmforce / Compliance
- Géoréférencement (coordonnées GPS)
- Audit interne

---

## 7. Modèle de données proposé (base pour schéma Prisma / SQL)

```
# --- Structure géographique et organisationnelle ---
Region            (id, nom)                                   # ex: SAVA
District          (id, nom, region_id)
Commune           (id, nom, district_id)
Fokontany         (id, nom, commune_id)
Village           (id, nom, fokontany_id)

Agence            (id, nom, district_id, actif)                # pas systématique par district
Cooperative       (id, nom, commune_id, agence_id)              # = Association ou Coopérative
StructureIntermediaire (id, fokontany_id, cooperative_id)       # niveau représentant Fokontany

# --- Acteurs terrain ---
Producteur        (id, nom, village_id, structure_intermediaire_id, cooperative_id)
Parcelle          (id, producteur_id, latitude, longitude, superficie, date_georeferencement)

Utilisateur       (id, nom, role: animateur|superviseur|agent_collecte|admin, agence_id)

# --- Certification ---
ProgrammeCertification (id, code: BIO|RA|UEBT|G4G|FFL|PACT|FAIRTRADE, description)
StatutCertification (id, entite_type: producteur|cooperative, entite_id, programme_id,
                      date_obtention, date_expiration, statut: en_cours|valide|suspendu|expire)
ActiviteCertification (id, type: sensibilisation|formation|audit_interne|audit_externe,
                        date, cooperative_id, utilisateur_id, resultat, notes)

# --- Développement Durable ---
PartenaireDD       (id, nom, type: autorite_locale|ong|partenaire_technique)
ActiviteDD         (id, type: sensibilisation|formation|audit_interne|audit_externe|
                     reboisement|convention_partenariat|pepiniere,
                     date, cooperative_id, objectif_client, partenaire_id, utilisateur_id, notes)

# --- Traçabilité ---
Campagne           (id, type: vanille_verte|vanille_preparee, annee, date_debut, date_fin)
EstimationProduction (id, producteur_id, campagne_id, quantite_estimee)
TransactionAchat   (id, producteur_id, parcelle_id, campagne_id, quantite, prix_unitaire,
                     date, numero_facture, agent_collecte_id)
Transport          (id, transaction_id, transporteur, date, bon_transport_numero)
BonLivraison       (id, transaction_id, magasin_destination, date, numero)
EntreeMagasin      (id, transaction_id, magasin_id, date, numero_bon)
FicheStock         (id, magasin_id, date, quantite_entree, quantite_sortie, solde)
```

**Notes de modélisation :**
- `StatutCertification` peut s'appliquer à un producteur individuel ou à toute une coopérative (`entite_type` + `entite_id` en polymorphe, ou deux tables séparées selon préférence de modélisation).
- Une `TransactionAchat` doit pouvoir être filtrée/qualifiée par le `StatutCertification` du producteur au moment de la vente (ex. affichage "vanille verte durable et certifiée").
- Le rôle `Utilisateur` recoupe les rôles déjà utilisés dans RAMEX RH (animateur, superviseur, agent de collecte) — envisager une cohérence ou une intégration entre les deux applications à terme.

---

## 8. Points d'attention pour le développement

- **Un agent de collecte ≠ un animateur/superviseur.** Ce sont des rôles distincts avec des responsabilités différentes (traçabilité vs certification/DD) — à refléter dans les permissions (RBAC).
- **La donnée de certification/DD doit être consultable au moment d'une transaction de traçabilité**, pour qualifier le lot (ex. "vanille certifiée").
- **Les statuts géographiques sont partiels** : toutes les agences n'ont pas de réseau, tous les districts n'ont pas d'agence. Ne pas supposer une couverture complète du territoire dans les contraintes de saisie.
- **Le calendrier de campagne (Section 5) doit structurer les rapports et tableaux de bord**, pas seulement les filtres par date libre.
- **Extensibilité des référentiels** : la liste de labels de certification (BIO, RA, UEBT, G4G, FFL, PACT, FairTrade) doit être une table de référence modifiable, pas une énumération figée en dur dans le code — RAMEX travaille avec plusieurs clients ayant chacun leurs propres cahiers des charges.
