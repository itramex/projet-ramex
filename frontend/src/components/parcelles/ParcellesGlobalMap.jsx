import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parcelleService } from '../../services/api';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

/**
 * Carte globale des parcelles (toutes les parcelles GPS via /parcelles/geojson/)
 * + recherche de proximité via /parcelles/nearby/ (clic sur la carte).
 */
function ParcellesGlobalMap({ onClose, onOpenDetails }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const zoneLayerRef = useRef(null);

  const [allFeatures, setAllFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [certFilter, setCertFilter] = useState('all');

  // Mode proximité
  const [proximityMode, setProximityMode] = useState(false);
  const [radius, setRadius] = useState(10);
  const [nearbyResults, setNearbyResults] = useState(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');

  // Parcelle sélectionnée (feature geojson ou résultat nearby)
  const [selected, setSelected] = useState(null);

  const radiusOptions = [5, 10, 25, 50];

  const filteredFeatures = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allFeatures.filter((f) => {
      const p = f.properties;
      if (certFilter !== 'all' && String(p.certifiee).toLowerCase() !== certFilter) return false;
      if (term) {
        const haystack = `${p.code_parcelle || ''} ${p.producteur_nom || ''} ${p.producteur_code || ''} ${p.localisation || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [allFeatures, search, certFilter]);

  // 1. Initialisation de la carte
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-15.7, 49.9],
      zoom: 9,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.featureGroup().addTo(map);
    const zoneLayer = L.featureGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    zoneLayerRef.current = zoneLayer;
    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (e) {
          console.warn('Erreur cleanup carte:', e);
        }
      }
    };
  }, []);

  // 2. Chargement du GeoJSON global
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await parcelleService.getGeoJSON();
        if (!cancelled) {
          setAllFeatures(res.data?.features || []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Erreur chargement GeoJSON:', err);
          setError("Impossible de charger les parcelles géolocalisées.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // 3. Ajuster la vue une fois les données prêtes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || loading || allFeatures.length === 0) return;
    const bounds = L.latLngBounds(
      allFeatures.map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [loading, allFeatures]);

  // 4. Rendu des marqueurs quand les filtres changent
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    filteredFeatures.forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties;
      const certified = String(p.certifiee).toLowerCase() === 'true';
      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        color: certified ? '#15803d' : '#d97706',
        weight: 1.5,
        fillColor: certified ? '#22c55e' : '#fbbf24',
        fillOpacity: 0.85,
      });
      marker.bindPopup(
        `<div style="min-width:180px">
          <strong style="color:#b45309">${p.code_parcelle || 'Parcelle'}</strong><br/>
          <strong>${p.producteur_nom || '-'}</strong> <span style="color:#6b7280">(${p.producteur_code || '-'})</span><br/>
          ${p.localisation ? `${p.localisation}<br/>` : ''}
          ${p.dimension_ha ? `Surface : ${p.dimension_ha} Ha<br/>` : ''}
          ${p.nombre_pieds ? `Pieds : ${p.nombre_pieds}<br/>` : ''}
          ${p.age_parcelle ? `Âge : ${p.age_parcelle}<br/>` : ''}
          ${certified
            ? `<span style="color:#15803d">✔ Certifiée${p.type_certification ? ` (${p.type_certification})` : ''}</span>`
            : '<span style="color:#b45309">Non certifiée</span>'}
        </div>`
      );
      marker.on('click', () => setSelected({ ...p, lat, lng }));
      marker.addTo(layer);
    });
  }, [filteredFeatures]);


  // 5. Mode proximité : curseur + gestion du clic
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = async (e) => {
      if (nearbyLoading) return;
      const { lat, lng } = e.latlng;
      setNearbyLoading(true);
      setNearbyError('');
      setNearbyResults(null);
      try {
        const res = await parcelleService.getNearby(lat, lng, radius);
        const results = Array.isArray(res.data) ? res.data : [];
        setNearbyResults({ point: [lat, lng], results });
      } catch (err) {
        console.error('Erreur proximité:', err);
        setNearbyError('Erreur lors de la recherche de proximité.');
      } finally {
        setNearbyLoading(false);
      }
    };

    if (proximityMode) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', handleClick);
    } else {
      map.getContainer().style.cursor = '';
      map.off('click', handleClick);
    }

    return () => {
      map.getContainer().style.cursor = '';
      map.off('click', handleClick);
    };
  }, [proximityMode, radius, nearbyLoading]);

  // 6. Dessiner la zone d'analyse quand les résultats changent
  useEffect(() => {
    const map = mapInstanceRef.current;
    const zoneLayer = zoneLayerRef.current;
    if (!map || !zoneLayer) return;

    zoneLayer.clearLayers();
    if (!nearbyResults) return;

    const [lat, lng] = nearbyResults.point;
    L.circle([lat, lng], {
      radius: radius * 1000,
      color: '#2563eb',
      weight: 1.5,
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
      dashArray: '6 4',
    }).addTo(zoneLayer);

    L.circleMarker([lat, lng], {
      radius: 7,
      color: '#1d4ed8',
      fillColor: '#60a5fa',
      fillOpacity: 1,
      weight: 2,
    })
      .bindPopup(`<strong>Point d'analyse</strong><br/>Rayon : ${radius} km`)
      .addTo(zoneLayer);

    map.flyToBounds(
      [
        [lat - radius / 111, lng - radius / 90],
        [lat + radius / 111, lng + radius / 90],
      ],
      { duration: 0.8, maxZoom: 12 }
    );
  }, [nearbyResults, radius]);

  const focusNearbyResult = (r) => {
    const map = mapInstanceRef.current;
    if (!map || r.latitude == null || r.longitude == null) return;
    map.flyTo([r.latitude, r.longitude], 14, { duration: 0.8 });
    setSelected({ ...r, lat: r.latitude, lng: r.longitude, fromNearby: true });
  };

  const toggleProximity = () => {
    setProximityMode((v) => !v);
    setNearbyResults(null);
    setNearbyError('');
    const zoneLayer = zoneLayerRef.current;
    if (zoneLayer) zoneLayer.clearLayers();
  };

  const stats = useMemo(() => {
    const certified = filteredFeatures.filter(
      (f) => String(f.properties.certifiee).toLowerCase() === 'true'
    ).length;
    return {
      total: filteredFeatures.length,
      certified,
      uncertified: filteredFeatures.length - certified,
    };
  }, [filteredFeatures]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-2 sm:p-6">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full flex flex-col overflow-hidden">

        {/* Barre supérieure */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Icon name="MapIcon" size="md" className="text-primary-yellow" />
            Carte globale des parcelles
          </h2>
          <span className="text-sm text-gray-500">
            {loading
              ? 'Chargement…'
              : `${stats.total} affichée(s) · ${stats.certified} certifiée(s) · ${stats.uncertified} non certifiée(s)`}
          </span>

          <div className="flex-1" />

          <div className="relative">
            <Icon name={iconMap.search} size="sm" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code, producteur, lieu…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow w-52"
            />
          </div>

          <select
            value={certFilter}
            onChange={(e) => setCertFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-yellow"
          >
            <option value="all">Toutes</option>
            <option value="true">Certifiées</option>
            <option value="false">Non certifiées</option>
          </select>

          <button
            onClick={toggleProximity}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              proximityMode
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            title="Cliquer ensuite sur la carte pour analyser une zone"
          >
            🎯 Proximité {proximityMode ? '(ON)' : ''}
          </button>

          {proximityMode && (
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            >
              {radiusOptions.map((r) => (
                <option key={r} value={r}>Rayon {r} km</option>
              ))}
            </select>
          )}

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-2"
            title="Fermer"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-100">{error}</div>
        )}



        {/* Corps : carte + panneaux */}
        <div className="relative flex-1">
          <div ref={mapRef} className="absolute inset-0" />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-yellow mx-auto mb-3" />
                <p className="text-gray-600 text-sm">Chargement des parcelles…</p>
              </div>
            </div>
          )}

          {proximityMode && !nearbyResults && !nearbyLoading && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm px-4 py-2 rounded-full shadow-lg z-10">
              Cliquez sur la carte pour analyser un rayon de {radius} km
            </div>
          )}

          {nearbyLoading && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white text-gray-700 text-sm px-4 py-2 rounded-full shadow-lg z-10">
              Analyse en cours…
            </div>
          )}

          {nearbyError && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-4 py-2 rounded-full shadow-lg z-10">
              {nearbyError}
            </div>
          )}

          {/* Légende */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 text-xs space-y-1 z-10">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
              Parcelle certifiée
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#fbbf24' }} />
              Parcelle non certifiée
            </div>
          </div>


          {/* Panneau de détails de la parcelle sélectionnée */}
          {selected && (
            <div className="absolute top-4 left-4 w-72 bg-white rounded-lg shadow-xl z-20 max-h-[80%] overflow-y-auto">
              <div className="flex items-start justify-between px-4 pt-3">
                <div>
                  <p className="font-bold text-gray-900">{selected.code_parcelle || 'Parcelle'}</p>
                  <p className="text-xs text-gray-500">
                    {selected.fromNearby && selected.distance_km != null
                      ? `À ${selected.distance_km} km du point d'analyse`
                      : 'Sélectionnée sur la carte'}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
              <div className="px-4 py-3 text-sm space-y-1.5">
                <p><span className="text-gray-500">Producteur :</span> <strong>{selected.producteur_nom || '-'}</strong> ({selected.producteur_code || '-'})</p>
                <p><span className="text-gray-500">Localisation :</span> {selected.localisation || '-'}</p>
                <p><span className="text-gray-500">Surface :</span> {selected.dimension_ha ?? '-'} Ha</p>
                <p><span className="text-gray-500">Pieds :</span> {selected.nombre_pieds ?? '-'}</p>
                {selected.age_parcelle && <p><span className="text-gray-500">Âge :</span> {selected.age_parcelle}</p>}
                {selected.culture_principale && <p><span className="text-gray-500">Culture :</span> {selected.culture_principale}</p>}
                <p>
                  <span className="text-gray-500">Certification :</span>{' '}
                  {String(selected.certifiee).toLowerCase() === 'true' ? (
                    <span className="text-green-700 font-medium">✔ {selected.type_certification || 'Certifiée'}</span>
                  ) : (
                    <span className="text-amber-700 font-medium">Non certifiée</span>
                  )}
                </p>
                {onOpenDetails && selected.id && (
                  <button
                    onClick={() => onOpenDetails(selected.id)}
                    className="mt-2 w-full bg-primary-yellow text-dark text-sm font-medium py-1.5 rounded-lg hover:opacity-90"
                  >
                    Ouvrir la fiche parcelle
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Panneau des résultats de proximité */}
          {nearbyResults && (
            <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-xl z-20 max-h-[80%] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="font-bold text-gray-900 text-sm">
                  {nearbyResults.results.length} parcelle(s) dans un rayon de {radius} km
                </p>
                <button
                  onClick={() => setNearbyResults(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                  title="Effacer la zone"
                >
                  ×
                </button>
              </div>
              <div className="overflow-y-auto divide-y divide-gray-100">
                {nearbyResults.results.length === 0 && (
                  <p className="px-4 py-4 text-sm text-gray-500">Aucune parcelle trouvée dans ce rayon.</p>
                )}
                {nearbyResults.results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => focusNearbyResult(r)}
                    className="w-full text-left px-4 py-2.5 hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-900">{r.code_parcelle}</span>
                      {r.distance_km != null && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                          {r.distance_km} km
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.producteur_nom} · {r.localisation || 'localisation inconnue'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ParcellesGlobalMap;
