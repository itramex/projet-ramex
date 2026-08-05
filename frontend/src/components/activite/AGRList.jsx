import { useState, useEffect } from 'react';
import Card from '../common/Card';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/common/Pagination';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { agrService } from '../../services/api';

function AGRList({ producteurId, onAddClick, onEditClick }) {
  const [agrs, setAgrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('ordre'); // 'ordre' or 'revenu'

  useEffect(() => {
    if (producteurId) {
      loadAGRs();
    }
  }, [producteurId]);

  const loadAGRs = async () => {
    setLoading(true);
    try {
      const response = await agrService.getByProducteur(producteurId);
      setAgrs(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement AGR:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (agrId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette AGR ?')) {
      try {
        await agrService.delete(agrId);
        loadAGRs();
      } catch (error) {
        console.error('Erreur suppression AGR:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  // Filter AGRs by type
  const filteredAGRs = filterType
    ? agrs.filter(agr => agr.type_agr === filterType)
    : agrs;

  // Sort AGRs
  const sortedAGRs = [...filteredAGRs].sort((a, b) => {
    if (sortBy === 'revenu') {
      const revenueA = parseFloat(a.revenu_annuel_estime || 0);
      const revenueB = parseFloat(b.revenu_annuel_estime || 0);
      return revenueB - revenueA; // Descending order
    }
    return a.ordre - b.ordre; // Default: sort by ordre
  });

  // Pagination
  const {
    currentPage,
    totalPages,
    firstItemIndex,
    lastItemIndex,
    goToPage,
    nextPage,
    prevPage,
  } = usePagination({
    totalItems: sortedAGRs.length,
    itemsPerPage: 5,
  });

  const paginatedAGRs = sortedAGRs.slice(firstItemIndex, lastItemIndex);

  // Calculate total revenue
  const totalRevenue = agrs.reduce((sum, agr) => {
    return sum + parseFloat(agr.revenu_annuel_estime || 0);
  }, 0);

  // Format currency (Ariary)
  const formatCurrency = (value) => {
    if (!value) return '0 Ar';
    return new Intl.NumberFormat('fr-MG', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' Ar';
  };

  // Get icon for AGR type
  const getAGRIcon = (type) => {
    switch (type) {
      case 'pisciculture':
        return 'BeakerIcon'; // Fish/water related
      case 'aviculture':
        return 'SparklesIcon'; // Bird/poultry related
      default:
        return 'CurrencyDollarIcon';
    }
  };

  // Get unique AGR types for filter
  const agrTypes = [...new Set(agrs.map(agr => agr.type_agr))];

  if (loading) {
    return (
      <Card title="Activités Génératrices de Revenus (AGR)">
        <div className="flex justify-center items-center py-8">
          <Icon name="ArrowPathIcon" size="lg" className="animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Chargement...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Activités Génératrices de Revenus (AGR)"
      icon="CurrencyDollarIcon"
      actions={
        <Button
          onClick={onAddClick}
          variant="primary"
          size="sm"
          icon="PlusIcon"
        >
          Ajouter AGR
        </Button>
      }
    >
      {/* Filters and Sort */}
      {agrs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          {/* Filter by type */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Tous</option>
              {agrTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort by */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Trier par:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="ordre">Ordre</option>
              <option value="revenu">Revenu</option>
            </select>
          </div>

          {/* Count badge */}
          <Badge variant="info" size="sm">
            {filteredAGRs.length} AGR{filteredAGRs.length > 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* AGR Table */}
      {sortedAGRs.length === 0 ? (
        <div className="text-center py-8">
          <Icon name="InformationCircleIcon" size="lg" className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600">
            {filterType ? 'Aucune AGR de ce type' : 'Aucune AGR enregistrée'}
          </p>
          {!filterType && (
            <Button
              onClick={onAddClick}
              variant="secondary"
              size="sm"
              icon="PlusIcon"
              className="mt-4"
            >
              Ajouter la première AGR
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Intrants
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisation
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qté Consommée
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qté Vendue
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Unitaire
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenu Annuel
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAGRs.map((agr) => (
                <tr key={agr.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Icon name={getAGRIcon(agr.type_agr)} size="sm" className="text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {agr.type_agr_display || agr.type_agr}
                        </div>
                        <div className="text-xs text-gray-500">
                          AGR {agr.ordre}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {agr.intrants_recus ? (
                      <div>
                        <Badge variant="success" size="sm" icon="CheckIcon">
                          Oui
                        </Badge>
                        {agr.quantite_intrants && (
                          <div className="text-xs text-gray-600 mt-1">
                            Qté: {agr.quantite_intrants}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Non
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge
                      variant={
                        agr.utilisation === 'vente' ? 'info' :
                        agr.utilisation === 'consommation' ? 'warning' :
                        'neutral'
                      }
                      size="sm"
                    >
                      {agr.utilisation_display || agr.utilisation || '-'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    {agr.quantite_consommee_annuelle ? (
                      <div>
                        <div>{parseFloat(agr.quantite_consommee_annuelle).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{agr.unite_mesure}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    {agr.quantite_vendue_annuelle ? (
                      <div>
                        <div>{parseFloat(agr.quantite_vendue_annuelle).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{agr.unite_mesure}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    {agr.prix_vente_unitaire ? formatCurrency(agr.prix_vente_unitaire) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(agr.revenu_annuel_estime)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEditClick(agr)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Modifier"
                      >
                        <Icon name="PencilIcon" size="sm" />
                      </button>
                      <button
                        onClick={() => handleDelete(agr.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Supprimer"
                      >
                        <Icon name="TrashIcon" size="sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Total Revenue Row */}
              {sortedAGRs.length > 0 && (
                <tr className="bg-yellow-50 font-semibold">
                  <td colSpan="6" className="px-4 py-3 text-right text-sm text-gray-900">
                    Revenu Total AGR:
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-base font-bold text-green-700">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
          {sortedAGRs.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Additional Info */}
      {sortedAGRs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pisciculture info */}
            {sortedAGRs.some(agr => agr.type_agr === 'pisciculture' && agr.nombre_bassins) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="BeakerIcon" size="sm" className="text-blue-600" />
                <span>
                  Bassins: {sortedAGRs.find(agr => agr.type_agr === 'pisciculture')?.nombre_bassins || 0}
                </span>
              </div>
            )}

            {/* Aviculture info */}
            {sortedAGRs.some(agr => agr.type_agr === 'aviculture' && agr.nombre_volailles) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="SparklesIcon" size="sm" className="text-orange-600" />
                <span>
                  Volailles: {sortedAGRs.find(agr => agr.type_agr === 'aviculture')?.nombre_volailles || 0}
                </span>
              </div>
            )}

            {/* Last update */}
            {sortedAGRs.length > 0 && sortedAGRs[0].date_modification && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="ClockIcon" size="sm" className="text-gray-400" />
                <span>
                  Mis à jour: {new Date(sortedAGRs[0].date_modification).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default AGRList;
