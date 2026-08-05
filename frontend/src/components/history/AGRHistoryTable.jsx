import React, { useState, useEffect, useRef } from 'react';
import { historyService, producteurService } from '../../services/api';
import SearchableSelect from '../common/SearchableSelect';
import { CanCreate, CanUpdate, CanDelete } from '../common/PermissionWrapper';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import AGRHistoryForm from './AGRHistoryForm';

function AGRHistoryTable() {
  const [agrHistory, setAgrHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    annee: [],
    producteur: [],
    type_agr: [],
  });
  const [sortConfig, setSortConfig] = useState({ key: 'annee', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [producteurs, setProducteurs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedAGR, setSelectedAGR] = useState(null);
  const [yearTotals, setYearTotals] = useState({});

  // Refs pour la synchronisation des barres de défilement
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [tableWidth, setTableWidth] = useState(0);

  useEffect(() => {
    loadAGRHistory();
    loadProducteurs();
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
  }, [agrHistory]);

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

  const loadAGRHistory = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        ordering: sortConfig.direction === 'desc' ? `-${sortConfig.key}` : sortConfig.key,
      };
      
      if (filters.annee && filters.annee.length > 0) params.annee = filters.annee.join(',');
      if (filters.producteur && filters.producteur.length > 0) params.producteur = filters.producteur.join(',');
      if (filters.type_agr && filters.type_agr.length > 0) params.type_agr = filters.type_agr.join(',');

      const response = await historyService.getAGRHistory(params);
      const data = response.data.results || response.data;
      setAgrHistory(data);
      setTotalPages(Math.ceil((response.data.count || data.length) / 50));
      
      // Calculer les totaux par année
      calculateYearTotals(data);
    } catch (error) {
      console.error('Erreur chargement AGR:', error);
    }
    setLoading(false);
  };

  const calculateYearTotals = (data) => {
    const totals = {};
    data.forEach(agr => {
      if (!totals[agr.annee]) {
        totals[agr.annee] = {
          revenu_total: 0,
          count: 0
        };
      }
      totals[agr.annee].revenu_total += parseFloat(agr.revenu_annuel || 0);
      totals[agr.annee].count += 1;
    });
    setYearTotals(totals);
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

  const handleDelete = async (agr) => {
    if (window.confirm(`Supprimer l'AGR ${agr.type_agr} de ${agr.producteur_nom} pour l'année ${agr.annee} ?`)) {
      try {
        await historyService.deleteAGRHistory(agr.id);
        loadAGRHistory();
      } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleEdit = (agr) => {
    setSelectedAGR(agr);
    setShowForm(true);
  };

  const handleAdd = () => {
    setSelectedAGR(null);
    setShowForm(true);
  };

  const filteredAGRHistory = agrHistory.filter(agr =>
    agr.producteur_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agr.type_agr?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Options pour les filtres
  const anneeOptions = [...new Set(agrHistory.map(a => a.annee))]
    .sort((a, b) => b - a)
    .map(a => ({ value: a, label: a.toString() }));

  const producteurOptions = producteurs.map(p => ({
    value: p.id,
    label: `${p.code_producteur} - ${p.nom} ${p.prenom}`
  }));

  const typeAGROptions = [...new Set(agrHistory.map(a => a.type_agr).filter(Boolean))]
    .map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({ annee: [], producteur: [], type_agr: [] });
  };

  const activeFiltersCount = [
    searchTerm,
    filters.annee && filters.annee.length > 0,
    filters.producteur && filters.producteur.length > 0,
    filters.type_agr && filters.type_agr.length > 0,
  ].filter(Boolean).length;

  // Grouper par année pour afficher les totaux
  const groupedByYear = filteredAGRHistory.reduce((acc, agr) => {
    if (!acc[agr.annee]) {
      acc[agr.annee] = [];
    }
    acc[agr.annee].push(agr);
    return acc;
  }, {});

  const years = Object.keys(groupedByYear).sort((a, b) => b - a);

  if (loading && agrHistory.length === 0) {
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
            <Icon name="CurrencyDollarIcon" size="xl" className="text-primary-yellow" />
            Historique des Revenus AGR
          </h2>
          <p className="text-gray-600 mt-1">{agrHistory.length} enregistrement(s)</p>
        </div>
        <CanCreate>
          <Button
            onClick={handleAdd}
            variant="primary"
            icon="PlusIcon"
          >
            Ajouter AGR
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
            options={typeAGROptions}
            value={filters.type_agr}
            onChange={(value) => setFilters(prev => ({ ...prev, type_agr: value }))}
            placeholder="Tous les types d'AGR"
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Type AGR
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('ordre')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Ordre
                    {sortConfig.key === 'ordre' && (
                      <Icon name={sortConfig.direction === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} size="sm" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Qté Produite
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Qté Vendue
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Prix Unitaire (Ar)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('revenu_annuel')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Revenu Annuel (Ar)
                    {sortConfig.key === 'revenu_annuel' && (
                      <Icon name={sortConfig.direction === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} size="sm" />
                    )}
                  </div>
                </th>
                <th scope="col" className="sticky right-0 bg-gray-100 px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAGRHistory.length > 0 ? (
                <>
                  {years.map((year) => (
                    <React.Fragment key={year}>
                      {groupedByYear[year].map((agr, index) => (
                        <tr key={agr.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-primary-yellow">{agr.annee}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{agr.producteur_code}</div>
                            <div className="text-xs text-gray-500">{agr.producteur_nom}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="info" size="sm">
                              {agr.type_agr?.charAt(0).toUpperCase() + agr.type_agr?.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Badge variant="secondary" size="sm">
                              AGR {agr.ordre}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {agr.quantite_produite ? agr.quantite_produite.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {agr.quantite_vendue ? agr.quantite_vendue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {agr.prix_vente_unitaire ? agr.prix_vente_unitaire.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                            {agr.revenu_annuel ? agr.revenu_annuel.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) : '-'}
                          </td>
                          <td className="sticky right-0 bg-inherit px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-end gap-2">
                              <CanUpdate>
                                <Button
                                  onClick={() => handleEdit(agr)}
                                  variant="ghost"
                                  size="sm"
                                  icon="PencilIcon"
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Modifier"
                                />
                              </CanUpdate>
                              <CanDelete>
                                <Button
                                  onClick={() => handleDelete(agr)}
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
                      ))}
                      {/* Ligne de total par année */}
                      <tr className="bg-primary-yellow bg-opacity-10 font-bold border-t-2 border-primary-yellow">
                        <td colSpan="7" className="px-6 py-3 text-right text-sm text-gray-900">
                          Total {year} ({yearTotals[year]?.count || 0} AGR)
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-green-700">
                          {yearTotals[year]?.revenu_total.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} Ar
                        </td>
                        <td className="sticky right-0 bg-primary-yellow bg-opacity-10 px-6 py-3"></td>
                      </tr>
                    </React.Fragment>
                  ))}
                </>
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    <Icon name="InboxIcon" size="xl" className="mx-auto mb-2 text-gray-400" />
                    <p>Aucun AGR trouvé</p>
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
          <AGRHistoryForm
            mode={selectedAGR ? 'edit' : 'create'}
            initialData={selectedAGR}
            onSuccess={() => {
              setShowForm(false);
              setSelectedAGR(null);
              loadAGRHistory();
            }}
            onCancel={() => {
              setShowForm(false);
              setSelectedAGR(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default AGRHistoryTable;
