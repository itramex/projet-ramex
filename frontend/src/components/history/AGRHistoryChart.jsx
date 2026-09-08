import { useState, useEffect, useCallback, memo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import Card from '../common/Card';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';
import { historyService } from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/**
 * AGRHistoryChart - Affiche l'historique des revenus AGR par producteur
 * 
 * @param {number} producteurId - ID du producteur
 * @param {number} anneeDebut - Année de début
 * @param {number} anneeFin - Année de fin
 * @param {Array<string>} typesAgr - Liste des types d'AGR à afficher
 */
function AGRHistoryChart({ producteurId, anneeDebut, anneeFin, typesAgr = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trends, setTrends] = useState(null);
  const [viewMode, setViewMode] = useState('stacked'); // 'stacked' ou 'line'

  // Sérialiser `typesAgr` pour obtenir une dépendance stable
  const typesAgrKey = JSON.stringify(typesAgr);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger les données AGR
      const params = {};
      
      if (anneeDebut) params.annee_debut = anneeDebut;
      if (anneeFin) params.annee_fin = anneeFin;

      const response = await historyService.getAGRByProducteur(producteurId, params);
      
      // Charger les tendances
      const trendsResponse = await historyService.getAGRTrendsAnalysis({ producteur_id: producteurId, ...params });
      
      setData(response.data);
      setTrends(trendsResponse.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données AGR:', error);
      setError(error.response?.data?.detail || error.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [producteurId, anneeDebut, anneeFin]);

  useEffect(() => {
    if (producteurId) {
      loadData();
    }
  }, [loadData, producteurId, typesAgrKey]);

  if (loading) {
    return (
      <Card title="Historique des Revenus AGR" padding="md">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-yellow mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement de l'historique AGR...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Historique des Revenus AGR" padding="md">
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
      <Card title="Historique des Revenus AGR" padding="md">
        <div className="text-center py-12">
          <Icon name={iconMap.emptyBox} size="xl" className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">Aucune donnée AGR disponible</p>
          <p className="text-gray-500">L'historique apparaîtra une fois que des revenus AGR seront enregistrés</p>
        </div>
      </Card>
    );
  }

  // Préparer les données pour le graphique
  const chartData = viewMode === 'stacked' 
    ? prepareStackedBarData(data, typesAgr)
    : prepareLineData(data, typesAgr);

  return (
    <Card title="Historique des Revenus AGR" padding="md">
      <div className="space-y-4">
        {/* Contrôles et statistiques */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Statistiques rapides */}
          {trends && (
            <div className="flex gap-4">
              <StatBox
                label="Taux de croissance"
                value={`${trends.growth_rate?.toFixed(1) || 0}%`}
                color={trends.growth_rate > 0 ? 'text-green-600' : 'text-red-600'}
              />
              <StatBox
                label="Revenu total"
                value={formatCurrency(calculateTotalRevenue(data))}
                color="text-blue-600"
              />
            </div>
          )}

          {/* Toggle vue */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('stacked')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'stacked'
                  ? 'bg-primary-yellow text-dark'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Vue par AGR
            </button>
            <button
              onClick={() => setViewMode('line')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'line'
                  ? 'bg-primary-yellow text-dark'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Vue totale
            </button>
          </div>
        </div>

        {/* Graphique */}
        <div className="h-96">
          {viewMode === 'stacked' ? (
            <Bar
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
                        return `${label}: ${formatCurrency(value)}`;
                      },
                      footer: (tooltipItems) => {
                        const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                        return `Total: ${formatCurrency(total)}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: true,
                    title: {
                      display: true,
                      text: 'Année'
                    }
                  },
                  y: {
                    stacked: true,
                    title: {
                      display: true,
                      text: 'Revenu (Ar)'
                    },
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatCurrency(value, true)
                    }
                  }
                }
              }}
              plugins={[barLabelPlugin]}
            />
          ) : (
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
                        return `${label}: ${formatCurrency(value)}`;
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
                      text: 'Revenu (Ar)'
                    },
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatCurrency(value, true)
                    }
                  }
                }
              }}
            />
          )}
        </div>

        {/* Légende des types d'AGR */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Types d'AGR affichés:</strong> {getUniqueAGRTypes(data).join(', ')}
          </p>
        </div>
      </div>
    </Card>
  );
}

// Composant pour afficher une statistique
const StatBox = memo(({ label, value, color }) => (
  <div className="bg-gray-50 p-3 rounded-lg">
    <p className="text-xs text-gray-600 mb-1">{label}</p>
    <p className={`text-lg font-bold ${color}`}>{value}</p>
  </div>
));

StatBox.displayName = 'StatBox';

// Fonction pour préparer les données en barres empilées
function prepareStackedBarData(data, typesAgr) {
  // Couleurs pour les différents types d'AGR
  const colors = [
    { bg: '#3B82F6', border: '#2563EB' }, // blue
    { bg: '#10B981', border: '#059669' }, // green
    { bg: '#F59E0B', border: '#D97706' }, // amber
    { bg: '#EF4444', border: '#DC2626' }, // red
    { bg: '#8B5CF6', border: '#7C3AED' }, // purple
    { bg: '#EC4899', border: '#DB2777' }, // pink
  ];

  // Extraire toutes les années uniques
  const annees = [...new Set(data.map(d => d.annee))].sort();
  
  // Extraire tous les types d'AGR uniques (filtrer si typesAgr spécifiés)
  let agrTypes = [...new Set(data.map(d => d.type_agr))];
  if (typesAgr && typesAgr.length > 0) {
    agrTypes = agrTypes.filter(t => typesAgr.includes(t));
  }

  // Créer les datasets pour chaque type d'AGR
  const datasets = agrTypes.map((type, index) => {
    const typeData = data.filter(d => d.type_agr === type);
    const color = colors[index % colors.length];
    
    return {
      label: formatAGRType(type),
      data: annees.map(annee => {
        const point = typeData.find(d => d.annee === annee);
        return point ? point.revenu_annuel : 0;
      }),
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 1,
    };
  });

  return {
    labels: annees,
    datasets: datasets,
  };
}

// Fonction pour préparer les données en lignes (vue totale)
function prepareLineData(data, typesAgr) {
  // Extraire toutes les années uniques
  const annees = [...new Set(data.map(d => d.annee))].sort();
  
  // Filtrer par types d'AGR si spécifiés
  let filteredData = data;
  if (typesAgr && typesAgr.length > 0) {
    filteredData = data.filter(d => typesAgr.includes(d.type_agr));
  }

  // Calculer le revenu total par année
  const revenusParAnnee = annees.map(annee => {
    const dataAnnee = filteredData.filter(d => d.annee === annee);
    return dataAnnee.reduce((sum, d) => sum + (d.revenu_annuel || 0), 0);
  });

  return {
    labels: annees,
    datasets: [{
      label: 'Revenu Total AGR',
      data: revenusParAnnee,
      borderColor: '#FCD34D',
      backgroundColor: 'rgba(252, 211, 77, 0.1)',
      borderWidth: 3,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointBackgroundColor: '#FCD34D',
      pointBorderColor: '#F59E0B',
      pointBorderWidth: 2,
      fill: true,
    }],
  };
}

// Plugin pour afficher le total en haut de chaque barre
const barLabelPlugin = {
  id: 'barLabelPlugin',
  afterDatasetsDraw(chart) {
    const { ctx, data, scales } = chart;
    
    if (!data.labels || data.labels.length === 0) return;
    
    ctx.save();
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    
    // Calculer le total pour chaque barre
    data.labels.forEach((label, index) => {
      let total = 0;
      let topY = scales.y.bottom;
      
      data.datasets.forEach((dataset) => {
        const value = dataset.data[index] || 0;
        total += value;
        
        // Trouver la position Y du haut de la barre
        const meta = chart.getDatasetMeta(data.datasets.indexOf(dataset));
        if (meta && meta.data[index]) {
          topY = Math.min(topY, meta.data[index].y);
        }
      });
      
      if (total > 0) {
        const x = scales.x.getPixelForValue(index);
        const y = topY - 10;
        
        // Afficher le total formaté
        ctx.fillText(formatCurrency(total, true), x, y);
      }
    });
    
    ctx.restore();
  }
};

// Fonctions utilitaires
function formatCurrency(value, short = false) {
  if (!value || value === 0) return '0 Ar';
  
  const num = Number(value);
  if (isNaN(num)) return '0 Ar';
  
  if (short && num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M Ar`;
  } else if (short && num >= 1000) {
    return `${(num / 1000).toFixed(0)}K Ar`;
  }
  
  return `${num.toLocaleString('fr-FR')} Ar`;
}

function formatAGRType(type) {
  const typeMap = {
    'pisciculture': 'Pisciculture',
    'aviculture': 'Aviculture',
    'apiculture': 'Apiculture',
    'maraichage': 'Maraîchage',
    'autre': 'Autre',
  };
  return typeMap[type] || type;
}

function calculateTotalRevenue(data) {
  return data.reduce((sum, d) => sum + (d.revenu_annuel || 0), 0);
}

function getUniqueAGRTypes(data) {
  return [...new Set(data.map(d => formatAGRType(d.type_agr)))];
}

export default AGRHistoryChart;
