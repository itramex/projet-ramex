import { useState, useEffect, useRef, useMemo, useDeferredValue, useCallback } from 'react';
import { parcelleService, producteurService, dashboardService } from '../../services/api';
import ParcelleForm from './ParcelleForm';
import ParcelleDetails from './ParcelleDetails';
import ParcelleMapViewFullscreen from './ParcelleMapViewFullscreen';
import ParcellesGlobalMap from './ParcellesGlobalMap';
import SearchableSelect from '../common/SearchableSelect';
import ExportPersonnalise from '../common/ExportPersonnalise';
import { CanCreate, CanUpdate, CanDelete } from '../common/PermissionWrapper';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import { iconMap } from '../../styles/icons';
import { Pagination } from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';

const ITEMS_PER_PAGE = 100;

function ParcelleList() {
  const [parcelles, setParcelles] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [showGlobalMap, setShowGlobalMap] = useState(false);
  const [showExportPersonnalise, setShowExportPersonnalise] = useState(false);
  const [selectedParcelle, setSelectedParcelle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [showInactives, setShowInactives] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({
    producteur: [],
    type_vanille: [],
    certifiee: [],
    village: [],
    cultures_pratiquees: [],
    gps_missing: false,
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Refs pour la synchronisation des barres de défilement
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [tableWidth, setTableWidth] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (producteurs.length > 0) {
      loadData();
    }
  }, [filters, showInactives]);

  // Calcul de la largeur du tableau pour la barre de défilement supérieure
  useEffect(() => {
    const updateTableWidth = () => {
      if (tableRef.current) {
        setTableWidth(tableRef.current.scrollWidth);
      }
    };

    updateTableWidth();
    window.addEventListener('resize', updateTableWidth);

    return () => {
      window.removeEventListener('resize', updateTableWidth);
    };
  }, [parcelles, viewMode]);

  // Synchronisation des barres de défilement
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const tableScroll = tableScrollRef.current;

    if (!topScroll || !tableScroll) return;

    const handleTopScroll = () => {
      if (tableScroll.scrollLeft !== topScroll.scrollLeft) {
        tableScroll.scrollLeft = topScroll.scrollLeft;
      }
    };

    const handleTableScroll = () => {
      if (topScroll.scrollLeft !== tableScroll.scrollLeft) {
        topScroll.scrollLeft = tableScroll.scrollLeft;
      }
    };

    topScroll.addEventListener('scroll', handleTopScroll);
    tableScroll.addEventListener('scroll', handleTableScroll);

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      tableScroll.removeEventListener('scroll', handleTableScroll);
    };
  }, [viewMode, tableWidth]);

  const producteurOptions = producteurs.map(prod => ({
    value: prod.id,
    label: `${prod.code} - ${prod.nom_complet} (${prod.commune})`,
  }));

  // Extraire les villages uniques des parcelles
  const villagesUniques = [...new Set(parcelles.map(p => p.village).filter(Boolean))].sort();
  
  // Options pour le select multiple des villages
  const villageOptions = villagesUniques.map(village => ({
    value: village,
    label: village,
  }));

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.producteur && filters.producteur.length > 0) params.producteur = filters.producteur.join(',');
      if (filters.type_vanille && filters.type_vanille.length > 0) params.type_vanille = filters.type_vanille.join(',');
      if (filters.certifiee && filters.certifiee.length > 0) params.certifiee = filters.certifiee.join(',');
      if (filters.village && filters.village.length > 0) params.village = filters.village.join(',');
      if (filters.cultures_pratiquees && filters.cultures_pratiquees.length > 0) params.cultures_pratiquees = filters.cultures_pratiquees.join(',');
      if (filters.gps_missing) params.gps_missing = 'true';
      if (!showInactives) params.active = 'true';

      const [parcellesRes, producteursRes] = await Promise.all([
        parcelleService.getAllWithAllPages(params),
        producteurService.getAll({ actif: 'true' })
      ]);

      let parcellesData = Array.isArray(parcellesRes.data)
        ? parcellesRes.data
        : parcellesRes.data.results || [];

      let producteursData = Array.isArray(producteursRes.data)
        ? producteursRes.data
        : producteursRes.data.results || [];

      setParcelles(parcellesData);
      setProducteurs(producteursData);
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (selectedParcelle) {
        await parcelleService.update(selectedParcelle.id, formData);
        alert('Parcelle mise à jour avec succès !');
      } else {
        await parcelleService.create(formData);
        alert('Parcelle créée avec succès !');
      }
      setShowForm(false);
      setSelectedParcelle(null);
      await loadData();
    } catch (error) {
      console.error('❌ Erreur:', error);
      const errorMsg = error.response?.data?.numero_parcelle?.[0]
        || error.response?.data?.message
        || 'Erreur lors de l\'enregistrement';
      alert(errorMsg);
      throw error;
    }
  };

  const handleDelete = async (parcelle) => {
    if (window.confirm(`Voulez-vous vraiment supprimer la parcelle ${parcelle.code_parcelle} ?`)) {
      try {
        await parcelleService.delete(parcelle.id);
        alert('Parcelle supprimée avec succès');
        await loadData();
      } catch (error) {
        console.error('❌ Erreur suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleExport = async () => {
    try {
      const response = await parcelleService.export();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `parcelles_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('❌ Erreur export:', error);
      alert('Erreur lors de l\'export');
    }
  };

  const filteredParcelles = parcelles.filter(parcelle =>
    parcelle.code_parcelle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parcelle.producteur_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parcelle.localisation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    currentPage,
    totalPages,
    firstItemIndex,
    lastItemIndex,
    goToPage,
    nextPage,
    prevPage,
  } = usePagination({
    totalItems: filteredParcelles.length,
    itemsPerPage,
  });

  const paginatedParcelles = filteredParcelles.slice(firstItemIndex, lastItemIndex);

  const parcellesAvecGPS = parcelles.filter(p => p.latitude && p.longitude);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-yellow mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark flex items-center gap-3">
            <Icon name={iconMap.parcelles} size="xl" className="text-primary-yellow" />
            Parcelles de Vanille
          </h1>
          <p className="text-gray-600 mt-1">{parcelles.length} parcelle(s) enregistrée(s)</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-gray-100 p-1 rounded-lg flex items-center mr-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary-yellow' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vue liste"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary-yellow' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vue grille"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>

          <Button
            onClick={() => setShowMapView(true)}
            variant="secondary"
            icon="MapIcon"
          >
            Voir la carte ({parcellesAvecGPS.length})
          </Button>

          <Button
            onClick={() => setShowGlobalMap(true)}
            variant="secondary"
            icon="GlobeAltIcon"
            className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
            title="Toutes les parcelles géolocalisées + recherche de proximité"
          >
            Carte globale
          </Button>

          <Button
            onClick={handleExport}
            variant="secondary"
            icon={iconMap.export}
            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
          >
            Export rapide
          </Button>
          
          <Button
            onClick={() => setShowExportPersonnalise(true)}
            variant="secondary"
            icon="DocumentTextIcon"
            className="bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
          >
            Export personnalisé
          </Button>
          
          <CanCreate>
            <Button
              onClick={() => {
                setSelectedParcelle(null);
                setShowForm(true);
              }}
              variant="primary"
              icon={iconMap.add}
            >
              Nouvelle Parcelle
            </Button>
          </CanCreate>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Icon name={iconMap.search} size="md" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            />
          </div>

          <SearchableSelect
            options={producteurOptions}
            value={filters.producteur}
            onChange={(value) => setFilters(prev => ({ ...prev, producteur: value }))}
            placeholder="Tous les producteurs"
            displayKey="label"
            valueKey="value"
            multiple={true}
          />

          <SearchableSelect
            options={villageOptions}
            value={filters.village}
            onChange={(value) => setFilters(prev => ({ ...prev, village: value }))}
            placeholder="Tous les villages"
            displayKey="label"
            valueKey="value"
            multiple={true}
          />

          <SearchableSelect
            options={[
              { value: 'planifolia', label: 'Planifolia' },
              { value: 'tahitensis', label: 'Tahitensis' },
              { value: 'pompona', label: 'Pompona' }
            ]}
            value={filters.type_vanille}
            onChange={(value) => setFilters(prev => ({ ...prev, type_vanille: value }))}
            placeholder="Tous types"
            displayKey="label"
            valueKey="value"
            multiple={true}
          />

          <SearchableSelect
            options={[
              { value: 'true', label: 'Certifiées' },
              { value: 'false', label: 'Non certifiées' }
            ]}
            value={filters.certifiee}
            onChange={(value) => setFilters(prev => ({ ...prev, certifiee: value }))}
            placeholder="Toutes"
            displayKey="label"
            valueKey="value"
            multiple={true}
          />
          <SearchableSelect
            options={[
              { value: 'vanille', label: 'Vanille' },
              { value: 'cafe', label: 'Cafe' },
              { value: 'girofle', label: 'Girofle' },
              { value: 'autre', label: 'Autre' }
            ]}
            value={filters.cultures_pratiquees}
            onChange={(value) => setFilters(prev => ({ ...prev, cultures_pratiquees: value }))}
            placeholder="Cultures"
            displayKey="label"
            valueKey="value"
            multiple={true}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <input
              type="checkbox"
              id="showInactives"
              checked={showInactives}
              onChange={(e) => setShowInactives(e.target.checked)}
              className="w-4 h-4 text-primary-yellow focus:ring-primary-yellow border-gray-300 rounded"
            />
            <label htmlFor="showInactives" className="ml-2 text-sm text-gray-700">
              Afficher les parcelles inactives
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="gpsMissing"
                checked={filters.gps_missing}
                onChange={(e) => setFilters(prev => ({ ...prev, gps_missing: e.target.checked }))}
                className="w-4 h-4 text-primary-yellow focus:ring-primary-yellow border-gray-300 rounded"
              />
              <label htmlFor="gpsMissing" className="ml-2 text-sm text-gray-700">
                GPS non renseigne
              </label>
            </div>
          </div>
        </div>

        {/* Affichage des filtres actifs */}
        {(filters.village.length > 0 || filters.producteur.length > 0 || filters.type_vanille.length > 0 || filters.certifiee.length > 0 || filters.cultures_pratiquees.length > 0 || filters.gps_missing) && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            {filters.village.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 font-medium">Villages:</span>
                {filters.village.map(v => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    <Icon name="HomeIcon" size="sm" />
                    {v}
                    <span
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        village: prev.village.filter(vil => vil !== v)
                      }))}
                      className="ml-1 hover:text-red-600 cursor-pointer"
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
            )}
            {filters.producteur.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 font-medium">Producteurs:</span>
                {filters.producteur.map(pId => {
                  const prod = producteurs.find(p => p.id === pId);
                  return (
                    <span
                      key={pId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                    >
                      <Icon name={iconMap.producteurs} size="sm" />
                      {prod ? prod.code : pId}
                      <span
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          producteur: prev.producteur.filter(p => p !== pId)
                        }))}
                        className="ml-1 hover:text-red-600 cursor-pointer"
                      >
                        ×
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
            {filters.type_vanille.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 font-medium">Types:</span>
                {filters.type_vanille.map(type => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full capitalize"
                  >
                    <Icon name="MapIcon" size="sm" />
                    {type}
                    <span
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        type_vanille: prev.type_vanille.filter(t => t !== type)
                      }))}
                      className="ml-1 hover:text-red-600 cursor-pointer"
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
            )}
            {filters.certifiee.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 font-medium">Certification:</span>
                {filters.certifiee.map(cert => (
                  <span
                    key={cert}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full"
                  >
                    <Icon name={iconMap.certifications} size="sm" />
                    {cert === 'true' ? 'Certifiées' : 'Non certifiées'}
                    <span
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        certifiee: prev.certifiee.filter(c => c !== cert)
                      }))}
                      className="ml-1 hover:text-red-600 cursor-pointer"
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="text-sm text-gray-600 mb-2">
        {paginatedParcelles.length} parcelle(s) affichée(s) sur {filteredParcelles.length} au total
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Barre de défilement supérieure */}
          <div
            ref={topScrollRef}
            className="overflow-x-auto overflow-y-hidden border-b border-gray-200"
            style={{ height: '20px' }}
          >
            <div style={{ width: tableWidth > 0 ? `${tableWidth}px` : '100%', height: '1px' }}></div>
          </div>

          {/* Tableau principal */}
          <div ref={tableScrollRef} className="overflow-x-auto">
            <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Producteur
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Localisation
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Culture / Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Surface (Ha)
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Nb Pieds
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Est. (Kg)
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Certifiée
                  </th>
                  <th scope="col" className="sticky right-0 bg-gray-100 px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedParcelles.map((parcelle, index) => (
                  <tr key={parcelle.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-primary-yellow">{parcelle.code_parcelle}</div>
                      <div className="text-xs text-gray-500">P{parcelle.numero_parcelle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{parcelle.producteur_nom}</div>
                      <div className="text-xs text-gray-500">{parcelle.producteur_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{parcelle.localisation}</div>
                      {parcelle.annee_creation && (
                        <div className="text-xs text-gray-400">Créée {parcelle.annee_creation}</div>
                      )}
                      {parcelle.latitude && parcelle.longitude ? (
                        <Badge variant="info" icon={iconMap.location} size="sm">
                          GPS
                        </Badge>
                      ) : (
                        <Badge variant="error" size="sm">
                          GPS manquant
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{parcelle.culture_principale}</div>
                      {parcelle.culture_principale === 'vanille' && parcelle.type_vanille && (
                        <div className="text-xs text-gray-500 capitalize">{parcelle.type_vanille}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {parcelle.dimension_ha}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {parcelle.nombre_pieds}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {parcelle.estimation_production_kg}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {parcelle.certifiee ? (
                        <Badge variant="success" size="sm">Oui</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Non</Badge>
                      )}
                    </td>
                    <td className="sticky right-0 bg-inherit px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => {
                            setSelectedParcelle(parcelle);
                            setShowDetails(true);
                          }}
                          variant="ghost"
                          size="sm"
                          icon={iconMap.view}
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                          title="Détails"
                        />
                        <CanUpdate>
                          <Button
                            onClick={() => {
                              setSelectedParcelle(parcelle);
                              setShowForm(true);
                            }}
                            variant="ghost"
                            size="sm"
                            icon={iconMap.edit}
                            className="text-gray-600 hover:text-gray-900"
                            title="Modifier"
                          />
                        </CanUpdate>
                        <CanDelete>
                          <Button
                            onClick={() => handleDelete(parcelle)}
                            variant="ghost"
                            size="sm"
                            icon={iconMap.delete}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50"
                            title="Supprimer"
                          />
                        </CanDelete>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedParcelles.map((parcelle) => (
            <Card
              key={parcelle.id}
              className="hover:shadow-xl transition-shadow"
              padding="md"
            >
              {/* En-tête */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-primary-yellow">
                    {parcelle.code_parcelle}
                  </h3>
                  <p className="text-sm text-gray-600">
                    P{parcelle.numero_parcelle} • {parcelle.culture_principale}
                    {parcelle.culture_principale === 'vanille' && parcelle.type_vanille && (
                      <> • {parcelle.type_vanille}</>
                    )}
                  </p>
                  {parcelle.cultures_pratiquees && parcelle.cultures_pratiquees.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {parcelle.cultures_pratiquees.map(culture => (
                        <Badge key={culture} variant="success" size="sm">
                          {culture === 'vanille' && <Icon name="MapIcon" size="sm" />}
                          {culture === 'cafe' && '☕'}
                          {culture === 'girofle' && '🌸'}
                          {culture === 'vanille' ? 'Vanille' :
                            culture === 'cafe' ? 'Café' :
                              culture === 'girofle' ? 'Girofle' : culture}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {parcelle.certifiee && (
                    <Badge variant="success" icon={iconMap.success} size="sm">
                      Certifiée
                    </Badge>
                  )}
                  {parcelle.latitude && parcelle.longitude ? (
                    <Badge variant="info" icon={iconMap.location} size="sm" title="GPS disponible" />
                  ) : (
                    <Badge variant="error" size="sm" title="GPS manquant">
                      GPS ?
                    </Badge>
                  )}
                </div>
              </div>

              {/* Infos */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-700">Producteur</span>
                </div>
                <div className="pl-4">
                  <p className="text-sm font-medium">{parcelle.producteur_nom}</p>
                  <p className="text-xs text-gray-500">{parcelle.producteur_code}</p>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Icon name={iconMap.location} size="sm" />
                    {parcelle.localisation}
                  </p>
                  {parcelle.annee_creation && (
                    <p className="text-xs text-gray-400">Créée {parcelle.annee_creation}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-lg font-bold text-primary-yellow">{parcelle.dimension_ha}</p>
                    <p className="text-xs text-gray-600">Ha</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-lg font-bold text-green-600">{parcelle.nombre_pieds}</p>
                    <p className="text-xs text-gray-600">Pieds</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-lg font-bold text-blue-600">{parcelle.estimation_production_kg}</p>
                    <p className="text-xs text-gray-600">Kg</p>
                  </div>
                </div>

                {/* Productions par culture si disponible */}
                {parcelle.productions_par_culture && Object.keys(parcelle.productions_par_culture).length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <Icon name="ChartBarIcon" size="sm" />
                      Productions détaillées:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(parcelle.productions_par_culture).map(([culture, production]) => (
                        <div key={culture} className="flex items-center justify-between text-xs bg-amber-50 px-2 py-1 rounded">
                          <span className="font-medium capitalize">{culture}</span>
                          <span className="text-amber-700 font-bold">{production} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedParcelle(parcelle);
                    setShowDetails(true);
                  }}
                  variant="secondary"
                  size="sm"
                  icon={iconMap.view}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                >
                  Détails
                </Button>
                <CanUpdate>
                  <Button
                    onClick={() => {
                      setSelectedParcelle(parcelle);
                      setShowForm(true);
                    }}
                    variant="secondary"
                    size="sm"
                    icon={iconMap.edit}
                    className="flex-1"
                  >
                    Modifier
                  </Button>
                </CanUpdate>
                <CanDelete>
                  <Button
                    onClick={() => handleDelete(parcelle)}
                    variant="danger"
                    size="sm"
                    icon={iconMap.delete}
                  />
                </CanDelete>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredParcelles.length > 0 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      )}

      {paginatedParcelles.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-2">Aucune parcelle trouvée</p>
          <p className="text-sm text-gray-400">
            {parcelles.length > 0
              ? 'Essayez de modifier vos critères de recherche'
              : showInactives
                ? 'Aucune parcelle dans la base de données'
                : 'Essayez de cocher "Afficher inactives" ou ajoutez une nouvelle parcelle'}
          </p>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <ParcelleForm
          parcelle={selectedParcelle}
          producteurs={producteurs}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setSelectedParcelle(null);
          }}
        />
      )}

      {showDetails && selectedParcelle && (
        <ParcelleDetails
          parcelleId={selectedParcelle.id}
          onClose={() => {
            setShowDetails(false);
            setSelectedParcelle(null);
          }}
          onEdit={() => {
            setShowDetails(false);
            setShowForm(true);
          }}
        />
      )}

      {showMapView && (
        <ParcelleMapViewFullscreen
          parcelles={parcellesAvecGPS}
          onClose={() => setShowMapView(false)}
          enableDraw={false}
        />
      )}

      {showGlobalMap && (
        <ParcellesGlobalMap
          onClose={() => setShowGlobalMap(false)}
          onOpenDetails={(id) => {
            setShowGlobalMap(false);
            setSelectedParcelle({ id });
            setShowDetails(true);
          }}
        />
      )}

      {showExportPersonnalise && (
        <ExportPersonnalise
          isOpen={showExportPersonnalise}
          onClose={() => setShowExportPersonnalise(false)}
          service={parcelleService}
          entityName="parcelles"
          colorScheme="blue"
        />
      )}
    </div>
  );
}

export default ParcelleList;
