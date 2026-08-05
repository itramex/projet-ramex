import { useState, useEffect, memo } from 'react';
import Card from '../common/Card';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';
import ProductionHistoryChart from './ProductionHistoryChart';
import AGRHistoryChart from './AGRHistoryChart';
import SocialIndicatorChart from './SocialIndicatorChart';
import { historyService, cooperativeService, producteurService, parcelleService } from '../../services/api';

/**
 * TrendAnalysisDashboard - Tableau de bord d'analyse des tendances
 * 
 * Affiche les tendances pour:
 * - Productions agricoles
 * - Revenus AGR
 * - Indicateurs sociaux
 */
function TrendAnalysisDashboard() {
  const [filters, setFilters] = useState({
    anneeDebut: new Date().getFullYear() - 5,
    anneeFin: new Date().getFullYear(),
    village: '',
    cooperative: '',
    parcelle: null,
    producteur: null,
  });

  const [cooperatives, setCooperatives] = useState([]);
  const [villages, setVillages] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [parcelles, setParcelles] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [productionTrends, setProductionTrends] = useState(null);
  const [agrTrends, setAgrTrends] = useState(null);
  const [socialTrends, setSocialTrends] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (filters.cooperative) {
      loadVillages(filters.cooperative);
    }
  }, [filters.cooperative]);

  useEffect(() => {
    if (filters.village) {
      loadProducteurs(filters.village);
    }
  }, [filters.village]);

  useEffect(() => {
    if (filters.producteur) {
      loadParcelles(filters.producteur);
    }
  }, [filters.producteur]);

  useEffect(() => {
    if (filters.parcelle || filters.producteur) {
      loadTrends();
    } else {
      // Réinitialiser les tendances si aucun filtre n'est sélectionné
      setProductionTrends(null);
      setAgrTrends(null);
      setSocialTrends(null);
    }
  }, [filters.parcelle, filters.producteur, filters.anneeDebut, filters.anneeFin]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger les coopératives
      const coopResponse = await cooperativeService.getAll();
      setCooperatives(coopResponse.data.results || coopResponse.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données initiales:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadVillages = async (cooperativeId) => {
    try {
      const response = await cooperativeService.getById(cooperativeId);
      // Note: Assuming villages are in the cooperative data
      // If there's a specific endpoint, adjust accordingly
      setVillages(response.data.villages || []);
    } catch (error) {
      console.error('Erreur lors du chargement des villages:', error);
    }
  };

  const loadProducteurs = async (village) => {
    try {
      const response = await producteurService.getAllForDropdown({ village: village });
      setProducteurs(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des producteurs:', error);
    }
  };

  const loadParcelles = async (producteurId) => {
    try {
      const response = await parcelleService.getAllForDropdown({ producteur: producteurId });
      setParcelles(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des parcelles:', error);
    }
  };

  const loadTrends = async () => {
    try {
      const params = {
        annee_debut: filters.anneeDebut,
        annee_fin: filters.anneeFin,
      };

      // Charger les tendances de production
      if (filters.parcelle) {
        const prodResponse = await historyService.getProductionTrendsAnalysis({
          ...params,
          parcelle_id: filters.parcelle
        });
        setProductionTrends(prodResponse.data);
      } else {
        setProductionTrends(null);
      }

      // Charger les tendances AGR
      if (filters.producteur) {
        const agrResponse = await historyService.getAGRTrendsAnalysis({
          ...params,
          producteur_id: filters.producteur
        });
        setAgrTrends(agrResponse.data);
      } else {
        setAgrTrends(null);
      }

      // Charger les tendances sociales
      if (filters.producteur) {
        const socialResponse = await historyService.getSocialTrendsAnalysis({
          ...params,
          producteur_id: filters.producteur
        });
        setSocialTrends(socialResponse.data);
      } else {
        setSocialTrends(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tendances:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      
      // Réinitialiser les filtres dépendants
      if (field === 'cooperative') {
        newFilters.village = '';
        newFilters.producteur = null;
        newFilters.parcelle = null;
      } else if (field === 'village') {
        newFilters.producteur = null;
        newFilters.parcelle = null;
      } else if (field === 'producteur') {
        newFilters.parcelle = null;
      }
      
      return newFilters;
    });
  };

  const exportToCSV = () => {
    // Préparer les données pour l'export
    const data = [];
    
    // En-têtes
    data.push(['Type', 'Année', 'Valeur', 'Variation']);
    
    // Ajouter les données de production
    if (productionTrends && productionTrends.data) {
      productionTrends.data.forEach(item => {
        data.push(['Production', item.annee, item.quantite_kg, item.variation || '']);
      });
    }
    
    // Ajouter les données AGR
    if (agrTrends && agrTrends.data) {
      agrTrends.data.forEach(item => {
        data.push(['AGR', item.annee, item.revenu_annuel, item.variation || '']);
      });
    }
    
    // Convertir en CSV
    const csv = data.map(row => row.join(',')).join('\n');
    
    // Télécharger
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tendances_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-yellow mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card padding="md">
        <div className="text-center py-12">
          <Icon name={iconMap.warning} size="xl" className="text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadInitialData}
            className="bg-primary-yellow text-dark px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500"
          >
            Réessayer
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-dark">
            Analyse des <span className="text-primary-yellow">Tendances</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Visualisez l'évolution des productions, revenus AGR et indicateurs sociaux
          </p>
        </div>
        
        <button
          onClick={exportToCSV}
          disabled={!filters.producteur && !filters.parcelle}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Icon name={iconMap.export} size="sm" />
          Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <Card title="Filtres" padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Période */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Année de début
            </label>
            <input
              type="number"
              value={filters.anneeDebut}
              onChange={(e) => handleFilterChange('anneeDebut', parseInt(e.target.value))}
              min="2000"
              max={new Date().getFullYear()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Année de fin
            </label>
            <input
              type="number"
              value={filters.anneeFin}
              onChange={(e) => handleFilterChange('anneeFin', parseInt(e.target.value))}
              min="2000"
              max={new Date().getFullYear() + 1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent"
            />
          </div>

          {/* Coopérative */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coopérative
            </label>
            <select
              value={filters.cooperative}
              onChange={(e) => handleFilterChange('cooperative', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent"
            >
              <option value="">Toutes</option>
              {cooperatives.map(coop => (
                <option key={coop.id} value={coop.id}>
                  {coop.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Village */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Village
            </label>
            <select
              value={filters.village}
              onChange={(e) => handleFilterChange('village', e.target.value)}
              disabled={!filters.cooperative}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Tous</option>
              {villages.map(village => (
                <option key={village} value={village}>
                  {village}
                </option>
              ))}
            </select>
          </div>

          {/* Producteur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producteur
            </label>
            <select
              value={filters.producteur || ''}
              onChange={(e) => handleFilterChange('producteur', e.target.value ? parseInt(e.target.value) : null)}
              disabled={!filters.village}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Sélectionner</option>
              {producteurs.map(prod => (
                <option key={prod.id} value={prod.id}>
                  {prod.code} - {prod.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Parcelle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parcelle
            </label>
            <select
              value={filters.parcelle || ''}
              onChange={(e) => handleFilterChange('parcelle', e.target.value ? parseInt(e.target.value) : null)}
              disabled={!filters.producteur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Sélectionner</option>
              {parcelles.map(parcelle => (
                <option key={parcelle.id} value={parcelle.id}>
                  {parcelle.nom || `Parcelle ${parcelle.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* KPIs globaux */}
      {(productionTrends || agrTrends || socialTrends) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* KPI Productions */}
          {productionTrends && (
            <KPICard
              title="Productions"
              icon={iconMap.production}
              color="bg-blue-600"
              metrics={[
                {
                  label: 'Taux de croissance',
                  value: `${productionTrends.growth_rate?.toFixed(1) || 0}%`,
                  color: productionTrends.growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                },
                {
                  label: 'Anomalies',
                  value: productionTrends.anomalies?.length || 0,
                  color: productionTrends.anomalies?.length > 0 ? 'text-orange-600' : 'text-gray-600'
                },
                {
                  label: 'R²',
                  value: productionTrends.trend_line?.r_squared?.toFixed(3) || 'N/A',
                  color: 'text-blue-600'
                }
              ]}
            />
          )}

          {/* KPI AGR */}
          {agrTrends && (
            <KPICard
              title="Revenus AGR"
              icon={iconMap.activite}
              color="bg-green-600"
              metrics={[
                {
                  label: 'Taux de croissance',
                  value: `${agrTrends.growth_rate?.toFixed(1) || 0}%`,
                  color: agrTrends.growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                },
                {
                  label: 'Anomalies',
                  value: agrTrends.anomalies?.length || 0,
                  color: agrTrends.anomalies?.length > 0 ? 'text-orange-600' : 'text-gray-600'
                },
                {
                  label: 'R²',
                  value: agrTrends.trend_line?.r_squared?.toFixed(3) || 'N/A',
                  color: 'text-green-600'
                }
              ]}
            />
          )}

          {/* KPI Indicateurs Sociaux */}
          {socialTrends && (
            <KPICard
              title="Indicateurs Sociaux"
              icon={iconMap.info}
              color="bg-purple-600"
              metrics={[
                {
                  label: 'Taux de croissance',
                  value: `${socialTrends.growth_rate?.toFixed(1) || 0}%`,
                  color: socialTrends.growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                },
                {
                  label: 'Anomalies',
                  value: socialTrends.anomalies?.length || 0,
                  color: socialTrends.anomalies?.length > 0 ? 'text-orange-600' : 'text-gray-600'
                },
                {
                  label: 'R²',
                  value: socialTrends.trend_line?.r_squared?.toFixed(3) || 'N/A',
                  color: 'text-purple-600'
                }
              ]}
            />
          )}
        </div>
      )}

      {/* Graphiques */}
      <div className="grid grid-cols-1 gap-6">
        {/* Section Productions */}
        {filters.parcelle && (
          <div>
            <h2 className="text-xl font-bold text-dark mb-4">
              <Icon name={iconMap.production} size="md" className="inline mr-2" />
              Évolution des Productions
            </h2>
            <ProductionHistoryChart
              parcelleId={filters.parcelle}
              anneeDebut={filters.anneeDebut}
              anneeFin={filters.anneeFin}
            />
          </div>
        )}

        {/* Section AGR */}
        {filters.producteur && (
          <div>
            <h2 className="text-xl font-bold text-dark mb-4">
              <Icon name={iconMap.activite} size="md" className="inline mr-2" />
              Évolution des Revenus AGR
            </h2>
            <AGRHistoryChart
              producteurId={filters.producteur}
              anneeDebut={filters.anneeDebut}
              anneeFin={filters.anneeFin}
            />
          </div>
        )}

        {/* Section Indicateurs Sociaux */}
        {filters.producteur && (
          <div>
            <h2 className="text-xl font-bold text-dark mb-4">
              <Icon name={iconMap.info} size="md" className="inline mr-2" />
              Évolution des Indicateurs Sociaux
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SocialIndicatorChart
                producteurId={filters.producteur}
                typeIndicateur="scolarisation"
                anneeDebut={filters.anneeDebut}
                anneeFin={filters.anneeFin}
              />
              <SocialIndicatorChart
                producteurId={filters.producteur}
                typeIndicateur="eau_potable"
                anneeDebut={filters.anneeDebut}
                anneeFin={filters.anneeFin}
              />
            </div>
          </div>
        )}
      </div>

      {/* Message si aucun filtre sélectionné */}
      {!filters.producteur && !filters.parcelle && (
        <Card padding="md">
          <div className="text-center py-12">
            <Icon name={iconMap.info} size="xl" className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">Sélectionnez des filtres</p>
            <p className="text-gray-500">
              Choisissez une coopérative, un village, un producteur et/ou une parcelle pour afficher les tendances
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

// Composant KPI Card
const KPICard = memo(({ title, icon, color, metrics }) => (
  <Card padding="md">
    <div className="flex items-center gap-3 mb-4">
      <div className={`${color} w-12 h-12 rounded-full flex items-center justify-center`}>
        <Icon name={icon} size="md" className="text-white" />
      </div>
      <h3 className="text-lg font-bold text-dark">{title}</h3>
    </div>
    
    <div className="space-y-3">
      {metrics.map((metric, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{metric.label}</span>
          <span className={`text-lg font-bold ${metric.color}`}>{metric.value}</span>
        </div>
      ))}
    </div>
  </Card>
));

KPICard.displayName = 'KPICard';

export default TrendAnalysisDashboard;
