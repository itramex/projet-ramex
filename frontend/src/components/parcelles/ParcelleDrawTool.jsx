import { useEffect, useRef, useState } from 'react';

function ParcelleDrawTool({ initialPolygon, initialCenter, onSave, onCancel }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const scriptsLoadedRef = useRef(false);
  const [polygonCoords, setPolygonCoords] = useState(null);
  const [area, setArea] = useState(0);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadScripts = async () => {
      // Si déjà chargé, initialiser directement
      if (window.L && window.L.Control?.Draw && scriptsLoadedRef.current) {
        initMap();
        return;
      }

      setIsLoading(true);

      // Charger Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);
      }

      // Charger Leaflet Draw CSS
      if (!document.querySelector('link[href*="leaflet.draw.css"]')) {
        const leafletDrawCSS = document.createElement('link');
        leafletDrawCSS.rel = 'stylesheet';
        leafletDrawCSS.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
        document.head.appendChild(leafletDrawCSS);
      }

      // Charger Leaflet JS
      if (!window.L) {
        await new Promise((resolve, reject) => {
          const leafletJS = document.createElement('script');
          leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          leafletJS.onload = resolve;
          leafletJS.onerror = reject;
          document.head.appendChild(leafletJS);
        });
      }

      // ✅ Attendre que Leaflet soit complètement chargé
      await new Promise(resolve => setTimeout(resolve, 100));

      // Charger Leaflet Draw JS
      if (!window.L?.Control?.Draw) {
        await new Promise((resolve, reject) => {
          const leafletDrawJS = document.createElement('script');
          leafletDrawJS.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
          leafletDrawJS.onload = resolve;
          leafletDrawJS.onerror = reject;
          document.head.appendChild(leafletDrawJS);
        });
      }

      // ✅ Attendre que Leaflet.draw soit complètement chargé
      await new Promise(resolve => setTimeout(resolve, 100));

      scriptsLoadedRef.current = true;
      setIsLoading(false);

      if (mounted) {
        initMap();
      }
    };

    function initMap() {
      if (!mapRef.current || !window.L || !window.L.Control?.Draw) {
        console.warn('Carte ou Leaflet.draw pas prêt');
        return;
      }

      // ✅ Nettoyer complètement l'ancienne instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (error) {
          console.warn('Erreur nettoyage:', error);
        }
      }

      // ✅ Vider le conteneur HTML
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
        // Retirer l'attribut Leaflet
        mapRef.current._leaflet_id = null;
      }

      // ✅ Attendre avant de créer la nouvelle carte
      setTimeout(() => {
        if (!mapRef.current || !mounted) return;

        try {
          const center = initialCenter || [-18.8792, 47.5079];
          // Zoom plus élevé si on a un polygone OU des coordonnées GPS
          const zoom = (initialPolygon || initialCenter) ? 16 : 12;

          // Créer la carte
          const map = window.L.map(mapRef.current, {
            center: center,
            zoom: zoom,
            zoomControl: true,
            scrollWheelZoom: true
          });

          // Tuiles OSM
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19,
          }).addTo(map);

          // FeatureGroup pour les polygones
          const drawnItems = new window.L.FeatureGroup();
          map.addLayer(drawnItems);
          drawnItemsRef.current = drawnItems;

          // ✅ Vérifier que Draw existe avant de l'utiliser
          if (window.L.Control?.Draw) {
            const drawControl = new window.L.Control.Draw({
              position: 'topright',
              draw: {
                polygon: {
                  allowIntersection: false,
                  shapeOptions: {
                    color: '#22c55e',
                    weight: 3,
                    fillOpacity: 0.3
                  },
                  showArea: true,
                  metric: true
                },
                polyline: false,
                rectangle: {
                  shapeOptions: {
                    color: '#22c55e',
                    weight: 3,
                    fillOpacity: 0.3
                  }
                },
                circle: false,
                circlemarker: false,
                marker: false
              },
              edit: {
                featureGroup: drawnItems,
                remove: true
              }
            });

            map.addControl(drawControl);

            // Événements de dessin
            map.on(window.L.Draw.Event.CREATED, function (e) {
              const layer = e.layer;
              drawnItems.clearLayers();
              drawnItems.addLayer(layer);
              
              const coords = layer.getLatLngs()[0].map(latlng => [latlng.lng, latlng.lat]);
              coords.push(coords[0]);
              
              setPolygonCoords(coords);
              setHasDrawing(true);
              
              const areaM2 = window.L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
              const areaHa = (areaM2 / 10000).toFixed(4);
              setArea(areaHa);
            });

            map.on(window.L.Draw.Event.EDITED, function (e) {
              const layers = e.layers;
              layers.eachLayer(function (layer) {
                const coords = layer.getLatLngs()[0].map(latlng => [latlng.lng, latlng.lat]);
                coords.push(coords[0]);
                setPolygonCoords(coords);
                
                const areaM2 = window.L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
                const areaHa = (areaM2 / 10000).toFixed(4);
                setArea(areaHa);
              });
            });

            map.on(window.L.Draw.Event.DELETED, function () {
              setPolygonCoords(null);
              setArea(0);
              setHasDrawing(false);
            });
          }

          // Charger polygone initial
          if (initialPolygon && Array.isArray(initialPolygon) && initialPolygon.length > 0) {
            try {
              const latlngs = initialPolygon.map(coord => [coord[1], coord[0]]);
              const polygon = window.L.polygon(latlngs, {
                color: '#22c55e',
                weight: 3,
                fillOpacity: 0.3
              });
              drawnItems.addLayer(polygon);
              map.fitBounds(polygon.getBounds());
              
              setPolygonCoords(initialPolygon);
              setHasDrawing(true);
              
              const areaM2 = window.L.GeometryUtil.geodesicArea(latlngs);
              const areaHa = (areaM2 / 10000).toFixed(4);
              setArea(areaHa);
            } catch (error) {
              console.error('Erreur chargement polygone:', error);
            }
          } else if (initialCenter) {
            // Si pas de polygone mais coordonnées GPS, ajouter un marqueur
            try {
              const marker = window.L.marker(initialCenter, {
                icon: window.L.icon({
                  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMzQiIHZpZXdCb3g9IjAgMCAyNCAzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMEM4IDAgMCA0IDAgMTJjMCA4IDEyIDIyIDEyIDIyczEyLTE0IDEyLTIyYzAtOC04LTEyLTEyLTEyeiIgZmlsbD0iIzIyYzU1ZSIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjUiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
                  iconSize: [32, 45],
                  iconAnchor: [16, 45],
                  popupAnchor: [0, -45]
                })
              }).addTo(map);
              
              marker.bindPopup(`
                <div style="padding: 8px; text-align: center;">
                  <strong style="color: #22c55e;">📍 Position de la parcelle</strong><br/>
                  <span style="font-size: 11px; color: #666;">
                    Lat: ${initialCenter[0].toFixed(6)}<br/>
                    Lon: ${initialCenter[1].toFixed(6)}
                  </span><br/>
                  <span style="font-size: 10px; color: #999; margin-top: 4px; display: block;">
                    Dessinez un polygone pour délimiter la parcelle
                  </span>
                </div>
              `).openPopup();
            } catch (error) {
              console.error('Erreur ajout marqueur:', error);
            }
          }

          setTimeout(() => {
            if (map) map.invalidateSize();
          }, 100);

          mapInstanceRef.current = map;
        } catch (error) {
          console.error('Erreur init carte:', error);
        }
      }, 100);
    }

    loadScripts().catch(err => {
      console.error('Erreur chargement scripts:', err);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (error) {
          console.warn('Erreur cleanup:', error);
        }
      }
    };
  }, [initialPolygon, initialCenter]);

  const handleSave = () => {
    if (!polygonCoords) {
      alert('Veuillez dessiner un polygone sur la carte');
      return;
    }
    onSave({
      coordinates: polygonCoords,
      area_ha: parseFloat(area)
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header Compact */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg flex-shrink-0">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                🗺️ <span className="hidden sm:inline">Délimitation de la Parcelle</span>
                <span className="sm:hidden">Délimitation</span>
              </h1>
              <p className="text-green-100 text-xs sm:text-sm mt-1">
                {isLoading ? 'Chargement...' : 'Utilisez les outils de dessin à droite de la carte'}
              </p>
            </div>
            <button 
              onClick={onCancel} 
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title="Fermer"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Instructions Toolbar */}
      {!isLoading && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 flex-shrink-0">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-full text-white">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">Mode Dessin</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    <span className="hidden sm:inline">Polygone 🔷 ou Rectangle ▭ puis placez les points</span>
                    <span className="sm:hidden">Outils à droite →</span>
                  </p>
                </div>
              </div>

              {hasDrawing && area > 0 && (
                <div className="bg-white border-2 border-green-300 rounded-lg px-3 sm:px-4 py-2 text-center shadow-md">
                  <p className="text-xs text-gray-600">Superficie calculée</p>
                  <p className="text-xl sm:text-3xl font-bold text-green-600">{area}</p>
                  <p className="text-xs text-gray-500">Hectares</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Carte en plein écran */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm sm:text-base">Chargement de la carte...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Footer Actions */}
      <div className="bg-white border-t border-gray-200 shadow-lg flex-shrink-0">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="text-xs sm:text-sm text-gray-600">
              <p className="font-medium">💡 Astuces :</p>
              <p className="hidden sm:block">Double-cliquez pour terminer • ✏️ Éditer • 🗑️ Supprimer</p>
            </div>
            
            <div className="flex gap-2 sm:gap-3">
              <button 
                onClick={onCancel} 
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm sm:text-base"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!hasDrawing || isLoading}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">Enregistrer</span>
                <span className="sm:hidden">OK</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParcelleDrawTool;
