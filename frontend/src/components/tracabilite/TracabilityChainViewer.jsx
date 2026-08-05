import { useState, useEffect } from 'react';
import { tracabiliteService } from '../../services/api';

function TracabilityChainViewer({ chain, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchType, setSearchType] = useState('fabc');
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadedChain, setLoadedChain] = useState(chain);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoadedChain(chain);
  }, [chain]);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Veuillez entrer une valeur de recherche');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let response;
      
      if (searchType === 'fabc') {
        // Rechercher par numéro FABC
        const bonsRes = await tracabiliteService.getBonsCollecte({ search: searchValue });
        const bons = bonsRes.data.results || bonsRes.data;
        
        if (bons.length === 0) {
          setError('Aucun bon de collecte trouvé avec ce numéro');
          setSearchResults([]);
        } else if (bons.length === 1) {
          // Tracer directement
          response = await tracabiliteService.traceBonCollecte(bons[0].id);
          setLoadedChain(response.data.chain);
          setSearchResults([]);
        } else {
          // Afficher les résultats pour sélection
          setSearchResults(bons);
        }
      } else if (searchType === 'colis') {
        // Rechercher par numéro de colis
        const colisRes = await tracabiliteService.getColis({ search: searchValue });
        const colisList = colisRes.data.results || colisRes.data;
        
        if (colisList.length === 0) {
          setError('Aucun colis trouvé avec ce numéro');
          setSearchResults([]);
        } else if (colisList.length === 1) {
          response = await tracabiliteService.traceColis(colisList[0].id);
          setLoadedChain(response.data.chain);
          setSearchResults([]);
        } else {
          setSearchResults(colisList);
        }
      } else if (searchType === 'lot') {
        // Rechercher par numéro de lot
        const lotsRes = await tracabiliteService.getLotsTraitement({ search: searchValue });
        const lots = lotsRes.data.results || lotsRes.data;
        
        if (lots.length === 0) {
          setError('Aucun lot trouvé avec ce numéro');
          setSearchResults([]);
        } else {
          setSearchResults(lots);
        }
      }
    } catch (err) {
      console.error('Erreur recherche:', err);
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = async (item) => {
    setLoading(true);
    try {
      let response;
      if (searchType === 'fabc') {
        response = await tracabiliteService.traceBonCollecte(item.id);
      } else if (searchType === 'colis') {
        response = await tracabiliteService.traceColis(item.id);
      }
      
      if (response?.data?.chain) {
        setLoadedChain(response.data.chain);
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Erreur traçabilité:', err);
      setError('Erreur lors de la génération de la traçabilité');
    } finally {
      setLoading(false);
    }
  };

  // Si pas de chaîne chargée, afficher l'interface de recherche
  if (!loadedChain) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-primary-yellow p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-dark mb-2">
                🔍 Recherche de Traçabilité
              </h2>
              <p className="text-dark/90">
                Recherchez un élément pour visualiser sa chaîne de traçabilité
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-dark hover:text-gray-700 text-3xl"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            {/* Type de recherche */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de recherche
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSearchType('fabc'); setSearchResults([]); setError(''); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    searchType === 'fabc'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📋 N° FABC
                </button>
                <button
                  onClick={() => { setSearchType('colis'); setSearchResults([]); setError(''); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    searchType === 'colis'
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📦 N° Colis
                </button>
                <button
                  onClick={() => { setSearchType('lot'); setSearchResults([]); setError(''); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    searchType === 'lot'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ⚙️ N° Lot
                </button>
              </div>
            </div>

            {/* Champ de recherche */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {searchType === 'fabc' && 'Numéro FABC (Bon de Collecte)'}
                {searchType === 'colis' && 'Numéro de Colis'}
                {searchType === 'lot' && 'Numéro de Lot'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={
                    searchType === 'fabc' ? 'Ex: FABC-2024-001' :
                    searchType === 'colis' ? 'Ex: COL-2024-001' :
                    'Ex: LOT-2024-001'
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-2 bg-primary-yellow hover:bg-yellow-500 text-dark rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? '...' : '🔍 Rechercher'}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Résultats de recherche */}
            {searchResults.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Résultats ({searchResults.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectResult(item)}
                      className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-dark">
                            {searchType === 'fabc' && `FABC ${item.numero_fabc}`}
                            {searchType === 'colis' && `Colis ${item.numero_colis}`}
                            {searchType === 'lot' && `Lot ${item.numero_lot}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {searchType === 'fabc' && `${item.producteur_info?.nom_complet || 'Producteur'} - ${item.poids_accepte} kg`}
                            {searchType === 'colis' && `${item.poids_net} kg - ${item.qualite}`}
                            {searchType === 'lot' && `${item.type_traitement} - ${item.poids_entree} kg`}
                          </p>
                        </div>
                        <span className="text-primary-yellow">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-dark mb-2">💡 Comment utiliser</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>N° FABC</strong> : Tracez depuis le bon de collecte jusqu'à l'export</li>
                <li>• <strong>N° Colis</strong> : Tracez depuis le colis jusqu'au producteur d'origine</li>
                <li>• <strong>N° Lot</strong> : Visualisez les détails d'un lot de traitement</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 p-4">
            <button
              onClick={onClose}
              className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAscendante = loadedChain.type === 'ascendante';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-primary-yellow p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-dark mb-2">
              🔍 Chaîne de Traçabilité
            </h2>
            <p className="text-dark/90">
              {isAscendante ? '📤 Ascendante : Producteur → Export' : '📥 Descendante : Export → Producteur'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-dark hover:text-gray-700 text-3xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-chick-yellow text-chick-yellow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'timeline'
                ? 'border-b-2 border-chick-yellow text-chick-yellow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📅 Timeline
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'details'
                ? 'border-b-2 border-chick-yellow text-chick-yellow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📝 Détails
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tab: Vue d'ensemble */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Producteurs */}
              {loadedChain.producteurs && loadedChain.producteurs.length > 0 && (
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                    <span>👨‍🌾</span>
                    <span>Producteur{loadedChain.producteurs.length > 1 ? 's' : ''}</span>
                  </h3>
                  <div className="space-y-2">
                    {loadedChain.producteurs.map((prod, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-dark">
                              {prod.nom} {prod.prenom}
                            </p>
                            <p className="text-sm text-gray-600">
                              Code: {prod.code} | Village: {prod.village}
                            </p>
                          </div>
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            Origine
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bon de collecte */}
              {loadedChain.bon_collecte && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                    <span>📋</span>
                    <span>Bon de Collecte (FABC)</span>
                  </h3>
                  <div className="bg-white rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">N° FABC</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.bon_collecte.numero_fabc}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Date</p>
                        <p className="font-semibold text-dark">
                          {new Date(loadedChain.bon_collecte.date_marche).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Poids</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.bon_collecte.poids_accepte} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Certification</p>
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {loadedChain.bon_collecte.certification}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fiche de collecte */}
              {loadedChain.fiche_collecte && (
                <div className="bg-yellow-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                    <span>📄</span>
                    <span>Fiche de Collecte (FC)</span>
                  </h3>
                  <div className="bg-white rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">N° FC</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.fiche_collecte.numero_fc}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Date</p>
                        <p className="font-semibold text-dark">
                          {new Date(loadedChain.fiche_collecte.date_marche).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Poids total</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.fiche_collecte.poids_total_net} kg
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bon de transport */}
              {loadedChain.bon_transport && (
                <div className="bg-purple-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                    <span>🚚</span>
                    <span>Bon de Transport (BT)</span>
                  </h3>
                  <div className="bg-white rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">N° BT</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.bon_transport.numero_bt}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Départ</p>
                        <p className="font-semibold text-dark text-sm">
                          {loadedChain.bon_transport.lieu_depart}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Destination</p>
                        <p className="font-semibold text-dark text-sm">
                          {loadedChain.bon_transport.lieu_destination}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Poids</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.bon_transport.poids_total_depart} kg
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lot de traitement */}
              {loadedChain.lot_traitement && (
                <div className="bg-orange-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                    <span>⚙️</span>
                    <span>Lot de Traitement</span>
                  </h3>
                  <div className="bg-white rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">N° Lot</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.lot_traitement.numero_lot}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.lot_traitement.type_traitement}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Qualité</p>
                        <span className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                          {loadedChain.lot_traitement.qualite || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Poids sortie</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.lot_traitement.poids_sortie || 'En cours'} kg
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Colis */}
              {loadedChain.colis && (
                <div className="bg-pink-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                    <span>📦</span>
                    <span>Colis</span>
                  </h3>
                  <div className="bg-white rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">N° Colis</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.colis.numero_colis}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Poids net</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.colis.poids_net} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Qualité</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.colis.qualite}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">QR Code</p>
                        <p className="font-mono text-xs text-dark">
                          {loadedChain.colis.qr_code || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Commande export */}
              {loadedChain.commande_export && (
                <div className="bg-red-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                    <span>🌍</span>
                    <span>Commande d'Export</span>
                  </h3>
                  <div className="bg-white rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">N° Commande</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.commande_export.numero_commande}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Client</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.commande_export.nom_client}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Destination</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.commande_export.pays_destination}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Poids total</p>
                        <p className="font-semibold text-dark">
                          {loadedChain.commande_export.poids_total_net} kg
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Timeline */}
          {activeTab === 'timeline' && (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
              
              <div className="space-y-8">
                {loadedChain.bon_collecte && (
                  <TimelineItem
                    icon="📋"
                    title="Bon de Collecte (FABC)"
                    date={loadedChain.bon_collecte.date_marche}
                    details={[
                      `N° ${loadedChain.bon_collecte.numero_fabc}`,
                      `${loadedChain.bon_collecte.poids_accepte} kg`,
                      loadedChain.bon_collecte.certification
                    ]}
                    color="blue"
                  />
                )}

                {loadedChain.fiche_collecte && (
                  <TimelineItem
                    icon="📄"
                    title="Fiche de Collecte (FC)"
                    date={loadedChain.fiche_collecte.date_marche}
                    details={[
                      `N° ${loadedChain.fiche_collecte.numero_fc}`,
                      `${loadedChain.fiche_collecte.poids_total_net} kg`
                    ]}
                    color="yellow"
                  />
                )}

                {loadedChain.bon_transport && (
                  <TimelineItem
                    icon="🚚"
                    title="Transport (BT)"
                    date={loadedChain.bon_transport.date_chargement}
                    details={[
                      `N° ${loadedChain.bon_transport.numero_bt}`,
                      `${loadedChain.bon_transport.lieu_depart} → ${loadedChain.bon_transport.lieu_destination}`,
                      `${loadedChain.bon_transport.poids_total_depart} kg`
                    ]}
                    color="purple"
                  />
                )}

                {loadedChain.lot_traitement && (
                  <TimelineItem
                    icon="⚙️"
                    title="Traitement"
                    date={loadedChain.lot_traitement.date_debut}
                    details={[
                      `Lot ${loadedChain.lot_traitement.numero_lot}`,
                      loadedChain.lot_traitement.type_traitement,
                      loadedChain.lot_traitement.qualite || 'En cours'
                    ]}
                    color="orange"
                  />
                )}

                {loadedChain.colis && (
                  <TimelineItem
                    icon="📦"
                    title="Conditionnement"
                    date={new Date().toISOString().split('T')[0]}
                    details={[
                      `Colis ${loadedChain.colis.numero_colis}`,
                      `${loadedChain.colis.poids_net} kg`,
                      loadedChain.colis.qualite
                    ]}
                    color="pink"
                  />
                )}

                {loadedChain.commande_export && (
                  <TimelineItem
                    icon="🌍"
                    title="Export"
                    date={loadedChain.commande_export.date_expedition || 'À venir'}
                    details={[
                      `Commande ${loadedChain.commande_export.numero_commande}`,
                      loadedChain.commande_export.nom_client,
                      loadedChain.commande_export.pays_destination
                    ]}
                    color="red"
                  />
                )}
              </div>
            </div>
          )}

          {/* Tab: Détails */}
          {activeTab === 'details' && (
            <div className="bg-gray-50 rounded-lg p-6">
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(loadedChain, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-4">
          <button
            onClick={() => setLoadedChain(null)}
            className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
          >
            🔍 Nouvelle recherche
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Fermer
          </button>
          <button
            onClick={() => window.print()}
            className="bg-primary-yellow hover:bg-yellow-500 text-dark px-6 py-3 rounded-lg transition-colors font-semibold"
          >
            🖨️ Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant Timeline Item
function TimelineItem({ icon, title, date, details, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    red: 'bg-red-500',
    green: 'bg-green-500'
  };

  return (
    <div className="relative pl-16">
      <div className={`absolute left-5 w-6 h-6 rounded-full ${colorClasses[color]} flex items-center justify-center text-white text-xs font-bold`}>
        {icon}
      </div>
      
      <div className="bg-white rounded-lg p-4 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-dark">{title}</h4>
          <span className="text-sm text-gray-600">
            {typeof date === 'string' && date !== 'À venir' 
              ? new Date(date).toLocaleDateString('fr-FR') 
              : date}
          </span>
        </div>
        <ul className="space-y-1">
          {details.map((detail, idx) => (
            <li key={idx} className="text-sm text-gray-700">
              • {detail}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default TracabilityChainViewer;
