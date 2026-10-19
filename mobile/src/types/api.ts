/** Utilisateur renvoyé par POST /api/token/ (CustomTokenObtainPairSerializer) */
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  role: string;
  role_display: string;
  telephone?: string;
  poste?: string;
  cooperative?: { id: number; nom: string; code: string } | null;
  agence?: { id: number; nom: string } | null;
}

/** Réponse de POST /api/token/ */
export interface TokenResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

/** Producteur (champs principaux du serializer DRF) */
export interface Producteur {
  id: number;
  code: string;
  nom: string;
  prenom: string | null;
  nom_complet?: string;
  village: string;
  commune: string;
  fokontany?: string;
  sexe: 'M' | 'F';
  telephone?: string;
  photo?: string | null;
  actif: boolean;
  verifie?: boolean;
  /** Présent dans le détail (via parcelles) mais pas toujours dans la liste */
  superficie_totale_ha?: number | null;
}

/** Payload pour la création / édition (ProducteurCreateUpdateSerializer) */
/** Résilience AGR d'un producteur — GET /producteurs/{id}/resilience/ */
export interface ResilienceInfo {
  producteur_id: number;
  code: string;
  /** null = indéterminé (aucun historique exploitable) */
  resilient: boolean | null;
  seuil: number;
  annee_reference: number | null;
  taux_vente_reference: number | null;
  par_annee: {
    annee: number;
    produite: number;
    vendue: number;
    consommee: number;
    taux_vente: number | null;
  }[];
}

export interface ProducteurPayload {
  code: string;
  nom: string;
  prenom: string;
  commune?: string;
  village?: string;
  fokontany?: string;
  sexe: 'M' | 'F';
  telephone?: string;
  actif: boolean;
}

/** Coopérative (CooperativeListSerializer) — lecture seule sur mobile */
export interface Cooperative {
  id: number;
  code: string;
  nom: string;
  sigle?: string;
  /** Champs géographiques (texte libre historique) */
  region?: string;
  district?: string;
  commune?: string;
  village?: string;
  /** Champs géographiques normalisés (lecture seule) */
  region_ref_nom?: string | null;
  district_ref_nom?: string | null;
  commune_ref_nom?: string | null;
  fokontany_ref_nom?: string | null;
  village_ref_nom?: string | null;
  agence_nom?: string | null;
  telephone?: string;
  email?: string;
  active: boolean;
  annee_creation?: number | null;
  date_creation?: string | null;
  /** Membres du bureau (détail via CooperativeDetailSerializer) */
  president?: string | null;
  secretaire?: string | null;
  tresorier?: string | null;
  /** Statistiques calculées (lecture seule) */
  nombre_membres?: number;
  nombre_hommes?: number;
  nombre_femmes?: number;
  nombre_producteurs?: number;
  superficie_totale_ha?: number;
  villages?: string[];
}

/** Parcelle (champs principaux du serializer DRF) */
export interface Parcelle {
  id: number;
  producteur: number;
  code_parcelle: string;
  numero_parcelle: number;
  localisation?: string;
  type_vanille: 'planifolia' | 'tahitensis' | 'pompona';
  culture_principale: 'vanille' | 'cafe' | 'girofle' | 'autre';
  dimension_ha?: number | null;
  annee_plantation?: number | null;
  nombre_pieds?: number | null;
  certifiee: boolean;
  type_certification?: string;
  active: boolean;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  /** Propriétés calculées (lecture seule) */
  producteur_nom?: string;
  age_parcelle?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Champs « ménage » du Producteur (composition du foyer + scolarisation).
 * Mêmes noms que le backend (ProducteurCreateUpdateSerializer) pour un PATCH partiel. */
export interface MenagePayload {
  nb_adultes_plus_18?: number;
  nb_hommes_adultes?: number;
  nb_femmes_adultes?: number;
  nb_enfants_garcons?: number;
  nb_enfants_filles?: number;
  nb_autres_garcons?: number;
  nb_autres_filles?: number;
  nb_enfants_scolarises?: number;
  nb_enfants_non_scolarises?: number;
  personne_handicap_foyer?: boolean;
}

/** Types de dotation (backend : Dotation.TYPE_DOTATION_CHOICES) */
export const DOTATION_TYPES = [
  { value: 'kit_scolaire', label: 'Kit scolaire' },
  { value: 'poisson', label: 'Poisson' },
  { value: 'volaille', label: 'Volaille' },
  { value: 'autre', label: 'Autre' },
] as const;

export type DotationType = (typeof DOTATION_TYPES)[number]['value'];

/** Dotation reçue par un producteur (historisée par année) */
export interface Dotation {
  id: number;
  producteur: number;
  producteur_code?: string;
  producteur_nom?: string;
  type_dotation: DotationType;
  annee: number;
  quantite: number;
  details?: string;
  date_enregistrement?: string;
}

/** Payload de création d'une dotation */
export interface DotationPayload {
  producteur: number;
  type_dotation: DotationType;
  annee: number;
  quantite: number;
  details?: string;
}

/** Réponse de GET /dotations/ : liste + agrégats cumulés ajoutés par le viewset */
export interface DotationsResponse extends Paginated<Dotation> {
  cumul_par_type?: Record<string, number>;
  cumul_total?: number;
}

/** Réponse paginée standard de Django REST Framework */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Types d'AGR — choices réelles du backend (AGR.TYPE_AGR_CHOICES).
 *  Le web en affiche 7 mais le serializer n'accepte que ces 3. */
export const AGR_TYPES = [
  { value: 'pisciculture', label: 'Pisciculture' },
  { value: 'aviculture', label: 'Aviculture' },
  { value: 'autre', label: 'Autre' },
] as const;

export type AGRType = (typeof AGR_TYPES)[number]['value'];

/** Utilisation de la production AGR (AGR.UTILISATION_CHOICES) */
export const AGR_UTILISATIONS = [
  { value: 'consommation', label: 'À consommer' },
  { value: 'vente', label: 'À vendre' },
  { value: 'les_deux', label: 'Les deux' },
] as const;

export type AGRUtilisation = (typeof AGR_UTILISATIONS)[number]['value'];

/** Activité Génératrice de Revenus (GET /agr/) */
export interface AGR {
  id: number;
  producteur: number;
  producteur_code?: string;
  producteur_nom?: string;
  type_agr: AGRType;
  type_agr_display?: string;
  ordre: number;
  intrants_recus: boolean;
  quantite_intrants?: number | null;
  utilisation: AGRUtilisation | '';
  utilisation_display?: string;
  quantite_consommee_annuelle?: string | number | null;
  quantite_vendue_annuelle?: string | number | null;
  unite_mesure: string;
  prix_vente_unitaire?: string | number | null;
  revenu_annuel_estime?: string | number | null;
  nombre_bassins?: number | null;
  nombre_volailles?: number | null;
  active: boolean;
  date_creation?: string;
  date_modification?: string;
}

/** Payload de création / mise à jour d'une AGR (POST/PUT /agr/) */
export interface AGRPayload {
  producteur: number;
  type_agr: AGRType;
  ordre: number;
  intrants_recus: boolean;
  quantite_intrants?: number | null;
  utilisation?: AGRUtilisation | '';
  quantite_consommee_annuelle?: number | null;
  quantite_vendue_annuelle?: number | null;
  unite_mesure?: string;
  prix_vente_unitaire?: number | null;
  nombre_bassins?: number | null;
  nombre_volailles?: number | null;
  active: boolean;
}

/** Types de produit d'un bon de collecte (BonCollecte.TYPE_PRODUIT_CHOICES) */
export const BON_COLLECTE_TYPES_PRODUIT = [
  { value: 'vanille_verte', label: 'Vanille Verte' },
  { value: 'vanille_vrac', label: 'Vanille Vrac' },
  { value: 'cafe', label: 'Café' },
  { value: 'girofle', label: 'Girofle' },
] as const;

export type BonCollecteTypeProduit = (typeof BON_COLLECTE_TYPES_PRODUIT)[number]['value'];

/** Certifications historiques d'un FABC (TYPE_CERTIFICATION_CHOICES) */
export const BON_COLLECTE_CERTIFICATIONS = [
  { value: 'g4g', label: 'G4G (Good 4 Good)' },
  { value: 'bio', label: 'BIO' },
  { value: 'ra', label: 'RA (Rainforest Alliance)' },
  { value: 'ffl', label: 'FFL (Fair for Life)' },
  { value: 'rauebt', label: 'RAUEBT' },
] as const;

export type BonCollecteCertification = (typeof BON_COLLECTE_CERTIFICATIONS)[number]['value'];

/** Modes de paiement (BonCollecte.MODE_PAIEMENT_CHOICES) */
export const MODES_PAIEMENT = [
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'mobile', label: 'Mobile Banking' },
] as const;

export type ModePaiement = (typeof MODES_PAIEMENT)[number]['value'];

/** Campagne agricole (GET /tracabilite/campagnes/) */
export interface Campagne {
  id: number;
  code: string;
  annee_debut: number;
  annee_fin: number;
  date_debut: string;
  date_fin: string;
  type: 'vanille_verte' | 'vanille_preparee';
  statut: 'active' | 'cloturee';
}

/** Bon de collecte / FABC (BonCollecteListSerializer + champs détail) */
export interface BonCollecte {
  id: number;
  numero_fabc: string;
  campagne: number;
  campagne_code?: string;
  producteur: number;
  producteur_nom?: string;
  producteur_code?: string;
  cooperative: number | null;
  cooperative_nom?: string | null;
  date_marche: string;
  village_marche: string;
  commune: string;
  fokontany: string;
  type_produit: BonCollecteTypeProduit;
  type_produit_display?: string;
  certification?: string | null;
  certification_display?: string;
  type_certification?: number | null;
  type_certification_nom?: string | null;
  poids_total_livre: string | number;
  poids_accepte: string | number;
  poids_retour: string | number;
  prix_unitaire_marche: string | number;
  montant_premium: string | number;
  montant_total_achat: string | number;
  mode_paiement: ModePaiement;
  mode_paiement_display?: string;
  montant_avances_anterieures?: string | number;
  remboursement_par_vanille?: string | number;
  remboursement_especes?: string | number;
  solde_avances?: string | number;
  est_vente_groupee?: boolean;
  date_creation?: string;
  date_modification?: string;
  /** Présent dans GET /{id}/ uniquement (BonCollecteDetailSerializer) */
  producteur_info?: { nom_complet?: string; code?: string; village?: string } | null;
}

/** Payload POST/PUT /tracabilite/bons-collecte/ (champs requis du modèle) */
export interface BonCollectePayload {
  numero_fabc: string;
  campagne: number;
  producteur: number;
  cooperative?: number | null;
  date_marche: string;
  village_marche: string;
  commune: string;
  fokontany: string;
  type_produit: BonCollecteTypeProduit;
  certification?: string;
  poids_total_livre: number;
  poids_accepte: number;
  poids_retour?: number;
  prix_unitaire_marche: number;
  montant_premium?: number;
  mode_paiement: ModePaiement;
}

/** Fiche de collecte / FC (FicheCollecteListSerializer + détail) */
export interface FicheCollecte {
  id: number;
  numero_fc: string;
  campagne: number;
  campagne_code?: string;
  cooperative: number | null;
  cooperative_nom?: string | null;
  certification: string;
  certification_display?: string;
  date_marche: string;
  fokontany: string;
  nombre_producteurs: number;
  poids_total_net: string | number;
  montant_total: string | number;
  agent_re: string;
  date_creation?: string;
  /** Présent dans GET /{id}/ uniquement (ids des FABC regroupés) */
  bons_collecte?: number[];
  bons_collecte_info?: BonCollecte[];
}

/** Payload POST/PUT /tracabilite/fiches-collecte/ */
export interface FicheCollectePayload {
  numero_fc: string;
  campagne: number;
  cooperative?: number | null;
  certification: string;
  date_marche: string;
  fokontany: string;
  nombre_producteurs: number;
  poids_total_net: number;
  montant_total: number;
  agent_re: string;
  bons_collecte?: number[];
}

/** ---------- M-15 : Formations & Certifications ---------- */

/** Catalogue des types de formations — GET /types-formations/ (TypeFormation) */
export interface TypeFormation {
  id: number;
  nom: string;
  description?: string;
  duree_jours?: number;
  actif?: boolean;
}

/** Statut d'une formation suivie (FormationListSerializer) */
export interface Formation {
  id: number;
  producteur: number;
  producteur_nom?: string | null;
  producteur_code?: string | null;
  type_formation: number;
  type_formation_nom?: string;
  date_formation: string;
  lieu?: string;
  organisme?: string;
  certificat_obtenu?: boolean;
  /** Présent dans le détail (FormationSerializer) */
  notes?: string;
  date_enregistrement?: string;
}

/** Payload POST/PUT /formations/ — champs requis : producteur, type_formation, date_formation */
export interface FormationPayload {
  producteur: number;
  type_formation: number;
  date_formation: string;
  lieu?: string;
  organisme?: string;
  certificat_obtenu?: boolean;
  notes?: string;
}

/** Statuts de certification — Certification.STATUT_CHOICES */
export type StatutCertification = 'valide' | 'expire' | 'en_cours' | 'suspendu';

export const STATUTS_CERTIFICATION = [
  { value: 'valide', label: 'Valide' },
  { value: 'expire', label: 'Expiré' },
  { value: 'en_cours', label: "En cours d'obtention" },
  { value: 'suspendu', label: 'Suspendu' },
] as const;

/** Certification obtenue (CertificationListSerializer — lecture seule sur mobile) */
export interface Certification {
  id: number;
  producteur?: number | null;
  producteur_nom?: string | null;
  producteur_code?: string | null;
  cooperative?: number | null;
  cooperative_nom?: string | null;
  type_certification: number;
  type_certification_nom?: string;
  type_certification_code?: string;
  numero_certificat?: string;
  date_obtention: string;
  date_expiration: string;
  statut: StatutCertification;
  statut_display?: string;
  est_valide?: boolean;
  niveau_certification_display?: string;
  entite_label?: string;
}

/** ---------- M-16 : Historique / Évolution annuelle ---------- */

/** Historique de production par parcelle et année — GET /history/production-history/ */
export interface ProductionHistory {
  id: number;
  parcelle: number;
  parcelle_info?: {
    id: number;
    code_parcelle: string;
    dimension_ha?: string;
    producteur: number;
    producteur_code?: string;
    producteur_nom?: string;
  };
  annee: number;
  culture: string;
  quantite_kg: string | number;
  prix_vente_kg?: string | number | null;
  revenu_total?: string | number | null;
  revenu_calcule?: number | null;
  variation_annee_precedente?: {
    annee_precedente: number;
    quantite_precedente: number;
    variation_pct: number;
  } | null;
  date_enregistrement?: string;
  notes?: string;
}

/** Historique AGR par producteur et année — GET /history/agr-history/by_producteur/ */
export interface AGRHistoryItem {
  id: number;
  producteur: number;
  producteur_info?: { id: number; code?: string; nom_complet?: string; village?: string };
  annee: number;
  type_agr: string;
  type_agr_display?: string;
  ordre: number;
  quantite_produite?: string | number | null;
  quantite_vendue?: string | number | null;
  quantite_consommee?: string | number | null;
  prix_vente_unitaire?: string | number | null;
  revenu_annuel?: string | number | null;
  revenu_calcule?: number | null;
  notes?: string;
}

/** Historique d'indicateurs sociaux — GET /history/social-indicator-history/by_producteur/ */
export interface SocialHistoryItem {
  id: number;
  producteur: number;
  producteur_info?: { id: number; code?: string; nom_complet?: string; village?: string };
  annee: number;
  type_indicateur: string;
  type_indicateur_display?: string;
  valeur_numerique?: string | number | null;
  valeur_texte?: string | null;
  valeur_booleen?: boolean | null;
  valeur?: { type: string; valeur: unknown } | null;
  notes?: string;
}

/** M-17 — Dashboard : chiffres clés globaux — GET /dashboard/ (section `global`) */
export interface DashboardGlobal {
  total: number;
  total_filtres?: number;
  actifs: number;
  actifs_filtres?: number;
  inactifs: number;
  inactifs_filtres?: number;
  taux_actifs: number;
  taux_actifs_filtres?: number;
}

/** M-17 — Dashboard : impact dotations (section `impact_dotation`) */
export interface ImpactDotation {
  taux_avec_kit: number;
  taux_sans_kit: number;
  enfants_concernes_avec_kit: number;
  enfants_concernes_sans_kit: number;
}

/** M-17 — Réponse complète GET /dashboard/ (sections partielles utilisées par le mobile) */
export interface DashboardGlobalResponse {
  impact_dotation: ImpactDotation;
  global: DashboardGlobal;
}

/** M-17 — Production par culture — GET /dashboard/production-par-culture/ */
export interface ProductionCultureItem {
  culture: string;
  production_totale_kg: number;
  nb_parcelles: number;
  superficie_totale_ha: number;
  production_moyenne_kg: number;
}

export interface DashboardProductionParCulture {
  productions_par_culture: ProductionCultureItem[];
  total_production_kg: number;
  nb_cultures_differentes: number;
  filtres_actifs?: { villages?: string[]; communes?: string[]; agences?: string[] };
}

/** M-18 — Géographie : référentiel lecture seule (GET /geographie/*) */
export interface DistrictGeo {
  id: number;
  nom: string;
  code?: string;
  region?: number;
  region_nom?: string;
  actif?: boolean;
}

export interface CommuneGeo {
  id: number;
  nom: string;
  code?: string;
  district?: number;
  district_nom?: string;
  actif?: boolean;
}

export interface VillageGeo {
  id: number;
  nom: string;
  code?: string;
  fokontany?: number;
  fokontany_nom?: string;
  actif?: boolean;
}

export interface AgenceGeo {
  id: number;
  nom: string;
  code?: string;
  district?: number | null;
  district_nom?: string;
  actif?: boolean;
  adresse?: string;
  telephone?: string;
  email?: string;
  nb_cooperatives?: number;
  nb_utilisateurs?: number;
}

/** M-19 — Cycle annuel : référentiel des phases du calendrier agricole */
export type PhasePilier = 'tracabilite' | 'certification' | 'developpement_durable';

export interface PhaseAgricole {
  id: number;
  code: string;
  nom: string;
  pilier: PhasePilier;
  pilier_display?: string;
  type_phase: string;
  type_phase_display?: string;
  mois_debut: number;
  mois_fin: number;
  cycle_croise?: boolean;
  toute_annee?: boolean;
  couleur: string;
  ordre?: number;
  description?: string;
  actif?: boolean;
  mois_actifs?: number[];
}

/** Phase d'un mois du calendrier (GET /cycle-annuel/phases-agricoles/calendrier/) */
export interface PhaseCalendrierItem {
  id: number;
  code: string;
  nom: string;
  pilier: PhasePilier;
  type_phase: string;
  couleur: string;
  toute_annee?: boolean;
}

export interface CalendrierMois {
  numero: number;
  nom: string;
  phases: PhaseCalendrierItem[];
}

export interface CalendrierResponse {
  mois: CalendrierMois[];
  par_pilier: { tracabilite: number; certification: number; developpement_durable: number };
  total: number;
}

/** Phase planifiée sur une campagne (serializer PhaseCampagne) */
export interface PhaseCampagne {
  id: number;
  campagne?: number;
  campagne_code?: string;
  phase?: number;
  phase_nom?: string;
  phase_pilier?: PhasePilier;
  phase_couleur?: string;
  date_debut?: string;
  date_fin?: string;
  statut?: string;
  statut_display?: string;
  objectif?: number | null;
  realise?: number | null;
  taux_realisation?: number;
  responsable?: string;
  observations?: string;
}

/** Indicateur de campagne (serializer IndicateurCampagne) */
export interface IndicateurCampagne {
  id: number;
  campagne?: number;
  campagne_code?: string;
  libelle: string;
  type?: string;
  type_display?: string;
  objectif?: number | null;
  realise?: number | null;
  taux_realisation?: number;
  pilier?: PhasePilier;
  pilier_display?: string;
}

/** Rapport consolidé d'une campagne (GET /cycle-annuel/rapports/?campagne=) */
export interface RapportCampagne {
  campagne: {
    id: number;
    code: string;
    annee_debut?: number;
    annee_fin?: number;
    type?: string | null;
    statut?: string;
  };
  tracabilite: {
    bons_collecte: number;
    poids_total_kg: number;
    montant_total_ar: number;
    estimation_kg: number;
    commandes_export: number;
    poids_export_kg: number;
    valeur_export_usd: number;
  };
  certification: { cible_objectif: number; realise_objectif: number };
  developpement_durable: { cible_objectif: number; realise_objectif: number };
  phases: { planifiees: number; en_cours: number; terminees: number; liste: PhaseCampagne[] };
  indicateurs: IndicateurCampagne[];
}

/** M-20 — Développement durable : choix du modèle (parité backend) */
export const TYPES_PARTENAIRE_DD = [
  { value: 'autorite_locale', label: 'Autorité locale' },
  { value: 'ong', label: 'ONG' },
  { value: 'partenaire_technique', label: 'Partenaire technique' },
] as const;
export type TypePartenaireDD = (typeof TYPES_PARTENAIRE_DD)[number]['value'];

export const TYPES_ACTIVITE_DD = [
  { value: 'reboisement', label: 'Reboisement' },
  { value: 'convention_partenariat', label: 'Convention de partenariat' },
  { value: 'pepiniere', label: 'Production de jeunes plants / pépinière' },
  { value: 'sensibilisation', label: 'Séance de sensibilisation' },
  { value: 'formation', label: 'Formation' },
  { value: 'audit_interne', label: 'Audit interne' },
  { value: 'audit_externe', label: 'Audit externe' },
] as const;
export type TypeActiviteDD = (typeof TYPES_ACTIVITE_DD)[number]['value'];

export const OBJECTIFS_CLIENT_DD = [
  { value: 'resilience', label: 'Résilience des producteurs' },
  { value: 'autonomisation_femmes', label: 'Autonomisation des femmes' },
  { value: 'droits_humains', label: 'Droits humains (lutte contre le travail des enfants)' },
  { value: 'biodiversite', label: 'Préservation de la biodiversité' },
  { value: 'environnement', label: "Protection de l'environnement" },
  { value: 'autre', label: 'Autre' },
] as const;
export type ObjectifClientDD = (typeof OBJECTIFS_CLIENT_DD)[number]['value'];

/** Partenaire DD (GET/POST /developpement-durable/partenaires/) */
export interface PartenaireDD {
  id: number;
  nom: string;
  type: TypePartenaireDD;
  type_display?: string;
  contact?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  description?: string;
  actif?: boolean;
}

export interface PartenaireDDPayload {
  nom: string;
  type: TypePartenaireDD;
  contact?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  description?: string;
  actif?: boolean;
}

/** Activité DD (GET/POST /developpement-durable/activites/) */
export interface ActiviteDD {
  id: number;
  type_activite: TypeActiviteDD;
  type_activite_display?: string;
  date: string;
  cooperative?: number | null;
  cooperative_nom?: string | null;
  producteur?: number | null;
  producteur_nom?: string | null;
  partenaire?: number | null;
  partenaire_nom?: string | null;
  objectif_client: ObjectifClientDD;
  objectif_client_display?: string;
  description: string;
  resultat?: string;
  nombre_participants?: number;
  notes?: string;
  responsable?: number | null;
  responsable_nom?: string | null;
}

export interface ActiviteDDPayload {
  type_activite: TypeActiviteDD;
  date: string;
  cooperative?: number | null;
  partenaire?: number | null;
  objectif_client: ObjectifClientDD;
  description: string;
  resultat?: string;
  nombre_participants?: number;
  notes?: string;
}

