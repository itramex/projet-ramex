import { useEffect, useRef, useState } from 'react';

function ParcelleMapView({ parcelles, onClose, enableDraw = false, onPolygonSave }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const scriptsLoadedRef = useRef(false);
  
  const [drawMode, setDrawMode] = useState(false);
  const [selectedParcelle, setSelectedParcelle] = useState(null);
  const [polygonCoords, setPolygonCoords] = useState(null);
  const [area, setArea] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!window.L) {
      const leafletCSS = document.createElement('link');
      leafletCSS.rel = 'stylesheet';
      leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(leafletCSS);

      const leafletJS = document.createElement('script');
      leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      leafletJS.onload = initMap;
      document.head.appendChild(leafletJS);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapRef.current) return;

      // ✅ Nettoyer l'ancienne instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (error) {
          console.warn('Erreur nettoyage:', error);
        }
      }

      // ✅ Vider le conteneur
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
        mapRef.current._leaflet_id = null;
      }

      // ✅ Attendre avant de créer
      setTimeout(() => {
        if (!mapRef.current) return;

        try {
          // Centre par défaut : Madagascar
          const map = window.L.map(mapRef.current, {
            center: [-18.8792, 47.5079],
            zoom: 8,
            zoomControl: true,
            scrollWheelZoom: true
          });

          // Tuiles OpenStreetMap
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);

          // Icône verte personnalisée
          const greenIcon = window.L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMzQiIHZpZXdCb3g9IjAgMCAyNCAzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMEM4IDAgMCA0IDAgMTJjMCA4IDEyIDIyIDEyIDIyczEyLTE0IDEyLTIyYzAtOC04LTEyLTEyLTEyeiIgZmlsbD0iIzIyYzU1ZSIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjUiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
            iconSize: [24, 34],
            iconAnchor: [12, 34],
            popupAnchor: [0, -34]
          });

          const bounds = [];

          // Ajouter les marqueurs
          parcelles.forEach(parcelle => {
            if (parcelle.latitude && parcelle.longitude) {
              const lat = parseFloat(parcelle.latitude);
              const lon = parseFloat(parcelle.longitude);
              
              bounds.push([lat, lon]);

              const marker = window.L.marker([lat, lon], { icon: greenIcon }).addTo(map);
              
              marker.bindPopup(`
                <div style="padding: 10px; min-width: 200px;">
                  <strong style="color: #22c55e; font-size: 16px;">${parcelle.code_parcelle}</strong><br/>
                  <span style="color: #666; font-size: 13px;">${parcelle.producteur_nom}</span><br/>
                  <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;"/>
                  <div style="font-size: 12px; line-height: 1.6;">
                    📍 ${parcelle.localisation}<br/>
                    📏 ${parcelle.dimension_ha} Ha<br/>
                    🌱 ${parcelle.nombre_pieds} pieds<br/>
                    🌿 ${parcelle.type_vanille}<br/>
                    ${parcelle.certifiee ? '✅ Certifiée ' + (parcelle.type_certification || '') : ''}
                  </div>
                </div>
              `);
            }
          });

          // Ajuster la vue pour afficher tous les marqueurs
          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }

          // Forcer rafraîchissement
          setTimeout(() => {
            if (map) map.invalidateSize();
          }, 100);

          mapInstanceRef.current = map;
        } catch (error) {
          console.error('Erreur init carte:', error);
        }
      }, 100);
    }

    return () => {
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
  }, [parcelles]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🗺️ Carte des Parcelles</h2>
              <p className="text-blue-100 mt-1">{parcelles.length} parcelle(s) géolocalisée(s)</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Carte */}
        <div className="flex-1 p-4 overflow-hidden">
          <div 
            ref={mapRef} 
            className="w-full h-full rounded-lg shadow-lg border-2 border-gray-200"
            style={{ minHeight: '500px' }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
          <p className="text-sm text-gray-600">
            📍 Cliquez sur un marqueur pour voir les détails de la parcelle
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParcelleMapView;
