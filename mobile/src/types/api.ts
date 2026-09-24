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
  prenom: string;
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
