import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupCache, clearCache, invalidateByPrefix } from '../services/apiCache';

/**
 * Mock minimal d'une instance Axios : on capture les intercepteurs
 * pour les invoquer directement comme le ferait axios.
 */
function createMockApi() {
  const handlers = {
    request: [],
    responseSuccess: [],
    responseError: [],
  };
  return {
    interceptors: {
      request: {
        use: (fn) => handlers.request.push(fn),
      },
      response: {
        use: (success, error) => {
          handlers.responseSuccess.push(success);
          handlers.responseError.push(error);
        },
      },
    },
    handlers,
  };
}

function setupInterceptors() {
  const api = createMockApi();
  setupCache(api);
  const [requestInterceptor] = api.handlers.request;
  const [responseInterceptor] = api.handlers.responseSuccess;
  const [errorInterceptor] = api.handlers.responseError;
  return { requestInterceptor, responseInterceptor, errorInterceptor };
}

/** Exécute une requête GET via le cycle complet des intercepteurs (hors cache réseau). */
function simulateGet(interceptors, url, params) {
  const config = interceptors.requestInterceptor({ method: 'get', url, params });
  if (config instanceof Promise) {
    // Rejet avec __cached → l'intercepteur d'erreur le convertit en réponse
    return config.then(
      () => { throw new Error('Expected rejection'); },
      (cached) => interceptors.errorInterceptor(cached)
    );
  }
  return Promise.resolve({ __miss: true, config });
}

/** Simule la réponse réseau réussie d'un GET et l'inscription dans le cache. */
function simulateNetworkResponse(interceptors, config, data) {
  return interceptors.responseInterceptor({
    config,
    status: 200,
    data,
    headers: { 'content-type': 'application/json' },
  });
}

describe('apiCache', () => {
  let interceptors;

  beforeEach(() => {
    clearCache();
    interceptors = setupInterceptors();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ne met en cache que les requêtes GET', async () => {
    const postConfig = interceptors.requestInterceptor({
      method: 'post',
      url: '/producteurs/',
      data: { nom: 'Test' },
    });
    expect(postConfig.__cacheKey).toBeUndefined();

    const getConfig = interceptors.requestInterceptor({
      method: 'get',
      url: '/producteurs/',
    });
    expect(getConfig.__cacheKey).toBe('get:/producteurs/:');
  });

  it('renvoie les données en cache au 2e appel sans nouveau fetch', async () => {
    const first = await simulateGet(interceptors, '/producteurs/', { page: 1 });
    expect(first.__miss).toBe(true);

    await simulateNetworkResponse(interceptors, first.config, {
      results: [{ id: 1 }],
    });

    const second = await simulateGet(interceptors, '/producteurs/', { page: 1 });
    expect(second.__miss).toBeUndefined();
    expect(second.data).toEqual({ results: [{ id: 1 }] });
    expect(second.status).toBe(200);
  });

  it('traite les URLs différentes comme des clés distinctes', async () => {
    const first = await simulateGet(interceptors, '/producteurs/');
    await simulateNetworkResponse(interceptors, first.config, { results: [1] });

    const other = await simulateGet(interceptors, '/cooperatives/');
    expect(other.__miss).toBe(true);
  });

  it('inclut les params dans la clé de cache', async () => {
    const first = await simulateGet(interceptors, '/producteurs/', { village: 'Andapa' });
    await simulateNetworkResponse(interceptors, first.config, { results: ['andapa'] });

    const otherParams = await simulateGet(interceptors, '/producteurs/', { village: 'Sambava' });
    expect(otherParams.__miss).toBe(true);

    const sameParams = await simulateGet(interceptors, '/producteurs/', { village: 'Andapa' });
    expect(sameParams.data).toEqual({ results: ['andapa'] });
  });

  it('distingue les filtres passés en URLSearchParams (régression Dashboard)', async () => {
    // Le Dashboard / Ménage construisent leurs filtres avec new URLSearchParams().
    // JSON.stringify renvoyant '{}' pour un URLSearchParams, toutes les requêtes
    // partageaient la même clé de cache → les filtres semblaient inopérants.
    const withCommune = new URLSearchParams();
    withCommune.append('commune', 'Andapa');

    const first = await simulateGet(interceptors, '/dashboard/', withCommune);
    expect(first.__miss).toBe(true);
    await simulateNetworkResponse(interceptors, first.config, { total_filtres: 10 });

    const otherCommune = new URLSearchParams();
    otherCommune.append('commune', 'Sambava');

    const other = await simulateGet(interceptors, '/dashboard/', otherCommune);
    expect(other.__miss).toBe(true);

    // Mêmes filtres → on retrouve bien la réponse mise en cache
    const same = await simulateGet(interceptors, '/dashboard/', withCommune);
    expect(same.data).toEqual({ total_filtres: 10 });
  });

  it('ignore l’ordre des paramètres URLSearchParams dans la clé', async () => {
    const ordered = new URLSearchParams();
    ordered.append('commune', 'Andapa');
    ordered.append('village', 'Ambodivoara');

    const first = await simulateGet(interceptors, '/dashboard/', ordered);
    await simulateNetworkResponse(interceptors, first.config, { total_filtres: 3 });

    const reordered = new URLSearchParams();
    reordered.append('village', 'Ambodivoara');
    reordered.append('commune', 'Andapa');

    const same = await simulateGet(interceptors, '/dashboard/', reordered);
    expect(same.data).toEqual({ total_filtres: 3 });
  });

  it('normalise les paramètres équivalents (objet vs URLSearchParams)', async () => {
    const viaObject = await simulateGet(interceptors, '/dashboard/', { commune: 'Andapa' });
    await simulateNetworkResponse(interceptors, viaObject.config, { total_filtres: 7 });

    const viaSearchParams = new URLSearchParams();
    viaSearchParams.append('commune', 'Andapa');

    const same = await simulateGet(interceptors, '/dashboard/', viaSearchParams);
    expect(same.data).toEqual({ total_filtres: 7 });
  });

  it('sérialise les tableaux de filtres (multi-sélection)', async () => {
    const multi = await simulateGet(interceptors, '/dashboard/', { commune: ['Andapa', 'Sambava'] });
    await simulateNetworkResponse(interceptors, multi.config, { total_filtres: 42 });

    const otherMulti = await simulateGet(interceptors, '/dashboard/', { commune: ['Andapa'] });
    expect(otherMulti.__miss).toBe(true);

    const sameMulti = await simulateGet(interceptors, '/dashboard/', { commune: ['Andapa', 'Sambava'] });
    expect(sameMulti.data).toEqual({ total_filtres: 42 });
  });

  it('invalide le cache du dashboard après une mutation réussie', async () => {
    const dashboard = await simulateGet(interceptors, '/dashboard/');
    await simulateNetworkResponse(interceptors, dashboard.config, { total_filtres: 393 });

    // Le dashboard est bien servi depuis le cache au 2e appel
    const cached = await simulateGet(interceptors, '/dashboard/');
    expect(cached.data).toEqual({ total_filtres: 393 });

    // Une création de producteur réussie doit invalider les statistiques
    interceptors.responseInterceptor({
      config: { method: 'post', url: '/producteurs/' },
      status: 201,
      data: { id: 1 },
      headers: {},
    });

    const after = await simulateGet(interceptors, '/dashboard/');
    expect(after.__miss).toBe(true);
  });

  it('expire les entrées après le TTL par défaut (5 min)', async () => {
    vi.useFakeTimers();
    const first = await simulateGet(interceptors, '/producteurs/');
    await simulateNetworkResponse(interceptors, first.config, { results: [1] });

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    const after = await simulateGet(interceptors, '/producteurs/');
    expect(after.__miss).toBe(true);
  });

  it('respecte le cacheTTL personnalisé de la requête', async () => {
    vi.useFakeTimers();
    const first = await simulateGet(interceptors, '/producteurs/');
    first.config.cacheTTL = 1000;
    await simulateNetworkResponse(interceptors, first.config, { results: [1] });

    vi.advanceTimersByTime(1500);

    const after = await simulateGet(interceptors, '/producteurs/');
    expect(after.__miss).toBe(true);
  });

  it('ne cache pas les réponses en erreur (status non 2xx)', async () => {
    const first = await simulateGet(interceptors, '/producteurs/');
    interceptors.responseInterceptor({
      config: first.config,
      status: 500,
      data: { error: 'boom' },
      headers: {},
    });

    const second = await simulateGet(interceptors, '/producteurs/');
    expect(second.__miss).toBe(true);
  });

  it('invalidateByPrefix supprime uniquement les entrées correspondantes', async () => {
    const prod = await simulateGet(interceptors, '/producteurs/');
    await simulateNetworkResponse(interceptors, prod.config, { results: ['prod'] });
    const coop = await simulateGet(interceptors, '/cooperatives/');
    await simulateNetworkResponse(interceptors, coop.config, { results: ['coop'] });

    invalidateByPrefix('/producteurs/');

    const prodAfter = await simulateGet(interceptors, '/producteurs/');
    expect(prodAfter.__miss).toBe(true);

    const coopAfter = await simulateGet(interceptors, '/cooperatives/');
    expect(coopAfter.data).toEqual({ results: ['coop'] });
  });

  it('clearCache vide tout le cache', async () => {
    const first = await simulateGet(interceptors, '/producteurs/');
    await simulateNetworkResponse(interceptors, first.config, { results: [1] });

    clearCache();

    const after = await simulateGet(interceptors, '/producteurs/');
    expect(after.__miss).toBe(true);
  });
});
