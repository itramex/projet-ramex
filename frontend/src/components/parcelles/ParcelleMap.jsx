import { useEffect, useRef } from 'react';

function ParcelleMap({ parcelle }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!parcelle?.latitude || !parcelle?.longitude) return;

    // Charger Leaflet dynamiquement
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

      // Nettoyer l'ancienne instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (error) {
          console.warn('Erreur lors de la suppression de la carte:', error);
        }
      }

      // Vider le conteneur
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }

      // Attendre un cycle
      setTimeout(() => {
        if (!mapRef.current) return;

        try {
          const lat = parseFloat(parcelle.latitude);
          const lon = parseFloat(parcelle.longitude);

          // Créer la carte
          const map = window.L.map(mapRef.current, {
            center: [lat, lon],
            zoom: 15,
            zoomControl: true,
            scrollWheelZoom: true
          });

          // Ajouter la couche OpenStreetMap
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);

          // ✅ AFFICHER LE POLYGONE si disponible
          let polygonLayer = null;
          // Vérifier polygon_geojson (nom de l'API) ou polygon (ancien nom)
          const polygonData = parcelle.polygon_geojson || parcelle.polygon;
          if (polygonData && polygonData.coordinates && polygonData.coordinates.length > 0) {
            try {
              // Format GeoJSON : { type: "Polygon", coordinates: [[[lon, lat], [lon, lat], ...]] }
              const coords = polygonData.coordinates[0];
              const latlngs = coords.map(coord => [coord[1], coord[0]]); // Inverser lon/lat → lat/lon

              polygonLayer = window.L.polygon(latlngs, {
                color: '#22c55e',
                weight: 3,
                fillColor: '#22c55e',
                fillOpacity: 0.2,
                dashArray: '5, 10'
              }).addTo(map);

              // Ajuster la vue pour afficher le polygone
              map.fitBounds(polygonLayer.getBounds(), { padding: [50, 50] });
            } catch (error) {
              console.error('Erreur affichage polygone:', error);
            }
          }

          // ✅ AFFICHER LE MARQUEUR (point GPS central)
          const customIcon = window.L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDQiIHZpZXdCb3g9IjAgMCAzMiA0NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTYgMEMxMCAwIDAgNiAwIDE2YzAgMTAgMTYgMjggMTYgMjhzMTYtMTggMTYtMjhjMC0xMC0xMC0xNi0xNi0xNnoiIGZpbGw9IiMyMmM1NWUiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI2IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
            iconSize: [32, 44],
            iconAnchor: [16, 44],
            popupAnchor: [0, -44]
          });

          const marker = window.L.marker([lat, lon], { icon: customIcon }).addTo(map);
          
          // ✅ Popup avec info parcelle + superficie si polygon existe
          const superficieInfo = polygonData 
            ? `<br/><span style="font-size: 12px;">🗺️ Superficie délimitée : ${parcelle.superficie_m2 ? (parcelle.superficie_m2 / 10000).toFixed(4) : parcelle.dimension_ha} Ha</span>`
            : '';

          marker.bindPopup(`
            <div style="padding: 8px;">
              <strong style="color: #22c55e; font-size: 16px;">${parcelle.code_parcelle}</strong><br/>
              <span style="color: #666; font-size: 12px;">${parcelle.producteur_nom || 'Producteur'}</span><br/>
              <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;"/>
              <span style="font-size: 12px;">📍 ${parcelle.localisation || 'N/A'}</span><br/>
              <span style="font-size: 12px;">📏 ${parcelle.dimension_ha || 0} Ha (déclaré)</span>
              ${superficieInfo}
              <br/><span style="font-size: 12px;">🌱 ${parcelle.nombre_pieds || 0} pieds</span>
            </div>
          `).openPopup();

          // Forcer le rafraîchissement
          setTimeout(() => {
            if (map) {
              map.invalidateSize();
            }
          }, 100);

          mapInstanceRef.current = map;
          isInitializedRef.current = true;
        } catch (error) {
          console.error('Erreur lors de l\'initialisation de la carte:', error);
        }
      }, 50);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (error) {
          console.warn('Erreur lors du nettoyage de la carte:', error);
        }
      }
      isInitializedRef.current = false;
    };
  }, [parcelle?.latitude, parcelle?.longitude, parcelle?.polygon, parcelle?.polygon_geojson, parcelle?.code_parcelle]);

  if (!parcelle?.latitude || !parcelle?.longitude) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg mb-2">📍 Aucune coordonnée GPS</p>
        <p className="text-sm text-gray-400">
          Ajoutez les coordonnées GPS pour voir la parcelle sur la carte
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-blue-800">
              📍 <strong>Position GPS :</strong> {parcelle.latitude}, {parcelle.longitude}
            </p>
          </div>
          {(parcelle.polygon || parcelle.polygon_geojson) && (
            <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded">
              <span className="text-green-700 text-sm font-medium">
                🗺️ Délimitation disponible
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div 
        ref={mapRef} 
        className="w-full h-96 rounded-lg shadow-lg border-2 border-gray-200"
        style={{ minHeight: '400px' }}
      />
      
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">
          Carte fournie par OpenStreetMap
        </p>
        {(parcelle.polygon || parcelle.polygon_geojson) && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="inline-block w-4 h-4 bg-green-500 bg-opacity-20 border-2 border-green-500 border-dashed"></span>
            <span>Zone délimitée</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParcelleMap;
