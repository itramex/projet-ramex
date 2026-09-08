import { useState, useEffect, useCallback, memo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Card from '../common/Card';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';
import { historyService } from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/**
 * ProductionHistoryChart - Affiche l'historique des productions par parcelle
 * 
 * @param {number} parcelleId - ID de la parcelle
 * @param {number} anneeDebut - Année de début
 * @param {number} anneeFin - Année de fin
 * @param {Array<string>} cultures - Liste des cultures à afficher
 */
function ProductionHistoryChart({ parcelleId, anneeDebut, anneeFin, cultures = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trends, setTrends] = useState(null);

  // Sérialiser `cultures` pour obtenir une dépendance stable
  const culturesKey = JSON.stringify(cultures);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger les données de production
      const params = {};
      
      if (anneeDebut) params.annee_debut = anneeDebut;
      if (anneeFin) params.annee_fin = anneeFin;

      const response = await historyService.getProductionByParcelle(parcelleId, params);
      
      // Charger les tendances
      const trendsResponse = await historyService.getProductionTrendsAnalysis({ parcelle_id: parcelleId, ...params });
      
      setData(response.data);
      setTrends(trendsResponse.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError(error.response?.data?.detail || error.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [parcelleId, anneeDebut, anneeFin]);

  useEffect(() => {
    if (parcelleId) {
      loadData();
    }
  }, [loadData, parcelleId, culturesKey]);

  if (loading) {
    return (
      <Card title="Historique des Productions" padding="md">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-yellow mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement de l'historique...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Historique des Productions" padding="md">
        <div className="text-center py-12">
          <Icon name={iconMap.warning} size="xl" className="text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-primary-yellow text-dark px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500"
          >
            Réessayer
          </button>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card title="Historique des Productions" padding="md">
        <div className="text-center py-12">
          <Icon name={iconMap.emptyBox} size="xl" className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">Aucune donnée disponible</p>
          <p className="text-gray-500">L'historique apparaîtra une fois que des productions seront enregistrées</p>
        </div>
      </Card>
    );
  }

  // Préparer les données pour le graphique
  const chartData = prepareChartData(data, cultures, trends);

  return (
    <Card title="Historique des Productions" padding="md">
      <div className="space-y-4">
        {/* Statistiques rapides */}
        {trends && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatBox
              label="Taux de croissance"
              value={`${trends.growth_rate?.toFixed(1) || 0}%`}
              color={trends.growth_rate > 0 ? 'text-green-600' : 'text-red-600'}
            />
            <StatBox
              label="Anomalies détectées"
              value={trends.anomalies?.length || 0}
              color={trends.anomalies?.length > 0 ? 'text-orange-600' : 'text-gray-600'}
            />
            <StatBox
              label="R² (qualité tendance)"
              value={trends.trend_line?.r_squared?.toFixed(3) || 'N/A'}
              color="text-blue-600"
            />
          </div>
        )}

        {/* Graphique */}
        <div className="h-96">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: 'index',
                intersect: false,
              },
              plugins: {
                legend: {
                  position: 'top',
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.dataset.label || '';
                      const value = context.parsed.y;
                      
                      // Trouver la variation pour cette année
                      const dataPoint = data.find(d => 
                        d.annee === context.parsed.x && 
                        d.culture === context.dataset.label.replace(' (tendance)', '')
                      );
                      
                      if (dataPoint && dataPoint.variation !== undefined && !context.dataset.label.includes('tendance')) {
                        return `${label}: ${value.toFixed(2)} kg (${dataPoint.variation > 0 ? '+' : ''}${dataPoint.variation.toFixed(1)}%)`;
                      }
                      
                      return `${label}: ${value.toFixed(2)} kg`;
                    }
                  }
                }
              },
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Année'
                  }
                },
                y: {
                  title: {
                    display: true,
                    text: 'Quantité (kg)'
                  },
                  beginAtZero: true
                }
              }
            }}
          />
        </div>

        {/* Légende des anomalies */}
        {trends && trends.anomalies && trends.anomalies.length > 0 && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Icon name={iconMap.warning} size="sm" className="text-orange-600 mt-1" />
              <div>
                <p className="font-semibold text-orange-800">Anomalies détectées</p>
                <p className="text-sm text-orange-700">
                  Variations importantes observées en : {trends.anomalies.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Composant pour afficher une statistique
const StatBox = memo(({ label, value, color }) => (
  <div className="bg-gray-50 p-3 rounded-lg">
    <p className="text-xs text-gray-600 mb-1">{label}</p>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
));

StatBox.displayName = 'StatBox';

// Fonction pour préparer les données du graphique
function prepareChartData(data, cultures, trends) {
  // Couleurs pour les différentes cultures
  const colors = [
    { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' }, // blue
    { border: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' }, // green
    { border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' }, // amber
    { border: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' }, // red
    { border: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' }, // purple
  ];

  // Extraire toutes les années uniques
  const annees = [...new Set(data.map(d => d.annee))].sort();
  
  // Extraire toutes les cultures uniques (filtrer si cultures spécifiées)
  let culturesUniques = [...new Set(data.map(d => d.culture))];
  if (cultures && cultures.length > 0) {
    culturesUniques = culturesUniques.filter(c => cultures.includes(c));
  }

  // Créer les datasets pour chaque culture
  const datasets = [];
  
  culturesUniques.forEach((culture, index) => {
    const cultureData = data.filter(d => d.culture === culture);
    const color = colors[index % colors.length];
    
    // Dataset pour les données réelles
    datasets.push({
      label: culture,
      data: annees.map(annee => {
        const point = cultureData.find(d => d.annee === annee);
        return point ? point.quantite_kg : null;
      }),
      borderColor: color.border,
      backgroundColor: color.bg,
      borderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      // Marquer les anomalies avec des points rouges
      pointBackgroundColor: annees.map(annee => {
        if (trends && trends.anomalies && trends.anomalies.includes(annee)) {
          return '#EF4444'; // red
        }
        return color.border;
      }),
      pointBorderColor: annees.map(annee => {
        if (trends && trends.anomalies && trends.anomalies.includes(annee)) {
          return '#DC2626'; // darker red
        }
        return color.border;
      }),
      pointBorderWidth: 2,
    });

    // Dataset pour la ligne de tendance (si disponible)
    if (trends && trends.trend_line) {
      const { slope, intercept } = trends.trend_line;
      datasets.push({
        label: `${culture} (tendance)`,
        data: annees.map(annee => slope * annee + intercept),
        borderColor: color.border,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        pointHoverRadius: 0,
      });
    }
  });

  return {
    labels: annees,
    datasets: datasets,
  };
}

export default ProductionHistoryChart;
