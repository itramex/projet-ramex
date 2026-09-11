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

/** Réponse paginée standard de Django REST Framework */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
