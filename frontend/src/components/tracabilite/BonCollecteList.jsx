import { useState, useEffect } from 'react';
import { tracabiliteService } from '../../services/api';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/common/Pagination';
import TracabilityChainViewer from './TracabilityChainViewer';

function BonCollecteList() {
  const [bonsCollecte, setBonsCollecte] = useState([]);
  const [campagnes, setCampagnes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampagne, setSelectedCampagne] = useState('');
  const [selectedCertification, setSelectedCertification] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [traceChain, setTraceChain] = useState(null);

  useEffect(() => {
    fetchCampagnes();
    fetchBonsCollecte();
    fetchStatistics();
  }, [selectedCampagne, selectedCertification, searchTerm]);

  const fetchCampagnes = async () => {
    try {
      const response = await tracabiliteService.getCampagnes();
      setCampagnes(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement campagnes:', error);
    }
  };

  const fetchBonsCollecte = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCampagne) params.campagne = selectedCampagne;
      if (selectedCertification) params.certification = selectedCertification;
      if (searchTerm) params.search = searchTerm;

      const response = await tracabiliteService.getBonsCollecte(params);
      setBonsCollecte(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement bons de collecte:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = {};
      if (selectedCampagne) params.campagne = selectedCampagne;

      const response = await tracabiliteService.statistiquesBonsCollecte(params);
      setStats(response.data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleTrace = async (id) => {
    try {
      const response = await tracabiliteService.traceBonCollecte(id);
      setTraceChain(response.data.chain);
    } catch (error) {
      console.error('Erreur traçabilité:', error);
      alert('Erreur lors de la génération de la traçabilité');
    }
  };

  // Pagination
  const {
    currentPage,
    totalPages,
    firstItemIndex,
    lastItemIndex,
    goToPage,
  } = usePagination({
    totalItems: bonsCollecte.length,
    itemsPerPage: 10,
  });

  const paginatedBons = bonsCollecte.slice(firstItemIndex, lastItemIndex);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
            <Icon name={iconMap.bonCollecte} size="xl" />
            Bons de Collecte (FABC)
          </h1>
          <p className="text-gray-600">
            Gestion des factures producteur / bons de collecte
          </p>
        </div>

        <Link to="/tracabilite/bons-collecte/create">
          <Button variant="primary" icon="PlusIcon">
            Nouveau FABC
          </Button>
        </Link>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total FABC</p>
                <p className="text-3xl font-bold text-dark">{stats.total_bons}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <Icon name={iconMap.bonCollecte} size="xl" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Poids Total (kg)</p>
                <p className="text-3xl font-bold text-dark">{stats.poids_total_kg.toFixed(2)}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white">
                <Icon name="ScaleIcon" size="xl" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Montant Total (Ar)</p>
                <p className="text-2xl font-bold text-dark">
                  {new Intl.NumberFormat('fr-FR').format(stats.montant_total_ar)}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                <Icon name="CurrencyDollarIcon" size="xl" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Producteurs</p>
                <p className="text-3xl font-bold text-dark">{stats.nombre_producteurs}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center text-white">
                <Icon name="UsersIcon" size="xl" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="N° FABC, producteur..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            />
          </div>

          {/* Campagne */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campagne
            </label>
            <select
              value={selectedCampagne}
              onChange={(e) => setSelectedCampagne(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">Toutes les campagnes</option>
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
          </div>

          {/* Certification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certification
            </label>
            <select
              value={selectedCertification}
              onChange={(e) => setSelectedCertification(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">Toutes</option>
              <option value="g4g">G4G</option>
              <option value="bio">BIO</option>
              <option value="ra">RA</option>
              <option value="ffl">FFL</option>
              <option value="rauet">RAUBET</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-yellow border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      ) : bonsCollecte.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500">Aucun bon de collecte trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° FABC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producteur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poids (kg)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant (Ar)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certification</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedBons.map((bon) => (
                <tr key={bon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-dark">{bon.numero_fabc}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(bon.date_marche).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-dark">
                      {bon.producteur_info?.nom_complet || `#${bon.producteur}`}
                    </div>
                    {bon.producteur_info?.code && (
                      <div className="text-xs text-gray-500">{bon.producteur_info.code}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-dark">
                    {bon.poids_accepte} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {new Intl.NumberFormat('fr-FR').format(bon.montant_total_achat)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="info" size="sm">
                      {bon.certification}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleTrace(bon.id)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Traçabilité"
                    >
                      <Icon name="MagnifyingGlassIcon" size="md" />
                    </button>
                    <Link
                      to={`/tracabilite/bons-collecte/${bon.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Icon name="EyeIcon" size="md" />
                    </Link>
                    <Link
                      to={`/tracabilite/bons-collecte/${bon.id}/edit`}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      <Icon name="PencilIcon" size="md" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {paginatedBons.length} bon(s) affiché(s) sur {bonsCollecte.length} au total
            </p>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal de chaîne de traçabilité (réutilise le viewer existant) */}
      {traceChain && (
        <TracabilityChainViewer chain={traceChain} onClose={() => setTraceChain(null)} />
      )}
    </div>
  );
}

export default BonCollecteList;
