import { useEffect, useMemo, useState } from 'react';
import { tracabiliteService } from '../../services/api';
import Icon from '../common/Icon';
import TracabilityChainViewer from './TracabilityChainViewer';

const ETAPES_LABELS = ['FABC', 'FC', 'BT', 'Lot', 'Colis', 'Commande'];

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Liste de toutes les chaînes de traçabilité enregistrées
 * (chaque traçage via le viewer est désormais persisté côté backend).
 */
function ChainsTracabilite() {
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Viewer
  const [viewChain, setViewChain] = useState(null);
  const [viewLoadingId, setViewLoadingId] = useState(null);

  const loadChains = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.type = typeFilter;
      const res = await tracabiliteService.getChainsTracabilite(params);
      setChains(res.data.results || res.data || []);
    } catch (err) {
      console.error('Erreur chargement chaînes:', err);
      setError('Erreur lors du chargement des chaînes de traçabilité.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadChains, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter]);

  const openChain = async (id) => {
    setViewLoadingId(id);
    try {
      const res = await tracabiliteService.getChainTracabilite(id);
      const data = res.data || {};
      const chainData = data.chain_data || {};
      if (!chainData.type) chainData.type = data.type_tracabilite;
      setViewChain(chainData);
    } catch (err) {
      console.error('Erreur ouverture chaîne:', err);
      setError("Impossible de charger le détail de la chaîne.");
    } finally {
      setViewLoadingId(null);
    }
  };

  const stats = useMemo(() => {
    const ascendantes = chains.filter((c) => c.type_tracabilite === 'ascendante').length;
    const descendantes = chains.filter((c) => c.type_tracabilite === 'descendante').length;
    const completes = chains.filter((c) => (c.nb_etapes || 0) >= 6).length;
    return { total: chains.length, ascendantes, descendantes, completes };
  }, [chains]);

  const etapeBadge = (n) => {
    const niveau = (n || 0) >= 6 ? 'bg-green-100 text-green-800' : (n || 0) >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${niveau}`}>
        {n || 0}/6 étapes
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Icon name="chaine" size="lg" className="text-primary-yellow" />
            Chaînes de Traçabilité
          </h1>
          <p className="text-gray-600 mt-1">
            Historique des chaînes enregistrées (chaque traçage est conservé ici)
          </p>
        </div>
        <button
          onClick={loadChains}
          disabled={loading}
          className="px-4 py-2 bg-primary-yellow text-dark rounded-lg font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50"
        >
          Actualiser
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500 uppercase">Total chaînes</p>
          <p className="text-2xl font-bold text-dark">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500 uppercase">Ascendantes</p>
          <p className="text-2xl font-bold text-blue-600">{stats.ascendantes}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500 uppercase">Descendantes</p>
          <p className="text-2xl font-bold text-purple-600">{stats.descendantes}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500 uppercase">Complètes (6/6)</p>
          <p className="text-2xl font-bold text-green-600">{stats.completes}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-56">
          <Icon name="search" size="sm" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par producteur, code ou UUID…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-yellow"
        >
          <option value="">Tous les types</option>
          <option value="ascendante">Ascendante (producteur → export)</option>
          <option value="descendante">Descendante (export → producteur)</option>
        </select>
      </div>



      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FABC</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producteur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colis</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commande</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poids (kg)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avancement</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="9" className="px-4 py-10 text-center text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow" />
                </td>
              </tr>
            ) : chains.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-10 text-center text-gray-500">
                  Aucune chaîne enregistrée pour le moment.
                  <br />
                  <span className="text-sm">
                    Tracez un bon de collecte ou une commande d'export depuis le{' '}
                    <strong>Dashboard Traçabilité</strong> : la chaîne sera conservée ici.
                  </span>
                </td>
              </tr>
            ) : (
              chains.map((c) => (
                <tr key={c.id} className="hover:bg-amber-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(c.date_creation)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.type_tracabilite === 'ascendante'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {c.type_tracabilite === 'ascendante' ? '↑ Ascendante' : '↓ Descendante'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-dark">{c.numero_fabc || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {c.producteur_nom || '-'}
                    {c.producteur_code && <span className="text-gray-400 text-xs"> ({c.producteur_code})</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.numero_colis || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.numero_commande || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.poids_kg != null ? Number(c.poids_kg).toLocaleString('fr-FR') : '-'}
                  </td>
                  <td className="px-4 py-3">{etapeBadge(c.nb_etapes)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openChain(c.id)}
                      disabled={viewLoadingId === c.id}
                      className="text-primary-yellow hover:text-yellow-600 font-medium text-sm disabled:opacity-50"
                    >
                      {viewLoadingId === c.id ? 'Chargement…' : 'Voir la chaîne'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Viewer de chaîne (réutilisé) */}
      {viewChain && (
        <TracabilityChainViewer chain={viewChain} onClose={() => setViewChain(null)} />
      )}
    </div>
  );
}

export default ChainsTracabilite;
