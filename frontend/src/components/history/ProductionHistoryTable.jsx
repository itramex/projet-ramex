import { useState, useEffect, useRef } from 'react';
import { historyService } from '../../services/api';
import SearchableSelect from '../common/SearchableSelect';
import { CanCreate, CanUpdate, CanDelete } from '../common/PermissionWrapper';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import ProductionHistoryForm from './ProductionHistoryForm';

function ProductionHistoryTable() {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    annee: [],
    parcelle: [],
    culture: [],
  });
  const [sortConfig, setSortConfig] = useState({ key: 'annee', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [parcelles, setParcelles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState(null);

  // Refs pour la synchronisation des barres de défilement
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [tableWidth, setTableWidth] = useState(0);

  useEffect(() => {
    loadProductions();
    loadParcelles();
  }, [filters, page, sortConfig]);

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
  }, [productions]);

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
  }, [tableWidth]);

  const loadProductions = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        ordering: sortConfig.direction === 'desc' ? `-${sortConfig.key}` : sortConfig.key,
      };
      
      if (filters.annee && filters.annee.length > 0) params.annee = filters.annee.join(',');
      if (filters.parcelle && filters.parcelle.length > 0) params.parcelle = filters.parcelle.join(',');
      if (filters.culture && filters.culture.length > 0) params.culture = filters.culture.join(',');

      const response = await historyService.getProductionHistory(params);
      setProductions(response.data.results || response.data);
      setTotalPages(Math.ceil((response.data.count || response.data.length) / 50));
    } catch (error) {
      console.error('Erreur chargement productions:', error);
    }
    setLoading(false);
  };

  const loadParcelles = async () => {
    try {
      const response = await historyService.getParcelles();
      setParcelles(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement parcelles:', error);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDelete = async (production) => {
    if (window.confirm(`Supprimer la production de ${production.culture} pour l'année ${production.annee} ?`)) {
      try {
        await historyService.deleteProductionHistory(production.id);
        loadProductions();
      } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleEdit = (production) => {
    setSelectedProduction(production);
    setShowForm(true);
  };

  const handleAdd = () => {
    setSelectedProduction(null);
    setShowForm(true);
  };

  const calculateVariation = (production) => {
    // Cette fonction sera améliorée quand on aura les données de l'année précédente
    return production.variation_pourcentage || null;
  };

  const renderVariation = (variation) => {
    if (variation === null || variation === undefined) return '-';
    
    const isPositive = variation > 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const icon = isPositive ? 'ArrowUpIcon' : 'ArrowDownIcon';
    
    return (
      <div className={`flex items-center gap-1 ${color} font-semibold`}>
        <Icon name={icon} size="sm" />
        <span>{Math.abs(variation).toFixed(1)}%</span>
      </div>
    );
  };

  const filteredProductions = productions.filter(prod =>
    prod.parcelle_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prod.culture?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Options pour les filtres
  const anneeOptions = [...new Set(productions.map(p => p.annee))]
    .sort((a, b) => b - a)
    .map(a => ({ value: a, label: a.toString() }));

  const parcelleOptions = parcelles.map(p => ({
    value: p.id,
    label: `${p.code_parcelle} - ${p.producteur_nom}`
  }));

  const cultureOptions = [...new Set(productions.map(p => p.culture).filter(Boolean))]
    .map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({ annee: [], parcelle: [], culture: [] });
  };

  const activeFiltersCount = [
    searchTerm,
    filters.annee && filters.annee.length > 0,
    filters.parcelle && filters.parcelle.length > 0,
    filters.culture && filters.culture.length > 0,
  ].filter(Boolean).length;

  if (loading && productions.length === 0) {
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
          <h2 className="text-2xl font-bold text-dark flex items-center gap-3">
            <Icon name="ChartBarIcon" size="xl" className="text-primary-yellow" />
            Historique des Productions
          </h2>
          <p className="text-gray-600 mt-1">{productions.length} enregistrement(s)</p>
        </div>
        <CanCreate>
          <Button
            onClick={handleAdd}
            variant="primary"
            icon="PlusIcon"
          >
            Ajouter production
          </Button>
        </CanCreate>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Icon name="MagnifyingGlassIcon" size="md" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            />
          </div>

          <SearchableSelect
            options={anneeOptions}
            value={filters.annee}
            onChange={(value) => setFilters(prev => ({ ...prev, annee: value }))}
            placeholder="Toutes les années"
            displayKey="label"
            valueKey="value"
            multiple={true}
          />

          <SearchableSelect
            options={parcelleOptions}
            value={filters.parcelle}
            onChange={(value) => setFilters(prev => ({ ...prev, parcelle: value }))}
            placeholder="Toutes les parcelles"
            displayKey="label"
            valueKey="value"
            multiple={true}
          />

          <SearchableSelect
            options={cultureOptions}
            value={filters.culture}
            onChange={(value) => setFilters(prev => ({ ...prev, culture: value }))}
            placeholder="Toutes les cultures"
            displayKey="label"
            valueKey="value"
            multiple={true}
          />
        </div>

        {activeFiltersCount > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {activeFiltersCount} filtre(s) actif(s)
            </div>
            <Button
              onClick={resetFilters}
              variant="ghost"
              size="sm"
              icon="XMarkIcon"
            >
              Réinitialiser
            </Button>
          </div>
        )}
      </div>

      {/* Tableau */}
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
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('annee')}
                >
                  <div className="flex items-center gap-2">
                    Année
                    {sortConfig.key === 'annee' && (
                      <Icon name={sortConfig.direction === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} size="sm" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Parcelle
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Culture
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('quantite_kg')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Quantité (kg)
                    {sortConfig.key === 'quantite_kg' && (
                      <Icon name={sortConfig.direction === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} size="sm" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Prix (Ar/kg)
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Revenu Total (Ar)
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Variation (%)
                </th>
                <th scope="col" className="sticky right-0 bg-gray-100 px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProductions.length > 0 ? (
                filteredProductions.map((production, index) => (
                  <tr key={production.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-primary-yellow">{production.annee}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{production.parcelle_code}</div>
                      <div className="text-xs text-gray-500">{production.producteur_nom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="success" size="sm">
                        {production.culture?.charAt(0).toUpperCase() + production.culture?.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {production.quantite_kg?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {production.prix_vente_kg ? production.prix_vente_kg.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                      {production.revenu_total ? production.revenu_total.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {renderVariation(calculateVariation(production))}
                    </td>
                    <td className="sticky right-0 bg-inherit px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      <div className="flex justify-end gap-2">
                        <CanUpdate>
                          <Button
                            onClick={() => handleEdit(production)}
                            variant="ghost"
                            size="sm"
                            icon="PencilIcon"
                            className="text-gray-600 hover:text-gray-900"
                            title="Modifier"
                          />
                        </CanUpdate>
                        <CanDelete>
                          <Button
                            onClick={() => handleDelete(production)}
                            variant="ghost"
                            size="sm"
                            icon="TrashIcon"
                            className="text-red-600 hover:text-red-900 hover:bg-red-50"
                            title="Supprimer"
                          />
                        </CanDelete>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <Icon name="InboxIcon" size="xl" className="mx-auto mb-2 text-gray-400" />
                    <p>Aucune production trouvée</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {page} sur {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="secondary"
                size="sm"
                icon="ChevronLeftIcon"
              >
                Précédent
              </Button>
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="secondary"
                size="sm"
                icon="ChevronRightIcon"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ProductionHistoryForm
            mode={selectedProduction ? 'edit' : 'create'}
            initialData={selectedProduction}
            onSuccess={() => {
              setShowForm(false);
              setSelectedProduction(null);
              loadProductions();
            }}
            onCancel={() => {
              setShowForm(false);
              setSelectedProduction(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ProductionHistoryTable;
