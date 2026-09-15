/**
 * Cache léger pour les requêtes GET Axios.
 * Évite les re-fetch au changement de page sans dépendance externe.
 */

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

const cache = new Map();

/**
 * Sérialise les paramètres d'une requête en une chaîne stable et comparable.
 *
 * ⚠️ Ne pas se contenter de JSON.stringify(config.params) : plusieurs pages
 * (Dashboard, Ménage, Historique des adhésions…) construisent leurs filtres
 * avec `new URLSearchParams()`. Or JSON.stringify sur un URLSearchParams
 * renvoie '{}' (les paires sont stockées en interne, en dehors des propriétés
 * énumérables). Toutes les requêtes partageaient alors la même clé de cache et
 * la première réponse (non filtrée) était resservie pendant 5 min : les
 * filtres semblaient ne pas fonctionner.
 */
function serializeParams(params) {
  if (!params) return '';

  // Déjà une chaîne de requête
  if (typeof params === 'string') return params;

  // URLSearchParams : on utilise la vraie sérialisation des paires
  if (typeof URLSearchParams !== 'undefined' && params instanceof URLSearchParams) {
    return [...params.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('&');
  }

  if (Array.isArray(params)) {
    return params.map(serializeParams).filter(Boolean).join('&');
  }

  // Objet simple : clés triées (ordre d'insertion stable) et tableaux répétés
  // comme le fait axios avec `paramsSerializer.indexes: null`.
  if (typeof params === 'object') {
    return Object.keys(params)
      .sort()
      .map((key) => {
        const value = params[key];
        if (value === undefined || value === null || value === '') return '';
        if (Array.isArray(value)) {
          return value
            .filter((item) => item !== undefined && item !== null)
            .map((item) => `${key}=${item}`)
            .join('&');
        }
        return `${key}=${value}`;
      })
      .filter(Boolean)
      .join('&');
  }

  return String(params);
}

function buildKey(config) {
  const url = config.baseURL ? config.baseURL + config.url : config.url;
  const method = (config.method || 'get').toLowerCase();
  return `${method}:${url}:${serializeParams(config.params)}`;
}

/**
 * Intercepteur de requête : renvoie la réponse en cache si elle existe et n'est pas expirée.
 */
function cacheRequestInterceptor(config) {
  if ((config.method || 'get').toLowerCase() !== 'get') return config;

  const key = buildKey(config);
  const entry = cache.get(key);

  if (entry && Date.now() - entry.timestamp < entry.ttl) {
    return Promise.reject({
      __cached: true,
      data: entry.data,
      status: entry.status,
      headers: entry.headers,
      config,
    });
  }

  config.__cacheKey = key;
  return config;
}

/**
 * Intercepteur de réponse : stocke les réponses GET réussies dans le cache.
 */
function cacheResponseInterceptor(response) {
  const key = response.config?.__cacheKey;
  if (key && response.status >= 200 && response.status < 300) {
    cache.set(key, {
      data: response.data,
      status: response.status,
      headers: response.headers,
      timestamp: Date.now(),
      ttl: response.config?.cacheTTL || DEFAULT_TTL,
    });
  }
  return response;
}

/**
 * Intercepteur d'erreur : si l'erreur vient du cache, renvoyer une fausse réponse.
 */
function cacheErrorInterceptor(error) {
  if (error?.__cached) {
    return Promise.resolve({
      data: error.data,
      status: error.status,
      headers: error.headers,
      config: error.config,
    });
  }

  // Invalider le cache en cas de mutation réussie (POST/PUT/PATCH/DELETE)
  if (error?.config && (error.config.method || 'get').toLowerCase() !== 'get') {
    invalidateByPrefix(error.config.url);
  }

  return Promise.reject(error);
}

/**
 * Invalide toutes les entrées dont l'URL commence par le préfixe donné.
 */
export function invalidateByPrefix(urlPrefix) {
  for (const key of cache.keys()) {
    if (key.includes(urlPrefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalide toutes les entrées du cache.
 */
export function clearCache() {
  cache.clear();
}

/**
 * Branche les intercepteurs de cache sur une instance Axios.
 */
export function setupCache(api) {
  api.interceptors.request.use(cacheRequestInterceptor);
  api.interceptors.response.use(cacheResponseInterceptor, cacheErrorInterceptor);
  return api;
}
