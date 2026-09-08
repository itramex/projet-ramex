import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix pour les icônes Leaflet avec bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function ParcelleMapViewFullscreen({ parcelles, onClose, enableDraw = false, onPolygonSave }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const polygonsLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [drawMode, setDrawMode] = useState(false);
  // État maintenu pour compatibilité : jamais mis à jour dans ce composant
  // (la parcelle est transmise via props), mais lu lors de la sauvegarde du polygone.
  const [selectedParcelle] = useState(null);
  const [polygonCoords, setPolygonCoords] = useState(null);
  const [area, setArea] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [filterCertified, setFilterCertified] = useState(null); // null, true, false

  // 1. Initialiser la carte UNE SEULE FOIS
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    setIsLoading(true);

    try {
      const map = L.map(mapRef.current, {
        center: [-18.8792, 47.5079],
        zoom: 8,
        zoomControl: true,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const polygonsLayer = L.featureGroup();
      map.addLayer(polygonsLayer);
      polygonsLayerRef.current = polygonsLayer;

      const markersLayer = L.featureGroup();
      map.addLayer(markersLayer);
      markersLayerRef.current = markersLayer;

      mapInstanceRef.current = map;

      setTimeout(() => map.invalidateSize(), 100);
    } catch (error) {
      console.error('Erreur init carte:', error);
    }

    setIsLoading(false);

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
  }, []);

  // 2. Mettre à jour les markers quand les parcelles ou le filtre changent
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const polygonsLayer = polygonsLayerRef.current;
    if (!map || !markersLayer || !polygonsLayer) return;

    // Vider les layers existants
    markersLayer.clearLayers();
    polygonsLayer.clearLayers();

    const bounds = [];

    const greenIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMzQiIHZpZXdCb3g9IjAgMCAyNCAzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMEM4IDAgMCA0IDAgMTJjMCA4IDEyIDIyIDEyIDIyczEyLTE0IDEyLTIyYzAtOC04LTEyLTEyLTEyeiIgZmlsbD0iIzIyYzU1ZSIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjUiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
      iconSize: [24, 34],
      iconAnchor: [12, 34],
      popupAnchor: [0, -34]
    });

    const certifiedIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMzQiIHZpZXdCb3g9IjAgMCAyNCAzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMEM4IDAgMCA0IDAgMTJjMCA4IDEyIDIyIDEyIDIyczEyLTE0IDEyLTIyYzAtOC04LTEyLTEyLTEyeiIgZmlsbD0iI2Y1OWUwYiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjUiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
      iconSize: [24, 34],
      iconAnchor: [12, 34],
      popupAnchor: [0, -34]
    });

    const filteredParcelles = filterCertified === null
      ? parcelles
      : parcelles.filter(p => Boolean(p.certifiee) === filterCertified);

    filteredParcelles.forEach(parcelle => {
      if (parcelle.latitude && parcelle.longitude) {
        const lat = parseFloat(parcelle.latitude);
        const lon = parseFloat(parcelle.longitude);
        bounds.push([lat, lon]);

        const icon = parcelle.certifiee ? greenIcon : certifiedIcon;
        const marker = L.marker([lat, lon], { icon }).addTo(markersLayer);

        const culturesText = parcelle.cultures_pratiquees && parcelle.cultures_pratiquees.length > 0
          ? `<br/>🌾 ${parcelle.cultures_pratiquees.map(c =>
              c === 'vanille' ? 'Vanille' :
              c === 'cafe' ? 'Café' :
              c === 'girofle' ? 'Girofle' : c
            ).join(', ')}`
          : '';

        marker.bindPopup(`
          <div style="padding: 12px; min-width: 220px;">
            <strong style="color: ${parcelle.certifiee ? '#f59e0b' : '#22c55e'}; font-size: 17px;">
              ${parcelle.code_parcelle}
            </strong>
            ${parcelle.certifiee ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">✓ Certifiée</span>' : ''}
            <br/>
            <span style="color: #666; font-size: 13px;">${parcelle.producteur_nom}</span>
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #e5e7eb;"/>
            <div style="font-size: 12px; line-height: 1.8;">
              📍 ${parcelle.localisation}<br/>
              📏 ${parcelle.dimension_ha} Ha<br/>
              🌱 ${parcelle.nombre_pieds} pieds<br/>
              🌿 ${parcelle.type_vanille}${culturesText}
            </div>
          </div>
        `);
      }

      if (parcelle.polygon_geojson && parcelle.polygon_geojson.coordinates) {
        try {
          const coords = parcelle.polygon_geojson.coordinates[0];
          if (!coords || coords.length === 0) return;

          const firstCoord = coords[0];
          if (!Array.isArray(firstCoord) || firstCoord.length < 2) return;

          const latlngs = coords.map(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
              const absFirst = Math.abs(coord[0]);
              const absSecond = Math.abs(coord[1]);
              const isFirstLikelyLng = absFirst > 40;
              const isSecondLikelyLat = absSecond < 30;
              if (isFirstLikelyLng && isSecondLikelyLat) {
                return [coord[1], coord[0]];
              } else {
                return [coord[0], coord[1]];
              }
            }
            return null;
          }).filter(coord => coord !== null);

          if (latlngs.length < 3) return;

          const polygonColor = parcelle.certifiee ? '#22c55e' : '#f59e0b';
          const polygon = L.polygon(latlngs, {
            color: polygonColor,
            weight: 3,
            fillOpacity: 0.4,
            opacity: 1.0,
            fillColor: polygonColor
          }).addTo(polygonsLayer);

          polygon.bindPopup(`
            <div style="padding: 10px;">
              <strong>${parcelle.code_parcelle}</strong><br/>
              Surface : ${parcelle.dimension_ha} Ha
            </div>
          `);

          const polygonBounds = polygon.getBounds();
          if (polygonBounds && polygonBounds.isValid()) {
            bounds.push([polygonBounds.getSouth(), polygonBounds.getWest()]);
            bounds.push([polygonBounds.getNorth(), polygonBounds.getEast()]);
          }
        } catch (error) {
          console.error('Erreur affichage polygone:', parcelle.code_parcelle, error);
        }
      }
    });

    // Ajuster la vue
    if (bounds.length > 0) {
      const boundsGroup = L.latLngBounds(bounds);
      if (boundsGroup.isValid()) {
        map.fitBounds(boundsGroup, { padding: [50, 50], maxZoom: 15 });
      } else {
        map.setView([-18.8792, 47.5079], 8);
      }
    } else if (filteredParcelles.length > 0 && filteredParcelles[0].latitude && filteredParcelles[0].longitude) {
      const firstParcelle = filteredParcelles[0];
      map.setView([parseFloat(firstParcelle.latitude), parseFloat(firstParcelle.longitude)], 15);
    } else {
      map.setView([-18.8792, 47.5079], 8);
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [parcelles, filterCertified]);

  // 3. Gérer le mode dessin séparément
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !drawMode || !enableDraw) return;

    let drawControl = null;
    const drawnItems = L.featureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    if (L.Control?.Draw) {
      drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
          polygon: {
            allowIntersection: false,
            shapeOptions: { color: '#3b82f6', weight: 3, fillOpacity: 0.3 },
            showArea: true,
            metric: true
          },
          polyline: false,
          rectangle: {
            shapeOptions: { color: '#3b82f6', weight: 3, fillOpacity: 0.3 }
          },
          circle: false,
          circlemarker: false,
          marker: false
        },
        edit: { featureGroup: drawnItems, remove: true }
      });

      map.addControl(drawControl);

      const onCreated = (e) => {
        const layer = e.layer;
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);
        const coords = layer.getLatLngs()[0].map(latlng => [latlng.lng, latlng.lat]);
        coords.push(coords[0]);
        setPolygonCoords(coords);
        const areaM2 = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
        const areaHa = (areaM2 / 10000).toFixed(4);
        setArea(areaHa);
      };

      const onEdited = (e) => {
        e.layers.eachLayer((layer) => {
          const coords = layer.getLatLngs()[0].map(latlng => [latlng.lng, latlng.lat]);
          coords.push(coords[0]);
          setPolygonCoords(coords);
          const areaM2 = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
          const areaHa = (areaM2 / 10000).toFixed(4);
          setArea(areaHa);
        });
      };

      const onDeleted = () => {
        setPolygonCoords(null);
        setArea(0);
      };

      map.on(L.Draw.Event.CREATED, onCreated);
      map.on(L.Draw.Event.EDITED, onEdited);
      map.on(L.Draw.Event.DELETED, onDeleted);

      return () => {
        map.off(L.Draw.Event.CREATED, onCreated);
        map.off(L.Draw.Event.EDITED, onEdited);
        map.off(L.Draw.Event.DELETED, onDeleted);
        if (drawControl) map.removeControl(drawControl);
        map.removeLayer(drawnItems);
      };
    }
  }, [drawMode, enableDraw]);

  const handleSavePolygon = () => {
    if (!polygonCoords) {
      alert('Veuillez dessiner un polygone');
      return;
    }
    if (onPolygonSave) {
      onPolygonSave({
        coordinates: polygonCoords,
        area_ha: parseFloat(area),
        parcelle: selectedParcelle
      });
    }
    setDrawMode(false);
  };

  const filteredParcellesCount = filterCertified === null 
    ? parcelles.length 
    : parcelles.filter(p => Boolean(p.certifiee) === filterCertified).length;

  const certifiedCount = parcelles.filter(p => p.certifiee).length;
  const nonCertifiedCount = parcelles.length - certifiedCount;

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header Compact */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg flex-shrink-0">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                🗺️ <span className="hidden sm:inline">Carte des Parcelles</span>
                <span className="sm:hidden">Carte</span>
              </h1>
              <span className="px-2 sm:px-3 py-1 bg-blue-500 bg-opacity-50 rounded-full text-xs sm:text-sm font-medium">
                {filteredParcellesCount} parcelle{filteredParcellesCount > 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {enableDraw && !drawMode && (
                <button
                  onClick={() => setDrawMode(true)}
                  className="hidden sm:flex px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Dessiner
                </button>
              )}
              
              <button
                onClick={onClose}
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
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-4 sm:px-6 py-2 sm:py-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Filtres */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600 font-medium hidden sm:inline">Filtrer:</span>
              <button
                onClick={() => setFilterCertified(null)}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                  filterCertified === null 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Toutes ({parcelles.length})
              </button>
              <button
                onClick={() => setFilterCertified(true)}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  filterCertified === true 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✓ Certifiées ({certifiedCount})
              </button>
              <button
                onClick={() => setFilterCertified(false)}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                  filterCertified === false 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Non cert. ({nonCertifiedCount})
              </button>
            </div>

            {/* Légende Toggle */}
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="ml-auto px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {showLegend ? '🔽' : '▶️'} Légende
            </button>
          </div>

          {/* Légende */}
          {showLegend && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500"></div>
                  <span className="text-gray-700">Parcelle certifiée</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-orange-500"></div>
                  <span className="text-gray-700">Parcelle non certifiée</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-1 sm:w-12 sm:h-1 bg-green-500 opacity-40"></div>
                  <span className="text-gray-700">Polygone délimité</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mode Dessin Actif */}
      {drawMode && (
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
                  <p className="text-sm sm:text-base font-semibold text-gray-900">Mode Dessin Actif</p>
                  <p className="text-xs sm:text-sm text-gray-600">Utilisez les outils à droite de la carte</p>
                </div>
              </div>

              {polygonCoords && area > 0 && (
                <div className="bg-white border-2 border-green-300 rounded-lg px-3 sm:px-4 py-2 text-center">
                  <p className="text-xs text-gray-600">Superficie</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{area} Ha</p>
                </div>
              )}

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setDrawMode(false);
                    setPolygonCoords(null);
                    setArea(0);
                  }}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSavePolygon}
                  disabled={!polygonCoords}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Carte en plein écran */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm sm:text-base">Chargement de la carte...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-gray-200 shadow-lg flex-shrink-0">
        <div className="px-4 sm:px-6 py-2 flex justify-between items-center text-xs sm:text-sm text-gray-600">
          <span>🌍 OpenStreetMap</span>
          <span className="hidden sm:inline">📍 Cliquez sur un marqueur pour voir les détails</span>
        </div>
      </div>
    </div>
  );
}

export default ParcelleMapViewFullscreen;
