/**
 * Parcelle — aligné sur ParcelleListSerializer (backend/parcelles/serializers.py).
 * L'endpoint /api/parcelles/ renvoie ces champs (pagination DRF page_size=200).
 */
export interface Parcelle {
  id: number;
  code_parcelle: string;
  numero_parcelle: number;
  producteur: number;
  producteur_nom: string;
  producteur_code: string;
  producteur_commune: string;
  localisation: string;
  village: string;
  dimension_ha: number | null;
  annee_creation: number | null;
  nombre_pieds: number | null;
  type_vanille: string;
  type_vanille_display: string;
  culture_principale: string;
  culture_principale_display: string;
  cultures_pratiquees: string[];
  productions_par_culture: Record<string, number> | null;
  estimation_production_kg: number | null;
  certifiee: boolean;
  type_certification: string | null;
  type_certification_display: string | null;
  active: boolean;
  photo_url: string | null;
  annee_plantation: number | null;
  age_parcelle: number | null;
  date_enregistrement: string;
  latitude: number | null;
  longitude: number | null;
  profil_parcelle: string | null;
  profil_parcelle_display: string | null;
  distance_habitation: string | null;
  distance_habitation_display: string | null;
  type_propriete: string | null;
  type_propriete_display: string | null;
  distance_km: number | null;
}