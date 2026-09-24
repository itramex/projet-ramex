/**
 * Client axios partagé avec l'API Django (mêmes endpoints que le frontend web).
 * Intercepteurs : Bearer token automatique + refresh silencieux sur 401.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';
import {
  AGR,
  AGRPayload,
  Cooperative,
  Dotation,
  DotationPayload,
  DotationsResponse,
  MenagePayload,
  Paginated,
  Producteur,
  ProducteurPayload,
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

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
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
  list: (params: { page?: number; page_size?: number; search?: string; actif?: string }) =>
    api.get<Paginated<Producteur>>('/producteurs/', { params }),
  detail: (id: number | string) => api.get<Producteur>(`/producteurs/${id}/`),
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
  /** Liste des dotations d'un producteur + cumuls (cumul_par_type, cumul_total) */
  listByProducteur: (producteurId: number | string) =>
    api.get<DotationsResponse>('/dotations/', { params: { producteur: producteurId } }),
  create: (data: DotationPayload) => api.post<Dotation>('/dotations/', data),
  remove: (id: number | string) => api.delete(`/dotations/${id}/`),
};

/** AGR : activités génératrices de revenus par producteur (pisciculture, aviculture…) */
export const agrService = {
  /** AGR actives d'un producteur (parité web : agrService.getByProducteur) */
  listByProducteur: (producteurId: number | string) =>
    api.get<Paginated<AGR> | AGR[]>('/agr/', {
      params: { producteur: producteurId, active: true },
    }),
  detail: (id: number | string) => api.get<AGR>(`/agr/${id}/`),
  create: (data: AGRPayload) => api.post<AGR>('/agr/', data),
  update: (id: number | string, data: AGRPayload) => api.put<AGR>(`/agr/${id}/`, data),
  remove: (id: number | string) => api.delete(`/agr/${id}/`),
};

export default api;
