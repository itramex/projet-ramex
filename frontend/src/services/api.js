import axios from 'axios';
import { tokenStorage } from './tokenStorage';
import { sessionManager } from './sessionManager';
import { setupCache, invalidateByPrefix } from './apiCache';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api' || 'http://192.168.1.80:8000/api';

const api = axios.create({
  baseURL: API_URL,
  paramsSerializer: {
    indexes: null // Serializes parameters like 'a=1&a=2' instead of 'a[]=1&a[]=2'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isFormData = config.data instanceof FormData;

    if (!isFormData) {
      const contentType = config.headers['Content-Type'] || config.headers['content-type'];
      if (!contentType) {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer le refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Erreur 401 et pas déjà en retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Utiliser le session manager pour rafraîchir
        const refreshed = await sessionManager.refreshToken();
        
        if (refreshed) {
          // Réessayer la requête originale avec le nouveau token
          const newToken = tokenStorage.getAccessToken();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          // Échec du rafraîchissement, rediriger vers login
          window.location.href = '/';
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Erreur lors du rafraîchissement
        sessionManager.clearSession();
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Cache des requêtes GET (5 min par défaut) pour éviter les re-fetch au changement de page
setupCache(api);

// ========== HELPER: Récupérer toutes les pages ==========
/**
 * Fetch all pages from a paginated DRF endpoint automatically.
 * Returns the combined results array + total count.
 */
async function fetchAllPages(url, params = {}) {
  const firstResponse = await api.get(url, { params });
  const data = firstResponse.data;

  // Si pas paginé (array direct), retourner tel quel
  if (Array.isArray(data)) {
    return { results: data, count: data.length };
  }

  // Si paginé avec results
  let allResults = data.results || [];
  let nextUrl = data.next;

  // Si nextUrl est null, toutes les données sont déjà là
  if (!nextUrl) {
    return { results: allResults, count: data.count || allResults.length };
  }

  // Récupérer les pages suivantes
  while (nextUrl) {
    // L'URL DRF est absolue (ex: http://host/api/producteurs/?page=2)
    // api.get() ajoute baseURL (http://host/api) devant, donc on extrait juste le chemin après /api
    let relativeUrl = nextUrl;
    try {
      const urlObj = new URL(nextUrl);
      let pathname = urlObj.pathname;
      // Retirer le préfixe /api car baseURL l'inclut déjà
      if (pathname.startsWith('/api/')) {
        pathname = pathname.replace('/api', '');
      }
      relativeUrl = pathname + urlObj.search;
    } catch {
      // Si ce n'est pas une URL absolue, utiliser tel quel
    }
    const response = await api.get(relativeUrl, { params: {} });
    allResults = allResults.concat(response.data.results || []);
    nextUrl = response.data.next;
  }

  return { results: allResults, count: data.count || allResults.length };
}

// ========== SERVICE AUTHENTIFICATION ==========
export const authService = {
  login: async (username, password) => {
    const response = await axios.post(`${API_URL}/token/`, { username, password });
    
    // Sauvegarder les tokens
    tokenStorage.saveTokens(
      response.data.access,
      response.data.refresh,
      15 * 60 // 15 minutes
    );
    
    // Démarrer la gestion de session
    sessionManager.startAutoRefresh();
    
    return response;
  },
  refreshToken: (refresh) =>
    axios.post(`${API_URL}/token/refresh/`, { refresh }),
  
  logout: async () => {
    // Récupérer le refresh token avant de nettoyer
    const refreshToken = tokenStorage.getRefreshToken();
    
    // Nettoyer la session
    sessionManager.clearSession();
    
    // Optionnel : appeler le backend pour blacklister le token
    if (refreshToken) {
      try {
        await axios.post(`${API_URL}/token/blacklist/`, { refresh: refreshToken });
      } catch (error) {
        console.error('Erreur blacklist token:', error);
      }
    }
  }
};

// ========== SERVICE PRODUCTEURS ==========
export const producteurService = {
  getAll: (params = {}) => api.get('/producteurs/', { params }),
  getAllForDropdown: async (params = {}) => {
    const { results } = await fetchAllPages('/producteurs/', params);
    return { data: results };
  },
  getById: (id) => api.get(`/producteurs/${id}/`),
  create: (data) => { invalidateByPrefix('/producteurs/'); return api.post('/producteurs/', data); },
  update: (id, data) => { invalidateByPrefix('/producteurs/'); return api.put(`/producteurs/${id}/`, data); },
  delete: (id, data) => { invalidateByPrefix('/producteurs/'); return api.delete(`/producteurs/${id}/`, { data }); },
  restaurer: (id) => { invalidateByPrefix('/producteurs/'); return api.post(`/producteurs/${id}/restaurer/`); },
  verifier: (id) => { invalidateByPrefix('/producteurs/'); return api.post(`/producteurs/${id}/verifier/`); },
  statistiques: () => api.get('/producteurs/statistiques/'),
  export: (params = {}) => api.get('/producteurs/export/', { params, responseType: 'blob' }),
  importHorizontal: (formData) => api.post('/producteurs/import-horizontal/', formData),
  importMultiSheet: (formData) => api.post('/producteurs/import-multi-sheet/', formData),

  historique: (params = {}) => api.get('/producteurs/historique/', { params }),
  historiqueDetail: (id) => api.get(`/producteurs/${id}/historique/`),

  // Extraction personnalisée
  getAvailableFields: () => api.get('/producteurs/available_fields/'),
  exportCustom: (data) => api.post('/producteurs/export_custom/', data, { responseType: 'blob' }),
};

// ========== SERVICE COOPÉRATIVES ==========
export const cooperativeService = {
  getAll: (params = {}) => api.get('/cooperatives/', { params }),
  getById: (id) => api.get(`/cooperatives/${id}/`),
  create: (data) => { invalidateByPrefix('/cooperatives/'); return api.post('/cooperatives/', data); },
  update: (id, data) => { invalidateByPrefix('/cooperatives/'); return api.put(`/cooperatives/${id}/`, data); },
  patch: (id, data) => { invalidateByPrefix('/cooperatives/'); return api.patch(`/cooperatives/${id}/`, data); },
  delete: (id) => { invalidateByPrefix('/cooperatives/'); return api.delete(`/cooperatives/${id}/`); },
  statistiques: () => api.get('/cooperatives/statistiques/'),
  adhesions: (id, params = {}) => api.get(`/cooperatives/${id}/adhesions/`, { params }),
  export: () => api.get('/cooperatives/export/', { responseType: 'blob' }),
};

// ========== SERVICE GÉOGRAPHIE ==========
export const geographieService = {
  // Régions
  getRegions: (params = {}) => api.get('/geographie/regions/', { params }),
  getRegion: (id) => api.get(`/geographie/regions/${id}/`),
  createRegion: (data) => api.post('/geographie/regions/', data),
  updateRegion: (id, data) => api.put(`/geographie/regions/${id}/`, data),
  deleteRegion: (id) => api.delete(`/geographie/regions/${id}/`),

  // Districts
  getDistricts: (params = {}) => api.get('/geographie/districts/', { params }),
  getDistrict: (id) => api.get(`/geographie/districts/${id}/`),
  createDistrict: (data) => api.post('/geographie/districts/', data),
  updateDistrict: (id, data) => api.put(`/geographie/districts/${id}/`, data),
  deleteDistrict: (id) => api.delete(`/geographie/districts/${id}/`),

  // Communes
  getCommunes: (params = {}) => api.get('/geographie/communes/', { params }),
  getCommune: (id) => api.get(`/geographie/communes/${id}/`),
  createCommune: (data) => api.post('/geographie/communes/', data),
  updateCommune: (id, data) => api.put(`/geographie/communes/${id}/`, data),
  deleteCommune: (id) => api.delete(`/geographie/communes/${id}/`),

  // Fokontany
  getFokontanys: (params = {}) => api.get('/geographie/fokontanys/', { params }),
  getFokontany: (id) => api.get(`/geographie/fokontanys/${id}/`),
  createFokontany: (data) => api.post('/geographie/fokontanys/', data),
  updateFokontany: (id, data) => api.put(`/geographie/fokontanys/${id}/`, data),
  deleteFokontany: (id) => api.delete(`/geographie/fokontanys/${id}/`),

  // Villages
  getVillages: (params = {}) => api.get('/geographie/villages/', { params }),
  getVillage: (id) => api.get(`/geographie/villages/${id}/`),
  createVillage: (data) => api.post('/geographie/villages/', data),
  updateVillage: (id, data) => api.put(`/geographie/villages/${id}/`, data),
  deleteVillage: (id) => api.delete(`/geographie/villages/${id}/`),

  // Agences
  getAgences: (params = {}) => api.get('/geographie/agences/', { params }),
  getAgence: (id) => api.get(`/geographie/agences/${id}/`),
  createAgence: (data) => api.post('/geographie/agences/', data),
  updateAgence: (id, data) => api.put(`/geographie/agences/${id}/`, data),
  deleteAgence: (id) => api.delete(`/geographie/agences/${id}/`),

  // Structures intermédiaires
  getStructuresIntermediaires: (params = {}) => api.get('/geographie/structures-intermediaires/', { params }),
  getStructureIntermediaire: (id) => api.get(`/geographie/structures-intermediaires/${id}/`),
  createStructureIntermediaire: (data) => api.post('/geographie/structures-intermediaires/', data),
  updateStructureIntermediaire: (id, data) => api.put(`/geographie/structures-intermediaires/${id}/`, data),
  deleteStructureIntermediaire: (id) => api.delete(`/geographie/structures-intermediaires/${id}/`),
};

// ========== SERVICE DÉVELOPPEMENT DURABLE ==========
export const ddService = {
  // Partenaires DD
  getPartenaires: (params = {}) => api.get('/developpement-durable/partenaires/', { params }),
  getPartenaire: (id) => api.get(`/developpement-durable/partenaires/${id}/`),
  createPartenaire: (data) => api.post('/developpement-durable/partenaires/', data),
  updatePartenaire: (id, data) => api.put(`/developpement-durable/partenaires/${id}/`, data),
  deletePartenaire: (id) => api.delete(`/developpement-durable/partenaires/${id}/`),

  // Activités DD
  getActivites: (params = {}) => api.get('/developpement-durable/activites/', { params }),
  getActivite: (id) => api.get(`/developpement-durable/activites/${id}/`),
  createActivite: (data) => api.post('/developpement-durable/activites/', data),
  updateActivite: (id, data) => api.put(`/developpement-durable/activites/${id}/`, data),
  deleteActivite: (id) => api.delete(`/developpement-durable/activites/${id}/`),
};

// ========== SERVICE PARCELLES ==========
export const parcelleService = {
  getAll: (params = {}) => api.get('/parcelles/', { params }),
  getAllForDropdown: async (params = {}) => {
    const { results } = await fetchAllPages('/parcelles/', params);
    return { data: results };
  },
  getById: (id) => api.get(`/parcelles/${id}/`),
  create: (data) => { invalidateByPrefix('/parcelles/'); return api.post('/parcelles/', data); },
  update: (id, data) => { invalidateByPrefix('/parcelles/'); return api.put(`/parcelles/${id}/`, data); },
  patch: (id, data) => { invalidateByPrefix('/parcelles/'); return api.patch(`/parcelles/${id}/`, data); },
  delete: (id) => { invalidateByPrefix('/parcelles/'); return api.delete(`/parcelles/${id}/`); },
  getGeoJSON: () => api.get('/parcelles/geojson/'),
  getNearby: (lat, lon, radius = 10) =>
    api.get(`/parcelles/nearby/?lat=${lat}&lon=${lon}&radius=${radius}`),
  getStatistiques: () => api.get('/parcelles/statistiques/'),
  export: () => api.get('/parcelles/export/', { responseType: 'blob' }),

  // Extraction personnalisée
  getAvailableFields: () => api.get('/parcelles/available_fields/'),
  exportCustom: (data) => api.post('/parcelles/export_custom/', data, { responseType: 'blob' }),
};

// ========== SERVICE DOTATIONS ==========
export const dotationService = {
  getAll: (params = {}) => api.get('/dotations/', { params }),
  getById: (id) => api.get(`/dotations/${id}/`),
  create: (data) => { invalidateByPrefix('/dotations/'); return api.post('/dotations/', data); },
  update: (id, data) => { invalidateByPrefix('/dotations/'); return api.put(`/dotations/${id}/`, data); },
  delete: (id) => { invalidateByPrefix('/dotations/'); return api.delete(`/dotations/${id}/`); },
};

// ========== SERVICE DASHBOARD ==========
export const dashboardService = {
  getGlobal: (params = {}) => api.get('/dashboard/', { params }),
  getDecisionnel: (params = {}) => api.get('/dashboard/decisionnel/', { params }),
  exportDecisionnel: (format = 'excel', params = {}) => api.get('/dashboard/decisionnel/export/', {
    params: { ...params, format },
    responseType: 'blob'
  }),
  getVillagesAndCommunes: () => api.get('/dashboard/villages-communes/'),
  getProduction: (params = {}) => api.get('/dashboard/production/', { params }),
  createVillage: (data) => api.post('/dashboard/villages/', data),
  importVillagesExcel: (formData) => api.post('/dashboard/villages/import-excel/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getVillageReferences: (params = {}) => api.get('/dashboard/village-references/', { params }),
};

// ========== SERVICE CHATBOT ==========
export const chatbotService = {
  sendMessage: (message) => api.post('/chatbot/', { message }),
};

// ========== SERVICE TRAÇABILITÉ ==========

export const tracabiliteService = {
  // Campagnes
  getCampagnes: () => api.get('/tracabilite/campagnes/'),
  getCampagne: (id) => api.get(`/tracabilite/campagnes/${id}/`),
  createCampagne: (data) => api.post('/tracabilite/campagnes/', data),
  updateCampagne: (id, data) => api.put(`/tracabilite/campagnes/${id}/`, data),

  // Bons de collecte
  getBonsCollecte: (params = {}) => api.get('/tracabilite/bons-collecte/', { params }),
  getBonCollecte: (id) => api.get(`/tracabilite/bons-collecte/${id}/`),
  createBonCollecte: (data) => api.post('/tracabilite/bons-collecte/', data),
  updateBonCollecte: (id, data) => api.put(`/tracabilite/bons-collecte/${id}/`, data),
  deleteBonCollecte: (id) => api.delete(`/tracabilite/bons-collecte/${id}/`),
  traceBonCollecte: (id) => api.get(`/tracabilite/bons-collecte/${id}/trace/`),
  statistiquesBonsCollecte: (params = {}) => api.get('/tracabilite/bons-collecte/statistics/', { params }),

  // Fiches de collecte
  getFichesCollecte: (params = {}) => api.get('/tracabilite/fiches-collecte/', { params }),
  getFicheCollecte: (id) => api.get(`/tracabilite/fiches-collecte/${id}/`),
  createFicheCollecte: (data) => api.post('/tracabilite/fiches-collecte/', data),
  updateFicheCollecte: (id, data) => api.put(`/tracabilite/fiches-collecte/${id}/`, data),

  // Bons de transport
  getBonsTransport: (params = {}) => api.get('/tracabilite/bons-transport/', { params }),
  getBonTransport: (id) => api.get(`/tracabilite/bons-transport/${id}/`),
  createBonTransport: (data) => api.post('/tracabilite/bons-transport/', data),
  updateBonTransport: (id, data) => api.put(`/tracabilite/bons-transport/${id}/`, data),
  marquerRecu: (id, data) => api.post(`/tracabilite/bons-transport/${id}/marquer-recu/`, data),

  // Lots de traitement
  getLotsTraitement: (params = {}) => api.get('/tracabilite/lots-traitement/', { params }),
  getLotTraitement: (id) => api.get(`/tracabilite/lots-traitement/${id}/`),
  createLotTraitement: (data) => api.post('/tracabilite/lots-traitement/', data),
  updateLotTraitement: (id, data) => api.put(`/tracabilite/lots-traitement/${id}/`, data),

  // Colis
  getColis: (params = {}) => api.get('/tracabilite/colis/', { params }),
  getColisById: (id) => api.get(`/tracabilite/colis/${id}/`),
  createColis: (data) => api.post('/tracabilite/colis/', data),
  updateColis: (id, data) => api.put(`/tracabilite/colis/${id}/`, data),
  generateQR: (id) => api.get(`/tracabilite/colis/${id}/generate-qr/`),

  // Commandes d'export
  getCommandesExport: (params = {}) => api.get('/tracabilite/commandes-export/', { params }),
  getCommandeExport: (id) => api.get(`/tracabilite/commandes-export/${id}/`),
  createCommandeExport: (data) => api.post('/tracabilite/commandes-export/', data),
  updateCommandeExport: (id, data) => api.put(`/tracabilite/commandes-export/${id}/`, data),
  traceCommandeExport: (id) => api.get(`/tracabilite/commandes-export/${id}/trace/`),

  // Chaînes de traçabilité
  getTracabiliteChains: (params = {}) => api.get('/tracabilite/tracabilite-chains/', { params })
};


// ========== SERVICE FORMATIONS & CERTIFICATIONS ==========
export const formationService = {
  // Types de formations
  getAllTypesFormations: (params = {}) => api.get('/formations/types-formations/', { params }),
  getTypeFormationById: (id) => api.get(`/formations/types-formations/${id}/`),
  createTypeFormation: (data) => api.post('/formations/types-formations/', data),
  updateTypeFormation: (id, data) => api.put(`/formations/types-formations/${id}/`, data),
  deleteTypeFormation: (id) => api.delete(`/formations/types-formations/${id}/`),

  // Formations
  getAllFormations: (params = {}) => api.get('/formations/formations/', { params }),
  getFormationById: (id) => api.get(`/formations/formations/${id}/`),
  createFormation: (data) => api.post('/formations/formations/', data),
  updateFormation: (id, data) => api.put(`/formations/formations/${id}/`, data),
  deleteFormation: (id) => api.delete(`/formations/formations/${id}/`),
  getFormationsStats: () => api.get('/formations/formations/statistiques/'),
  getFormationsByProducteur: (producteurId) => api.get(`/formations/formations/par_producteur/?producteur_id=${producteurId}`),

  // Types de certifications
  getAllTypesCertifications: (params = {}) => api.get('/formations/types-certifications/', { params }),
  getTypeCertificationById: (id) => api.get(`/formations/types-certifications/${id}/`),
  createTypeCertification: (data) => api.post('/formations/types-certifications/', data),
  updateTypeCertification: (id, data) => api.put(`/formations/types-certifications/${id}/`, data),
  deleteTypeCertification: (id) => api.delete(`/formations/types-certifications/${id}/`),

  // Certifications
  getAllCertifications: (params = {}) => api.get('/formations/certifications/', { params }),
  getCertificationById: (id) => api.get(`/formations/certifications/${id}/`),
  createCertification: (data) => api.post('/formations/certifications/', data),
  updateCertification: (id, data) => api.put(`/formations/certifications/${id}/`, data),
  deleteCertification: (id) => api.delete(`/formations/certifications/${id}/`),
  getCertificationsStats: () => api.get('/formations/certifications/statistiques/'),
  getCertificationsByProducteur: (producteurId) => api.get(`/formations/certifications/par_producteur/?producteur_id=${producteurId}`),
  getCertificationsExpirantBientot: () => api.get('/formations/certifications/expirant_bientot/'),
  getCertificationsHistorique: (params = {}) => api.get('/formations/certifications/historique/', { params }),

  // Audits
  getAudits: (params = {}) => api.get('/formations/audits/', { params }),
  getAuditsStats: () => api.get('/formations/audits/statistiques/'),
  getAuditNonConformites: (auditId) => api.get(`/formations/audits/${auditId}/nonconformites/`),

  // Non-conformités
  resolveNonConformite: (id) => api.post(`/formations/nonconformites/${id}/resoudre/`),
};

// ========== SERVICE RECOMMANDATIONS ==========
export const recommendationService = {
  // Liste toutes les recommandations
  getAll: (params = {}) => api.get('/recommendations/', { params }),

  // Détails d'une recommandation
  getById: (id) => api.get(`/recommendations/${id}/`),

  // Valider qu'un producteur a suffisamment de données
  validateProducteur: (producteurId) =>
    api.post('/recommendations/validate-producteur/', {
      producteur_id: producteurId
    }),

  // Générer recommandations pour un producteur
  generateForProducteur: (producteurId, topN = 5) =>
    api.post('/recommendations/generate-for-producteur/', {
      producteur_id: producteurId,
      top_n: topN
    }),

  // Marquer comme exécutée
  execute: (id) => api.post(`/recommendations/${id}/execute/`),

  // Marquer comme rejetée
  reject: (id) => api.post(`/recommendations/${id}/reject/`),

  // Statistiques
  statistics: () => api.get('/recommendations/statistics/'),

  // Archives Mahavelona
  getMahavelonaArchives: (params = {}) => api.get('/recommendations/mahavelona/archives/', { params }),
  createMahavelonaArchive: (data) => api.post('/recommendations/mahavelona/archives/', data),

  // Refresh toutes les recommandations (admin)
  refreshAll: () => api.post('/recommendations/refresh-all/')
};

// ========== SERVICE ACTIVITÉS ==========
export const activiteService = {
  getAll: (params = {}) => api.get('/activites/', { params }),
  getById: (id) => api.get(`/activites/${id}/`),
  create: (data) => api.post('/activites/', data),
  update: (id, data) => api.put(`/activites/${id}/`, data),
  delete: (id) => api.delete(`/activites/${id}/`),
  getTypes: () => api.get('/activites/types/')
};

// ========== SERVICE AGR ==========
export const agrService = {
  getAll: (params = {}) => api.get('/agr/', { params }),
  getById: (id) => api.get(`/agr/${id}/`),
  create: (data) => api.post('/agr/', data),
  update: (id, data) => api.put(`/agr/${id}/`, data),
  delete: (id) => api.delete(`/agr/${id}/`),
  getStats: () => api.get('/agr/stats/'),
  getByProducteur: (producteurId) => api.get('/agr/', { params: { producteur: producteurId, active: true } })
};

// ========== SERVICE HISTORY ==========
export const historyService = {
  // Production History
  getProductionHistory: (params = {}) => api.get('/history/production-history/', { params }),
  getProductionHistoryById: (id) => api.get(`/history/production-history/${id}/`),
  createProductionHistory: (data) => api.post('/history/production-history/', data),
  updateProductionHistory: (id, data) => api.put(`/history/production-history/${id}/`, data),
  deleteProductionHistory: (id) => api.delete(`/history/production-history/${id}/`),
  getProductionByParcelle: (parcelleId, params = {}) => 
    api.get('/history/production-history/by_parcelle/', { params: { parcelle_id: parcelleId, ...params } }),
  getProductionTrends: (params = {}) => api.get('/history/production-history/trends/', { params }),

  // AGR History
  getAGRHistory: (params = {}) => api.get('/history/agr-history/', { params }),
  getAGRHistoryById: (id) => api.get(`/history/agr-history/${id}/`),
  createAGRHistory: (data) => api.post('/history/agr-history/', data),
  updateAGRHistory: (id, data) => api.put(`/history/agr-history/${id}/`, data),
  deleteAGRHistory: (id) => api.delete(`/history/agr-history/${id}/`),
  getAGRByProducteur: (producteurId, params = {}) => 
    api.get('/history/agr-history/by_producteur/', { params: { producteur_id: producteurId, ...params } }),
  getAGRTrends: (params = {}) => api.get('/history/agr-history/trends/', { params }),
  getAGRTotalByYear: (params = {}) => api.get('/history/agr-history/total_by_year/', { params }),

  // Social Indicator History
  getSocialIndicatorHistory: (params = {}) => api.get('/history/social-indicator-history/', { params }),
  getSocialIndicatorHistoryById: (id) => api.get(`/history/social-indicator-history/${id}/`),
  createSocialIndicatorHistory: (data) => api.post('/history/social-indicator-history/', data),
  updateSocialIndicatorHistory: (id, data) => api.put(`/history/social-indicator-history/${id}/`, data),
  deleteSocialIndicatorHistory: (id) => api.delete(`/history/social-indicator-history/${id}/`),
  getSocialIndicatorByProducteur: (producteurId, params = {}) => 
    api.get('/history/social-indicator-history/by_producteur/', { params: { producteur_id: producteurId, ...params } }),
  getSocialIndicatorTrends: (params = {}) => api.get('/history/social-indicator-history/trends/', { params }),
  getSocialIndicatorAveragesByVillage: (params = {}) => 
    api.get('/history/social-indicator-history/averages_by_village/', { params }),

  // Trend Analysis
  getProductionTrendsAnalysis: (params = {}) => api.get('/history/trends/production_trends/', { params }),
  getAGRTrendsAnalysis: (params = {}) => api.get('/history/trends/agr_trends/', { params }),
  getSocialTrendsAnalysis: (params = {}) => api.get('/history/trends/social_trends/', { params }),

  // Annual Snapshots
  getSnapshots: (params = {}) => api.get('/history/snapshots/', { params }),
  getSnapshotById: (id) => api.get(`/history/snapshots/${id}/`),
  createSnapshot: (data) => api.post('/history/snapshots/', data),
  createSnapshotForYear: (annee, data = {}) => 
    api.post('/history/snapshots/create_for_year/', { annee, ...data }),
  compareSnapshots: (annee1, annee2) => 
    api.get('/history/snapshots/compare/', { params: { annee1, annee2 } }),
  lockSnapshot: (id) => api.post(`/history/snapshots/${id}/lock/`),

  // Helper methods
  getParcelles: (params = {}) => api.get('/parcelles/', { params }),
  getProducteurs: (params = {}) => api.get('/producteurs/', { params }),
};

export default api;
