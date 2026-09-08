import { useState, useEffect } from 'react';
import { tracabiliteService } from '../../services/api';
import { Link } from 'react-router-dom';
import TracabilityChainViewer from './TracabilityChainViewer';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

function TracabilityDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    bons_collecte: 0,
    fiches_collecte: 0,
    bons_transport: 0,
    lots_traitement: 0,
    colis: 0,
    commandes_export: 0,
    poids_total: 0,
    montant_total: 0
  });
  const [campagnes, setCampagnes] = useState([]);
  const [selectedCampagne, setSelectedCampagne] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);
  const [showChainViewer, setShowChainViewer] = useState(false);
  const [selectedChain, setSelectedChain] = useState(null);
  const [showCampagneModal, setShowCampagneModal] = useState(false);
  const [newCampagneData, setNewCampagneData] = useState({
    code: '',
    annee_debut: new Date().getFullYear(),
    annee_fin: new Date().getFullYear() + 1,
    date_debut: '',
    date_fin: ''
  });

  const handleCreateCampagne = async (e) => {
    e.preventDefault();
    try {
      await tracabiliteService.createCampagne(newCampagneData);
      alert('✅ Campagne créée avec succès !');
      setShowCampagneModal(false);
      setNewCampagneData({
        code: '',
        annee_debut: new Date().getFullYear(),
        annee_fin: new Date().getFullYear() + 1,
        date_debut: '',
        date_fin: ''
      });
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Erreur création campagne:', error);
      if (error.response) {
        console.error('Détails erreur:', error.response.data);
        alert(`❌ Erreur: ${JSON.stringify(error.response.data)}`);
      } else {
        alert('❌ Erreur lors de la création de la campagne');
      }
    }
  };

  useEffect(() => {
    fetchData();
    // fetchData capture `selectedCampagne` à l'exécution ; on ne relance que
    // lorsque la campagne sélectionnée change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampagne]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        campagnesRes,
        bonsCollecteRes,
        fichesCollecteRes,
        bonsTransportRes,
        lotsTraitementRes,
        colisRes,
        commandesExportRes
      ] = await Promise.all([
        tracabiliteService.getCampagnes(),
        tracabiliteService.getBonsCollecte(selectedCampagne ? { campagne: selectedCampagne } : {}),
        tracabiliteService.getFichesCollecte(selectedCampagne ? { campagne: selectedCampagne } : {}),
        tracabiliteService.getBonsTransport(selectedCampagne ? { campagne: selectedCampagne } : {}),
        tracabiliteService.getLotsTraitement(),
        tracabiliteService.getColis(),
        tracabiliteService.getCommandesExport(selectedCampagne ? { campagne: selectedCampagne } : {})
      ]);

      setCampagnes(campagnesRes.data.results || campagnesRes.data);

      const bonsCollecte = bonsCollecteRes.data.results || bonsCollecteRes.data;
      const fichesCollecte = fichesCollecteRes.data.results || fichesCollecteRes.data;
      const bonsTransport = bonsTransportRes.data.results || bonsTransportRes.data;
      const lotsTraitement = lotsTraitementRes.data.results || lotsTraitementRes.data;
      const colis = colisRes.data.results || colisRes.data;
      const commandesExport = commandesExportRes.data.results || commandesExportRes.data;

      // Calcul des totaux
      const poidsTotal = bonsCollecte.reduce((sum, bc) => sum + parseFloat(bc.poids_accepte || 0), 0);
      const montantTotal = bonsCollecte.reduce((sum, bc) => sum + parseFloat(bc.montant_total_achat || 0), 0);

      setStats({
        bons_collecte: bonsCollecte.length,
        fiches_collecte: fichesCollecte.length,
        bons_transport: bonsTransport.length,
        lots_traitement: lotsTraitement.length,
        colis: colis.length,
        commandes_export: commandesExport.length,
        poids_total: poidsTotal,
        montant_total: montantTotal
      });

      // Activité récente (derniers bons de collecte)
      setRecentActivity(bonsCollecte.slice(0, 5));
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      alert('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChain = async (bonCollecteId) => {
    try {
      const response = await tracabiliteService.traceBonCollecte(bonCollecteId);
      setSelectedChain(response.data.chain);
      setShowChainViewer(true);
    } catch (error) {
      console.error('Erreur traçabilité:', error);
      alert('Erreur lors de la génération de la traçabilité');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-yellow border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark mb-2">
          Tableau de <span className="text-primary-yellow">Bord Traçabilité</span>
        </h1>
        <p className="text-gray-600">Vue d'ensemble des opérations de traçabilité</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex gap-4 w-full md:w-auto">
          <select
            value={selectedCampagne}
            onChange={(e) => setSelectedCampagne(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-chick-yellow"
          >
            <option value="">Toutes les campagnes</option>
            {campagnes.map((campagne) => (
              <option key={campagne.id} value={campagne.id}>
                {campagne.code} - {campagne.nom}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            icon="PlusIcon"
            onClick={() => setShowCampagneModal(true)}
          >
            Campagne
          </Button>
        </div>
        <Button
          variant="primary"
          icon="LinkIcon"
          onClick={() => setShowChainViewer(true)}
        >
          Chaîne de traçabilité
        </Button>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Bons de collecte */}
        <Link
          to="/tracabilite/bons-collecte"
          className="block hover:shadow-lg transition-shadow"
        >
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark">Bons de Collecte</h3>
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <Icon name={iconMap.bonCollecte} size="xl" />
              </div>
            </div>
            <p className="text-3xl font-bold text-dark mb-2">{stats.bons_collecte}</p>
            <p className="text-sm text-gray-600">FABC enregistrés</p>
          </Card>
        </Link>

        {/* Fiches de collecte */}
        <Link
          to="/tracabilite/fiches-collecte"
          className="block hover:shadow-lg transition-shadow"
        >
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark">Fiches de Collecte</h3>
              <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                <Icon name={iconMap.ficheCollecte} size="xl" />
              </div>
            </div>
            <p className="text-3xl font-bold text-dark mb-2">{stats.fiches_collecte}</p>
            <p className="text-sm text-gray-600">FC créées</p>
          </Card>
        </Link>

        {/* Bons de transport */}
        <Link
          to="/tracabilite/bons-transport"
          className="block hover:shadow-lg transition-shadow"
        >
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark">Bons de Transport</h3>
              <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center text-white">
                <Icon name={iconMap.bonTransport} size="xl" />
              </div>
            </div>
            <p className="text-3xl font-bold text-dark mb-2">{stats.bons_transport}</p>
            <p className="text-sm text-gray-600">BT en cours</p>
          </Card>
        </Link>

        {/* Commandes export */}
        <Link
          to="/tracabilite/commandes-export"
          className="block hover:shadow-lg transition-shadow"
        >
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark">Commandes Export</h3>
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white">
                <Icon name={iconMap.commandeExport} size="xl" />
              </div>
            </div>
            <p className="text-3xl font-bold text-dark mb-2">{stats.commandes_export}</p>
            <p className="text-sm text-gray-600">exports en cours</p>
          </Card>
        </Link>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card padding="md" className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-dark">Poids Total Collecté</h3>
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white">
              <Icon name="ScaleIcon" size="xl" />
            </div>
          </div>
          <p className="text-4xl font-bold text-green-600">
            {stats.poids_total.toFixed(2)} kg
          </p>
        </Card>

        <Card padding="md" className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-dark">Montant Total</h3>
            <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-white">
              <Icon name="CurrencyDollarIcon" size="xl" />
            </div>
          </div>
          <p className="text-4xl font-bold text-yellow-600">
            {new Intl.NumberFormat('fr-FR').format(stats.montant_total)} Ar
          </p>
        </Card>
      </div>

      {/* Flux de traçabilité */}
      <Card padding="md" className="mb-8 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-dark flex items-center gap-2">
            <Icon name="LinkIcon" size="lg" />
            Flux de Traçabilité
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChainViewer(true)}
          >
            Voir la chaîne complète
          </Button>
        </div>

        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {/* Étape 1 */}
          <div className="flex flex-col items-center min-w-[120px]">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white mb-3 shadow-md">
              <Icon name={iconMap.bonCollecte} size="xl" />
            </div>
            <p className="text-sm font-semibold text-dark text-center">Collecte</p>
            <p className="text-2xl font-bold text-blue-600">{stats.bons_collecte}</p>
          </div>

          <div className="flex-shrink-0 mx-4">
            <Icon name="ChevronRightIcon" size="xl" className="text-gray-400" />
          </div>

          {/* Étape 2 */}
          <div className="flex flex-col items-center min-w-[120px]">
            <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center text-white mb-3 shadow-md">
              <Icon name={iconMap.ficheCollecte} size="xl" />
            </div>
            <p className="text-sm font-semibold text-dark text-center">Regroupement</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.fiches_collecte}</p>
          </div>

          <div className="flex-shrink-0 mx-4">
            <Icon name="ChevronRightIcon" size="xl" className="text-gray-400" />
          </div>

          {/* Étape 3 */}
          <div className="flex flex-col items-center min-w-[120px]">
            <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center text-white mb-3 shadow-md">
              <Icon name={iconMap.bonTransport} size="xl" />
            </div>
            <p className="text-sm font-semibold text-dark text-center">Transport</p>
            <p className="text-2xl font-bold text-purple-600">{stats.bons_transport}</p>
          </div>

          <div className="flex-shrink-0 mx-4">
            <Icon name="ChevronRightIcon" size="xl" className="text-gray-400" />
          </div>

          {/* Étape 4 */}
          <div className="flex flex-col items-center min-w-[120px]">
            <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-white mb-3 shadow-md">
              <Icon name={iconMap.lotTraitement} size="xl" />
            </div>
            <p className="text-sm font-semibold text-dark text-center">Traitement</p>
            <p className="text-2xl font-bold text-orange-600">{stats.lots_traitement}</p>
          </div>

          <div className="flex-shrink-0 mx-4">
            <Icon name="ChevronRightIcon" size="xl" className="text-gray-400" />
          </div>

          {/* Étape 5 */}
          <div className="flex flex-col items-center min-w-[120px]">
            <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center text-white mb-3 shadow-md">
              <Icon name={iconMap.colis} size="xl" />
            </div>
            <p className="text-sm font-semibold text-dark text-center">Colis</p>
            <p className="text-2xl font-bold text-pink-600">{stats.colis}</p>
          </div>

          <div className="flex-shrink-0 mx-4">
            <Icon name="ChevronRightIcon" size="xl" className="text-gray-400" />
          </div>

          {/* Étape 6 */}
          <div className="flex flex-col items-center min-w-[120px]">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white mb-3 shadow-md">
              <Icon name={iconMap.commandeExport} size="xl" />
            </div>
            <p className="text-sm font-semibold text-dark text-center">Export</p>
            <p className="text-2xl font-bold text-red-600">{stats.commandes_export}</p>
          </div>
        </div>
      </Card>

      {/* Activité récente */}
      <Card padding="md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-dark flex items-center gap-2">
            <Icon name="ClockIcon" size="lg" />
            Activité Récente
          </h2>
          <Link
            to="/tracabilite/bons-collecte"
            className="text-primary-yellow hover:text-yellow-600 font-medium flex items-center gap-1"
          >
            Voir tout
            <Icon name="ChevronRightIcon" size="sm" />
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Aucune activité récente
          </p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((bon) => (
              <div
                key={bon.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Icon name={iconMap.bonCollecte} size="lg" className="text-blue-500" />
                    <div>
                      <p className="font-semibold text-dark">
                        FABC {bon.numero_fabc}
                      </p>
                      <p className="text-sm text-gray-600">
                        {bon.producteur_info?.nom_complet || `Producteur #${bon.producteur}`} • {bon.poids_accepte} kg
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(bon.date_marche).toLocaleDateString('fr-FR')}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon="MagnifyingGlassIcon"
                    onClick={() => handleViewChain(bon.id)}
                  >
                    Tracer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal de visualisation de la chaîne */}
      {showChainViewer && (
        <TracabilityChainViewer
          chain={selectedChain}
          onClose={() => {
            setShowChainViewer(false);
            setSelectedChain(null);
          }}
        />
      )}

      {/* Modal Nouvelle Campagne */}
      {showCampagneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-dark">Nouvelle Campagne</h2>
            <form onSubmit={handleCreateCampagne} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={newCampagneData.code}
                  onChange={(e) => setNewCampagneData({ ...newCampagneData, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: 2024-2025"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année début</label>
                  <input
                    type="number"
                    required
                    value={newCampagneData.annee_debut}
                    onChange={(e) => setNewCampagneData({ ...newCampagneData, annee_debut: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année fin</label>
                  <input
                    type="number"
                    required
                    value={newCampagneData.annee_fin}
                    onChange={(e) => setNewCampagneData({ ...newCampagneData, annee_fin: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                <input
                  type="date"
                  required
                  value={newCampagneData.date_debut}
                  onChange={(e) => setNewCampagneData({ ...newCampagneData, date_debut: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                <input
                  type="date"
                  required
                  value={newCampagneData.date_fin}
                  onChange={(e) => setNewCampagneData({ ...newCampagneData, date_fin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCampagneModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Créer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TracabilityDashboard;
