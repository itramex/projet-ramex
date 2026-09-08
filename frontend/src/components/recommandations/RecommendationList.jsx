import { useState, useEffect } from 'react';
import { recommendationService, producteurService } from '../../services/api';
import { Pagination } from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import RecommendationCard from './RecommendationCard';
import RecommendationDetails from './RecommendationDetails';

const ITEMS_PER_PAGE = 9;

function RecommendationList() {
  const [recommendations, setRecommendations] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducteur, setSelectedProducteur] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [generating, setGenerating] = useState(false);

  const {
    currentPage,
    totalPages,
    firstItemIndex,
    lastItemIndex,
    goToPage,
  } = usePagination({
    totalItems: recommendations.length,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  const paginatedRecommendations = recommendations.slice(firstItemIndex, lastItemIndex);


  useEffect(() => {
    fetchRecommendations();
    fetchProducteurs();
    // Les loaders capturent les filtres à l'exécution ; on ne relance que
    // lorsqu'un filtre change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProducteur, selectedStatut]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedProducteur) params.producteur = selectedProducteur;
      if (selectedStatut) params.statut = selectedStatut;

      const response = await recommendationService.getAll(params);
      setRecommendations(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement recommandations:', error);
      alert('Erreur lors du chargement des recommandations');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducteurs = async () => {
    try {
      const response = await producteurService.getAllForDropdown();
      setProducteurs(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement producteurs:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedProducteur) {
      alert('⚠️ Veuillez sélectionner un producteur');
      return;
    }

    setGenerating(true);
    try {
      // Étape 1: Valider les données du producteur
      const validationResponse = await recommendationService.validateProducteur(selectedProducteur);
      const validation = validationResponse.data;
      
      // Si des données manquent, afficher le diagnostic détaillé
      if (!validation.valid) {
        let message = `❌ Données insuffisantes pour ${validation.producteur_nom}\n\n`;
        
        if (validation.reason === 'inactive') {
          message = `⚠️ ${validation.message}`;
        } else {
          message += '🔴 PROBLÈMES DÉTECTÉS:\n';
          validation.missing_data.forEach((issue, idx) => {
            message += `\n${idx + 1}. ${issue.message}\n`;
            if (issue.details) {
              issue.details.forEach(detail => {
                message += `   • ${detail.code}:\n`;
                detail.issues.forEach(iss => {
                  message += `      - ${iss}\n`;
                });
              });
            }
            if (issue.action) {
              message += `   ➡️ ${issue.action}\n`;
            }
          });
          
          if (validation.warnings && validation.warnings.length > 0) {
            message += '\n⚠️ AVERTISSEMENTS:\n';
            validation.warnings.forEach(warn => {
              message += `  • ${warn}\n`;
            });
          }
          
          if (validation.recommendations && validation.recommendations.length > 0) {
            message += '\n💡 RECOMMANDATIONS:\n';
            validation.recommendations.forEach(rec => {
              message += `  • ${rec}\n`;
            });
          }
          
          message += `\n📊 DONNÉES ACTUELLES:\n`;
          message += `  • Parcelles: ${validation.existing_data.parcelles.count}\n`;
          message += `  • Activités: ${validation.existing_data.activites.count}\n`;
          message += `  • Formations: ${validation.existing_data.activites.formations}\n`;
          message += `  • Collectes: ${validation.existing_data.activites.collectes}\n`;
        }
        
        alert(message);
        setGenerating(false);
        return;
      }
      
      // Si validation OK, afficher les warnings s'il y en a
      if (validation.warnings && validation.warnings.length > 0) {
        let warningMsg = `✅ Validation réussie pour ${validation.producteur_nom}\n\n`;
        warningMsg += '⚠️ AVERTISSEMENTS (non bloquants):\n';
        validation.warnings.forEach(warn => {
          warningMsg += `  • ${warn}\n`;
        });
        warningMsg += '\nSouhaitez-vous continuer la génération?';
        
        if (!confirm(warningMsg)) {
          setGenerating(false);
          return;
        }
      }
      
      // Étape 2: Générer les recommandations
      const response = await recommendationService.generateForProducteur(selectedProducteur, 5);
      
      // Vérifier la réponse
      if (response.data.reason === 'inactive_producer') {
        alert('⚠️ ' + response.data.message);
      } else if (response.data.reason === 'insufficient_data') {
        alert('📈 Données insuffisantes (erreur inattendue après validation)');
      } else {
        alert('✅ Recommandations générées avec succès !');
      }
      
      fetchRecommendations();
    } catch (error) {
      console.error('Erreur génération:', error);
      
      // Gérer les erreurs spécifiques
      if (error.response?.status === 400) {
        alert('⚠️ ' + (error.response.data.message || 'Producteur inactif ou données insuffisantes'));
      } else if (error.response?.status === 404) {
        alert('❌ Producteur introuvable');
      } else {
        alert('❌ Erreur lors de la génération des recommandations');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleExecute = async (id) => {
    try {
      await recommendationService.execute(id);
      fetchRecommendations();
    } catch (error) {
      console.error('Erreur exécution:', error);
      alert('Erreur lors de l\'exécution');
    }
  };

  const handleReject = async (id) => {
    try {
      await recommendationService.reject(id);
      fetchRecommendations();
    } catch (error) {
      console.error('Erreur rejet:', error);
      alert('Erreur lors du rejet');
    }
  };

  const handleDetailsClick = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setShowDetails(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark mb-2">
          Recommandations <span className="text-primary-yellow">IA</span>
        </h1>
        <p className="text-gray-600">
          Actions recommandées basées sur les producteurs similaires
        </p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtre producteur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Producteur
            </label>
            <select
              value={selectedProducteur}
              onChange={(e) => setSelectedProducteur(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent"
            >
              <option value="">Tous les producteurs</option>
              {producteurs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} {p.prenom}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="executed">Exécutées</option>
              <option value="rejected">Rejetées</option>
            </select>
          </div>

          {/* Bouton générer */}
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={!selectedProducteur || generating}
              title={!selectedProducteur ? "Veuillez d'abord sélectionner un producteur" : "Générer des recommandations IA"}
              className="w-full bg-primary-yellow hover:bg-yellow-500 text-dark px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
            >
              {generating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Génération...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span>Générer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Liste des recommandations */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-yellow mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Chargement...</p>
          </div>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-xl text-yellow-800 font-medium mb-4">
            Aucune recommandation disponible
          </p>
          <p className="text-sm text-yellow-700">
            Sélectionnez un producteur et cliquez sur "Générer"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedRecommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onExecute={handleExecute}
              onReject={handleReject}
              onDetailsClick={handleDetailsClick}
            />
          ))}
          {recommendations.length > 0 && (
            <div className="mt-4 flex justify-center col-span-full">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal détails */}
      {showDetails && selectedRecommendation && (
        <RecommendationDetails
          recommendation={selectedRecommendation}
          onClose={() => {
            setShowDetails(false);
            setSelectedRecommendation(null);
          }}
        />
      )}
    </div>
  );
}

export default RecommendationList;
