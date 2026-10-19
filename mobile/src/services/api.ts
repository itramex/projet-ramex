/**
 * Client axios partagé avec l'API Django (mêmes endpoints que le frontend web).
 * Intercepteurs : Bearer token automatique + refresh silencieux sur 401.
 */
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';
import { offlineStore } from './offlineStore';
import {
  AGR,
  AGRPayload,
  AGRHistoryItem,
  BonCollecte,
  BonCollectePayload,
  Campagne,
  Cooperative,
  Dotation,
  DotationPayload,
  DotationsResponse,
  FicheCollecte,
  FicheCollectePayload,
  Formation,
  FormationPayload,
  Certification,
  TypeFormation,
  MenagePayload,
  Paginated,
  Producteur,
  ProducteurPayload,
  ProductionHistory,
  ResilienceInfo,
  SocialHistoryItem,
  DashboardGlobalResponse,
  DashboardProductionParCulture,
  DistrictGeo,
  CommuneGeo,
  VillageGeo,
  AgenceGeo,
  PhaseAgricole,
  CalendrierResponse,
  RapportCampagne,
  ActiviteDD,
  ActiviteDDPayload,
  PartenaireDD,
  PartenaireDDPayload,
  Recommendation,
  RecommendationStats,
  StatutRecommendation,
} from '../types/api';

/**
 * URL de l'API. Sur un appareil physique, localhost ne pointe pas vers le PC :
 * définir EXPO_PUBLIC_API_URL dans mobile/.env (ex: http://192.168.1.10:8000/api)
 * ou modifier la valeur par défaut ci-dessous.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Un seul refresh à la fois, partagé par toutes les requêtes en 401
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await tokenStore.getRefreshToken();
  if (!refresh) return null;
  try {
    const response = await axios.post<{ access: string }>(`${API_BASE_URL}/token/refresh/`, {
      refresh,
    });
    const access = response.data.access;
    await tokenStore.saveTokens(access, refresh);
    return access;
  } catch {
    // Refresh token invalide/expiré : session terminée
    await tokenStore.clear();
    return null;
  }
}

// ---------- M-23 offline : clé de cache stable (params triés) ----------
function cacheKeyFor(config: InternalAxiosRequestConfig): string {
  const path = (config.url ?? '').split('?')[0];
  const params = config.params as Record<string, unknown> | undefined;
  const entries = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .sort(([a], [b]) => a.localeCompare(b))
    : [];
  return `${(config.method ?? 'get').toLowerCase()} ${path}?${JSON.stringify(entries)}`;
}

type QueuedConfig = InternalAxiosRequestConfig & { _fromQueue?: boolean };

let flushPromise: Promise<void> | null = null;
let bootstrapped = false; // premier 2xx de la session → purge la file héritée
let queueDirty = false; // une mutation a été enfilee depuis cette session

/**
 * M-23 — rejoue la file d'écriture (FIFO). Stoppe au premier échec :
 * la mutation reste en file et sera retentée au prochain succès réseau.
 */
export async function flushSyncQueue(): Promise<void> {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    try {
      // Ne jamais rejouer sans session : évite les 401 intempestifs.
      const token = await tokenStore.getAccessToken();
      if (!token) return;
      const pending = await offlineStore.queueList();
      if (pending.length === 0) return;
      for (const item of pending) {
        try {
          await api.request({
            method: item.method,
            url: item.path,
            data: item.body ? JSON.parse(item.body) : undefined,
            _fromQueue: true,
          } as QueuedConfig);
          await offlineStore.queueRemove(item.id);
        } catch {
          break; // réseau KO ou erreur serveur : réessai au prochain 2xx
        }
      }
    } finally {
      flushPromise = null;
    }
  })();
  return flushPromise;
}

api.interceptors.response.use(
  (response) => {
    // ---- M-23 offline : alimente le cache + horodate l'endpoint ----
    const method = (response.config.method ?? 'get').toLowerCase();
    if (response.status >= 200 && response.status < 300) {
      if (method === 'get' && response.status === 200) {
        const path = (response.config.url ?? '').split('?')[0];
        void offlineStore.cacheSet(cacheKeyFor(response.config), response.data);
        if (path) void offlineStore.lastSyncTouch(path);
      }
      // Retour du réseau = occasion de vider la file d'écriture.
      if (!bootstrapped) {
        bootstrapped = true;
        void flushSyncQueue();
      } else if (queueDirty) {
        queueDirty = false;
        void flushSyncQueue();
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    // ---- M-23 offline : pas de réponse serveur = réseau KO ----
    const offlineConfig = error.config as QueuedConfig | undefined;
    if (offlineConfig && !error.response) {
      const method = (offlineConfig.method ?? 'get').toLowerCase();
      if (method === 'get') {
        // GET hors réseau : sert le cache local (donnée périmée acceptée).
        const hit = await offlineStore.cacheGet<unknown>(cacheKeyFor(offlineConfig));
        if (hit) {
          return {
            data: hit.data,
            status: 200,
            statusText: `OK (cache ${hit.savedAt})`,
            headers: {},
            config: offlineConfig,
          } as AxiosResponse;
        }
      } else if (!offlineConfig._fromQueue && ['post', 'put', 'patch', 'delete'].includes(method)) {
        // Mutation hors réseau : enfile et informe explicitement l'utilisateur.
        await offlineStore.queueEnqueue(method, offlineConfig.url ?? '', offlineConfig.data);
        queueDirty = true;
        const queuedError = new Error(
          "Hors ligne : opération enregistrée sur l'appareil, envoi automatique au retour du réseau.",
        ) as Error & { offlineQueued?: boolean };
        queuedError.offlineQueued = true;
        return Promise.reject(queuedError);
      }
    }
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise = refreshPromise || refreshAccessToken();
      const newToken = await refreshPromise.finally(() => {
        refreshPromise = null;
      });
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

/** Producteurs : liste paginée + recherche serveur */
export const producteurService = {
  /**
   * M-23 — `updated_since` (ISO 8601) optionnel : ne renvoie que les lignes
   * modifiées depuis cette date (synchro incrémentale mobile).
   */
  list: (params: {
    page?: number;
    page_size?: number;
    search?: string;
    actif?: string;
    updated_since?: string;
  }) => api.get<Paginated<Producteur>>('/producteurs/', { params }),
  detail: (id: number | string) => api.get<Producteur>(`/producteurs/${id}/`),
  /**
   * M-24 — résilience AGR : part vendue sur la dernière année historique.
   * `seuil` (défaut 50) : taux minimum pour être considéré résilient.
   */
  resilience: (id: number | string, seuil?: number) =>
    api.get<ResilienceInfo>(`/producteurs/${id}/resilience/`, {
      params: seuil != null ? { seuil } : {},
    }),
  statistiques: () => api.get('/producteurs/statistiques/'),
  create: (data: ProducteurPayload) => api.post<Producteur>('/producteurs/', data),
  update: (id: number | string, data: ProducteurPayload) =>
    api.put<Producteur>(`/producteurs/${id}/`, data),
  /**
   * PATCH partiel : utilisé pour l'écran Ménage (composition du foyer).
   * Accepte les champs d'identification ou les champs « ménage » (MenagePayload).
   */
  patch: (id: number | string, data: Partial<ProducteurPayload> | MenagePayload) =>
    api.patch<Producteur>(`/producteurs/${id}/`, data),
  delete: (id: number | string) => api.delete(`/producteurs/${id}/`),
};

/**
 * Coopératives : liste/filtres + recherche serveur (lecture seule sur mobile).
 * Pas de pagination côté API (tableau simple) — scoping agence appliqué côté serveur.
 */
export const cooperativeService = {
  list: (params: {
    search?: string;
    active?: string;
    region?: string;
    commune?: string;
    village?: string;
    has_responsables?: string;
  } = {}) => api.get<Cooperative[]>('/cooperatives/', { params }),
  detail: (id: number | string) => api.get<Cooperative>(`/cooperatives/${id}/`),
};

/** Dotations : saisie terrain par producteur (kit scolaire, poisson, volaille…) */
export const dotationService = {
  /**
   * Liste des dotations d'un producteur + cumuls (cumul_par_type, cumul_total).
   * M-23 — `updatedSince` optionnel : ne renvoie que les dotations modifiées
   * depuis cette date ; les cumuls portent alors sur ce sous-ensemble filtré.
   */
  listByProducteur: (producteurId: number | string, updatedSince?: string) =>
    api.get<DotationsResponse>('/dotations/', {
      params: { producteur: producteurId, updated_since: updatedSince },
    }),
  create: (data: DotationPayload) => api.post<Dotation>('/dotations/', data),
  remove: (id: number | string) => api.delete(`/dotations/${id}/`),
};

/** AGR : activités génératrices de revenus par producteur (pisciculture, aviculture…) */
export const agrService = {
  /**
   * AGR actives d'un producteur (parité web : agrService.getByProducteur).
   * M-23 — `updatedSince` optionnel : ne renvoie que les AGR modifiés depuis
   * cette date (synchro incrémentale).
   */
  listByProducteur: (producteurId: number | string, updatedSince?: string) =>
    api.get<Paginated<AGR> | AGR[]>('/agr/', {
      params: { producteur: producteurId, active: true, updated_since: updatedSince },
    }),
  detail: (id: number | string) => api.get<AGR>(`/agr/${id}/`),
  create: (data: AGRPayload) => api.post<AGR>('/agr/', data),
  update: (id: number | string, data: AGRPayload) => api.put<AGR>(`/agr/${id}/`, data),
  remove: (id: number | string) => api.delete(`/agr/${id}/`),
};

/** Campagnes agricoles (référentiel des formulaires de traçabilité) */
export const campagneService = {
  list: () => api.get<Paginated<Campagne> | Campagne[]>('/tracabilite/campagnes/'),
};

/** Bons de collecte (FABC) — saisie terrain traçabilité */
export const bonCollecteService = {
  list: (params: {
    campagne?: number | string;
    producteur?: number | string;
    cooperative?: number | string;
    certification?: string;
    village?: string;
    search?: string;
    page?: number;
    page_size?: number;
    /** M-23 — ISO 8601 : ne renvoie que les FABC modifiées depuis (synchro incrémentale) */
    updated_since?: string;
  } = {}) =>
    api.get<Paginated<BonCollecte> | BonCollecte[]>('/tracabilite/bons-collecte/', { params }),
  detail: (id: number | string) => api.get<BonCollecte>(`/tracabilite/bons-collecte/${id}/`),
  create: (data: BonCollectePayload) => api.post<BonCollecte>('/tracabilite/bons-collecte/', data),
  update: (id: number | string, data: BonCollectePayload) =>
    api.put<BonCollecte>(`/tracabilite/bons-collecte/${id}/`, data),
  remove: (id: number | string) => api.delete(`/tracabilite/bons-collecte/${id}/`),
};

/** Fiches de collecte (FC) — regroupement de FABC par marché */
export const ficheCollecteService = {
  /**
   * M-23 — `updated_since` (ISO 8601) optionnel : ne renvoie que les FC
   * modifiées depuis cette date (synchro incrémentale).
   */
  list: (params: {
    campagne?: number | string;
    cooperative?: number | string;
    updated_since?: string;
  } = {}) =>
    api.get<Paginated<FicheCollecte> | FicheCollecte[]>('/tracabilite/fiches-collecte/', { params }),
  detail: (id: number | string) => api.get<FicheCollecte>(`/tracabilite/fiches-collecte/${id}/`),
  create: (data: FicheCollectePayload) =>
    api.post<FicheCollecte>('/tracabilite/fiches-collecte/', data),
  update: (id: number | string, data: FicheCollectePayload) =>
    api.put<FicheCollecte>(`/tracabilite/fiches-collecte/${id}/`, data),
  remove: (id: number | string) => api.delete(`/tracabilite/fiches-collecte/${id}/`),
};

/** M-15 — Formations suivies par les producteurs + catalogue de types */
export const formationService = {
  /** Catalogue des types de formations actifs (référentiel pour le formulaire) */
  typesFormations: () =>
    api.get<Paginated<TypeFormation> | TypeFormation[]>('/formations/types-formations/'),
  /**
   * Formations d'un producteur.
   * M-23 — `updatedSince` optionnel : ne renvoie que les formations modifiées depuis.
   */
  listByProducteur: (producteurId: number | string, updatedSince?: string) =>
    api.get<Paginated<Formation> | Formation[]>('/formations/formations/', {
      params: { producteur: producteurId, updated_since: updatedSince },
    }),
  detail: (id: number | string) => api.get<Formation>(`/formations/formations/${id}/`),
  create: (data: FormationPayload) => api.post<Formation>('/formations/formations/', data),
  update: (id: number | string, data: FormationPayload) =>
    api.put<Formation>(`/formations/formations/${id}/`, data),
  remove: (id: number | string) => api.delete(`/formations/formations/${id}/`),
};

/** M-15 — Certifications obtenues (producteurs & coopératives) — lecture seule */
export const certificationService = {
  /**
   * Certifications d'un producteur (lecture seule).
   * M-23 — `updatedSince` optionnel : ne renvoie que les certifications modifiées depuis.
   */
  listByProducteur: (producteurId: number | string, updatedSince?: string) =>
    api.get<Paginated<Certification> | Certification[]>('/formations/certifications/', {
      params: { producteur: producteurId, updated_since: updatedSince },
    }),
};

/** M-16 — Historique / Évolution annuelle (production, AGR, social) */
export const historyService = {
  /**
   * Historique de production d'un producteur (via ses parcelles).
   * Le backend filtre avec `parcelle__producteur` — réponse paginée DRF.
   */
  productionsByProducteur: (producteurId: number | string) =>
    api.get<Paginated<ProductionHistory> | ProductionHistory[]>(
      '/history/production-history/',
      { params: { parcelle__producteur: producteurId, page_size: 100 } }
    ),
  /** Revenus AGR historiques — réponse en tableau brut (action by_producteur) */
  agrByProducteur: (producteurId: number | string) =>
    api.get<AGRHistoryItem[]>('/history/agr-history/by_producteur/', {
      params: { producteur_id: producteurId },
    }),
  /** Indicateurs sociaux historiques — réponse en tableau brut (action by_producteur) */
  socialByProducteur: (producteurId: number | string) =>
    api.get<SocialHistoryItem[]>('/history/social-indicator-history/by_producteur/', {
      params: { producteur_id: producteurId },
    }),
};

/** M-17 — Dashboard mobile : chiffres clés + production par culture */
export const dashboardService = {
  /**
   * Chiffres clés globaux — GET /dashboard/.
   * Réponse volumineuse (demographics, geographic, ...) ; le mobile n'utilise
   * que les sections `global` (producteurs) et `impact_dotation` (kits).
   */
  global: () => api.get<DashboardGlobalResponse>('/dashboard/'),
  /** Production par culture — GET /dashboard/production-par-culture/ */
  productionParCulture: () =>
    api.get<DashboardProductionParCulture>('/dashboard/production-par-culture/'),
};

/** M-18 — Géographie : référentiel lecture seule (GET /geographie/*) */
export const geographieService = {
  districts: () =>
    api.get<Paginated<DistrictGeo> | DistrictGeo[]>('/geographie/districts/', {
      params: { page_size: 200 },
    }),
  communes: () =>
    api.get<Paginated<CommuneGeo> | CommuneGeo[]>('/geographie/communes/', {
      params: { page_size: 200 },
    }),
  villages: () =>
    api.get<Paginated<VillageGeo> | VillageGeo[]>('/geographie/villages/', {
      params: { page_size: 200 },
    }),
  agences: () =>
    api.get<Paginated<AgenceGeo> | AgenceGeo[]>('/geographie/agences/', {
      params: { page_size: 200 },
    }),
};

/** M-19 — Cycle annuel : calendrier, phases agricoles, rapport de campagne (lecture seule) */
export const cycleService = {
  calendrier: (pilier?: string) =>
    api.get<CalendrierResponse>('/cycle-annuel/phases-agricoles/calendrier/', {
      params: pilier ? { pilier } : {},
    }),
  phases: (params: { search?: string; pilier?: string } = {}) =>
    api.get<Paginated<PhaseAgricole> | PhaseAgricole[]>('/cycle-annuel/phases-agricoles/', {
      params: { page_size: 100, ...params },
    }),
  rapport: (campagne: number) =>
    api.get<RapportCampagne>('/cycle-annuel/rapports/', { params: { campagne } }),
};

/** M-20 — Développement durable : activités + partenaires (permission CanManageCertificationDD) */
export const ddService = {
  activites: (params: { search?: string; type_activite?: string } = {}) =>
    api.get<Paginated<ActiviteDD> | ActiviteDD[]>('/developpement-durable/activites/', {
      params: { page_size: 100, ...params },
    }),
  createActivite: (data: ActiviteDDPayload) =>
    api.post<ActiviteDD>('/developpement-durable/activites/', data),
  removeActivite: (id: number) => api.delete(`/developpement-durable/activites/${id}/`),
  partenaires: () =>
    api.get<Paginated<PartenaireDD> | PartenaireDD[]>('/developpement-durable/partenaires/', {
      params: { page_size: 100 },
    }),
  createPartenaire: (data: PartenaireDDPayload) =>
    api.post<PartenaireDD>('/developpement-durable/partenaires/', data),
};

/** M-21 — Recommandations agricoles (montées racine : GET /recommendations/) */
export const recommendationService = {
  list: (params: { statut?: StatutRecommendation; search?: string } = {}) =>
    api.get<Paginated<Recommendation> | Recommendation[]>('/recommendations/', {
      params: { page_size: 100, ...params },
    }),
  stats: () => api.get<RecommendationStats>('/recommendations/statistics/'),
};

export default api;
