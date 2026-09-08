import { useState, useEffect, useRef } from 'react';
import { historyService, producteurService } from '../../services/api';
import SearchableSelect from '../common/SearchableSelect';
import { CanCreate, CanUpdate, CanDelete } from '../common/PermissionWrapper';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import SocialIndicatorForm from './SocialIndicatorForm';

function SocialIndicatorTable() {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    annee: [],
    producteur: [],
    type_indicateur: [],
  });
  const [sortConfig, setSortConfig] = useState({ key: 'annee', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [producteurs, setProducteurs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState(null);

  // Refs pour la synchronisation des barres de défilement
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [tableWidth, setTableWidth] = useState(0);

  // Types d'indicateurs disponibles
  const INDICATOR_TYPES = {
    scolarisation: 'Taux de scolarisation',
    eau_potable: 'Accès eau potable',
    sante: 'Accès aux soins',
    habitat: 'Type de logement',
    energie: 'Accès à l\'énergie',
  };

  useEffect(() => {
    loadIndicators();
    loadProducteurs();
    // Les loaders capturent `filters` à l'exécution ; on ne relance que
    // lorsqu'une page ou un tri change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [indicators]);

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

  const loadIndicators = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        ordering: sortConfig.direction === 'desc' ? `-${sortConfig.key}` : sortConfig.key,
      };
      
      if (filters.annee && filters.annee.length > 0) params.annee = filters.annee.join(',');
      if (filters.producteur && filters.producteur.length > 0) params.producteur = filters.producteur.join(',');
      if (filters.type_indicateur && filters.type_indicateur.length > 0) params.type_indicateur = filters.type_indicateur.join(',');

      const response = await historyService.getSocialIndicatorHistory(params);
      setIndicators(response.data.results || response.data);
      setTotalPages(Math.ceil((response.data.count || response.data.length) / 50));
    } catch (error) {
      console.error('Erreur chargement indicateurs:', error);
    }
    setLoading(false);
  };

  const loadProducteurs = async () => {
    try {
      const response = await producteurService.getAllForDropdown();
      setProducteurs(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement producteurs:', error);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDelete = async (indicator) => {
    if (window.confirm(`Supprimer l'indicateur ${INDICATOR_TYPES[indicator.type_indicateur]} de ${indicator.producteur_nom} pour l'année ${indicator.annee} ?`)) {
      try {
        await historyService.deleteSocialIndicatorHistory(indicator.id);
        loadIndicators();
      } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleEdit = (indicator) => {
    setSelectedIndicator(indicator);
    setShowForm(true);
  };

  const handleAdd = () => {
    setSelectedIndicator(null);
    setShowForm(true);
  };

  // Fonction pour afficher la valeur selon le type
  const renderValue = (indicator) => {
    // Si valeur manquante
    if (indicator.valeur_numerique === null && 
        indicator.valeur_texte === null && 
        indicator.valeur_booleen === null) {
      return (
        <div className="flex items-center gap-2 text-gray-400">
          <Icon name="ExclamationTriangleIcon" size="sm" />
          <span className="italic">Non renseigné</span>
        </div>
      );
    }

    // Valeur booléenne
    if (indicator.valeur_booleen !== null) {
      return (
        <div className="flex items-center gap-2">
          {indicator.valeur_booleen ? (
            <>
              <Icon name="CheckCircleIcon" size="md" className="text-green-600" />
              <span className="text-green-700 font-semibold">Oui</span>
            </>
          ) : (
            <>
              <Icon name="XCircleIcon" size="md" className="text-red-600" />
              <span className="text-red-700 font-semibold">Non</span>
            </>
          )}
        </div>
      );
    }

    // Valeur numérique
    if (indicator.valeur_numerique !== null) {
      return (
        <span className="text-sm font-semibold text-gray-900">
          {indicator.valeur_numerique.toLocaleString('fr-FR', { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 2 
          })}
          {indicator.type_indicateur === 'scolarisation' && '%'}
        </span>
      );
    }

    // Valeur texte
    if (indicator.valeur_texte) {
      return (
        <Badge variant="info" size="sm">
          {indicator.valeur_texte}
        </Badge>
      );
    }

    return '-';
  };

  const filteredIndicators = indicators.filter(ind =>
    ind.producteur_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ind.type_indicateur?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Options pour les filtres
  const anneeOptions = [...new Set(indicators.map(i => i.annee))]
    .sort((a, b) => b - a)
    .map(a => ({ value: a, label: a.toString() }));

  const producteurOptions = producteurs.map(p => ({
    value: p.id,
    label: `${p.code_producteur} - ${p.nom} ${p.prenom}`
  }));

  const typeIndicateurOptions = Object.entries(INDICATOR_TYPES).map(([key, label]) => ({
    value: key,
    label: label
  }));

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({ annee: [], producteur: [], type_indicateur: [] });
  };

  const activeFiltersCount = [
    searchTerm,
    filters.annee && filters.annee.length > 0,
    filters.producteur && filters.producteur.length > 0,
    filters.type_indicateur && filters.type_indicateur.length > 0,
  ].filter(Boolean).length;

  if (loading && indicators.length === 0) {
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
            <Icon name="UserGroupIcon" size="xl" className="text-primary-yellow" />
            Historique des Indicateurs Sociaux
          </h2>
          <p className="text-gray-600 mt-1">{indicators.length} enregistrement(s)</p>
        </div>
        <CanCreate>
          <Button
            onClick={handleAdd}
            variant="primary"
            icon="PlusIcon"
          >
            Ajouter indicateur
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
            options={producteurOptions}
            value={filters.producteur}
            onChange={(value) => setFilters(prev => ({ ...prev, producteur: value }))}
            placeholder="Tous les producteurs"
            displayKey="label"
            valueKey="value"
            multiple={true}
          />

          <SearchableSelect
            options={typeIndicateurOptions}
            value={filters.type_indicateur}
            onChange={(value) => setFilters(prev => ({ ...prev, type_indicateur: value }))}
            placeholder="Tous les indicateurs"
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
                  Producteur
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('type_indicateur')}
                >
                  <div className="flex items-center gap-2">
                    Type d'indicateur
                    {sortConfig.key === 'type_indicateur' && (
                      <Icon name={sortConfig.direction === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} size="sm" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Valeur
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Notes
                </th>
                <th scope="col" className="sticky right-0 bg-gray-100 px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIndicators.length > 0 ? (
                filteredIndicators.map((indicator, index) => (
                  <tr key={indicator.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-primary-yellow">{indicator.annee}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{indicator.producteur_code}</div>
                      <div className="text-xs text-gray-500">{indicator.producteur_nom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="primary" size="sm">
                        {INDICATOR_TYPES[indicator.type_indicateur] || indicator.type_indicateur}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderValue(indicator)}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      {indicator.notes ? (
                        <div className="text-sm text-gray-600 truncate" title={indicator.notes}>
                          {indicator.notes}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">-</span>
                      )}
                    </td>
                    <td className="sticky right-0 bg-inherit px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      <div className="flex justify-end gap-2">
                        <CanUpdate>
                          <Button
                            onClick={() => handleEdit(indicator)}
                            variant="ghost"
                            size="sm"
                            icon="PencilIcon"
                            className="text-gray-600 hover:text-gray-900"
                            title="Modifier"
                          />
                        </CanUpdate>
                        <CanDelete>
                          <Button
                            onClick={() => handleDelete(indicator)}
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
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Icon name="InboxIcon" size="xl" className="mx-auto mb-2 text-gray-400" />
                    <p>Aucun indicateur trouvé</p>
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
          <SocialIndicatorForm
            mode={selectedIndicator ? 'edit' : 'create'}
            initialData={selectedIndicator}
            onSuccess={() => {
              setShowForm(false);
              setSelectedIndicator(null);
              loadIndicators();
            }}
            onCancel={() => {
              setShowForm(false);
              setSelectedIndicator(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default SocialIndicatorTable;
