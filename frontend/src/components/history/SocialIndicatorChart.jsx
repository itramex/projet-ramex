import { useState, useEffect, memo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import Card from '../common/Card';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';
import { historyService } from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * SocialIndicatorChart - Affiche l'historique des indicateurs sociaux par producteur
 * 
 * @param {number} producteurId - ID du producteur
 * @param {string} typeIndicateur - Type d'indicateur (scolarisation, eau_potable, etc.)
 * @param {number} anneeDebut - Année de début
 * @param {number} anneeFin - Année de fin
 */
function SocialIndicatorChart({ producteurId, typeIndicateur, anneeDebut, anneeFin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [villageAverages, setVillageAverages] = useState(null);
  const [chartType, setChartType] = useState('line'); // 'line' ou 'radar'

  useEffect(() => {
    if (producteurId && typeIndicateur) {
      loadData();
    }
  }, [producteurId, typeIndicateur, anneeDebut, anneeFin]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger les données de l'indicateur
      const params = {
        type_indicateur: typeIndicateur,
      };
      
      if (anneeDebut) params.annee_debut = anneeDebut;
      if (anneeFin) params.annee_fin = anneeFin;

      const response = await historyService.getSocialIndicatorByProducteur(producteurId, params);
      
      // Charger les moyennes par village
      try {
        const avgResponse = await historyService.getSocialIndicatorAveragesByVillage({
          type_indicateur: typeIndicateur
        });
        setVillageAverages(avgResponse.data);
      } catch (err) {
        console.warn('Impossible de charger les moyennes par village:', err);
      }
      
      setData(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des indicateurs sociaux:', error);
      setError(error.response?.data?.detail || error.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card title="Historique des Indicateurs Sociaux" padding="md">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-yellow mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des indicateurs...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Historique des Indicateurs Sociaux" padding="md">
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
      <Card title="Historique des Indicateurs Sociaux" padding="md">
        <div className="text-center py-12">
          <Icon name={iconMap.emptyBox} size="xl" className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">Aucune donnée disponible</p>
          <p className="text-gray-500">L'historique apparaîtra une fois que des indicateurs seront enregistrés</p>
        </div>
      </Card>
    );
  }

  // Déterminer le type de valeur de l'indicateur
  const valueType = determineValueType(data);
  
  // Préparer les données pour le graphique
  const chartData = chartType === 'radar' && data.length >= 3
    ? prepareRadarData(data, villageAverages, valueType)
    : prepareLineData(data, villageAverages, valueType);

  return (
    <Card title={`Historique: ${formatIndicatorType(typeIndicateur)}`} padding="md">
      <div className="space-y-4">
        {/* Contrôles */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Légende de l'indicateur */}
          <div className="flex-1">
            <IndicatorLegend type={typeIndicateur} valueType={valueType} />
          </div>

          {/* Toggle type de graphique (si assez de données) */}
          {data.length >= 3 && (
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('line')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  chartType === 'line'
                    ? 'bg-primary-yellow text-dark'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Ligne
              </button>
              <button
                onClick={() => setChartType('radar')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  chartType === 'radar'
                    ? 'bg-primary-yellow text-dark'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Radar
              </button>
            </div>
          )}
        </div>

        {/* Graphique */}
        <div className="h-96">
          {chartType === 'radar' && data.length >= 3 ? (
            <Radar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed.r;
                        return `${label}: ${formatValue(value, valueType)}`;
                      }
                    }
                  }
                },
                scales: {
                  r: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatValue(value, valueType)
                    }
                  }
                }
              }}
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
                        return `${label}: ${formatValue(value, valueType)}`;
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
                      text: getYAxisLabel(typeIndicateur, valueType)
                    },
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatValue(value, valueType)
                    }
                  }
                }
              }}
            />
          )}
        </div>

        {/* Informations complémentaires */}
        {villageAverages && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Icon name={iconMap.info} size="sm" className="text-blue-600 mt-1" />
              <div>
                <p className="font-semibold text-blue-800">Moyenne du village</p>
                <p className="text-sm text-blue-700">
                  La ligne pointillée représente la moyenne des producteurs du même village
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Composant pour afficher la légende de l'indicateur
const IndicatorLegend = memo(({ type, valueType }) => {
  const legends = {
    scolarisation: {
      title: 'Taux de scolarisation',
      description: 'Pourcentage d\'enfants scolarisés dans le ménage',
      icon: iconMap.formation,
    },
    eau_potable: {
      title: 'Accès à l\'eau potable',
      description: 'Disponibilité d\'une source d\'eau potable',
      icon: iconMap.info,
    },
    sante: {
      title: 'Accès aux soins',
      description: 'Accès à des services de santé',
      icon: iconMap.info,
    },
    habitat: {
      title: 'Type de logement',
      description: 'Qualité et type de construction du logement',
      icon: iconMap.info,
    },
    energie: {
      title: 'Accès à l\'énergie',
      description: 'Type d\'énergie disponible dans le ménage',
      icon: iconMap.info,
    },
  };

  const legend = legends[type] || { title: type, description: '', icon: iconMap.info };

  return (
    <div className="flex items-start gap-3">
      <div className="bg-blue-100 p-2 rounded-lg">
        <Icon name={legend.icon} size="md" className="text-blue-600" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{legend.title}</h3>
        <p className="text-sm text-gray-600">{legend.description}</p>
        <p className="text-xs text-gray-500 mt-1">Type: {valueType}</p>
      </div>
    </div>
  );
});

IndicatorLegend.displayName = 'IndicatorLegend';

// Fonction pour déterminer le type de valeur
function determineValueType(data) {
  if (!data || data.length === 0) return 'unknown';
  
  const firstItem = data[0];
  if (firstItem.valeur_numerique !== null && firstItem.valeur_numerique !== undefined) {
    return 'numeric';
  } else if (firstItem.valeur_booleen !== null && firstItem.valeur_booleen !== undefined) {
    return 'boolean';
  } else if (firstItem.valeur_texte) {
    return 'text';
  }
  
  return 'unknown';
}

// Fonction pour préparer les données en ligne
function prepareLineData(data, villageAverages, valueType) {
  const annees = [...new Set(data.map(d => d.annee))].sort();
  
  // Convertir les valeurs selon le type
  const values = annees.map(annee => {
    const point = data.find(d => d.annee === annee);
    if (!point) return null;
    return convertValue(point, valueType);
  });

  const datasets = [{
    label: 'Producteur',
    data: values,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 3,
    pointRadius: 5,
    pointHoverRadius: 7,
    pointBackgroundColor: '#3B82F6',
    pointBorderColor: '#2563EB',
    pointBorderWidth: 2,
    fill: true,
  }];

  // Ajouter la moyenne du village si disponible
  if (villageAverages && villageAverages.length > 0) {
    const avgValues = annees.map(annee => {
      const avg = villageAverages.find(v => v.annee === annee);
      return avg ? convertValue(avg, valueType) : null;
    });

    datasets.push({
      label: 'Moyenne village',
      data: avgValues,
      borderColor: '#10B981',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#10B981',
      pointBorderColor: '#059669',
      pointBorderWidth: 1,
    });
  }

  return {
    labels: annees,
    datasets: datasets,
  };
}

// Fonction pour préparer les données en radar
function prepareRadarData(data, villageAverages, valueType) {
  const annees = [...new Set(data.map(d => d.annee))].sort();
  
  // Convertir les valeurs selon le type
  const values = annees.map(annee => {
    const point = data.find(d => d.annee === annee);
    if (!point) return 0;
    return convertValue(point, valueType);
  });

  const datasets = [{
    label: 'Producteur',
    data: values,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: '#3B82F6',
    pointBorderColor: '#2563EB',
    pointBorderWidth: 2,
  }];

  // Ajouter la moyenne du village si disponible
  if (villageAverages && villageAverages.length > 0) {
    const avgValues = annees.map(annee => {
      const avg = villageAverages.find(v => v.annee === annee);
      return avg ? convertValue(avg, valueType) : 0;
    });

    datasets.push({
      label: 'Moyenne village',
      data: avgValues,
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#10B981',
      pointBorderColor: '#059669',
      pointBorderWidth: 1,
    });
  }

  return {
    labels: annees,
    datasets: datasets,
  };
}

// Fonctions utilitaires
function convertValue(dataPoint, valueType) {
  switch (valueType) {
    case 'numeric':
      return dataPoint.valeur_numerique || 0;
    case 'boolean':
      return dataPoint.valeur_booleen ? 1 : 0;
    case 'text':
      // Pour les valeurs texte, on pourrait mapper à des valeurs numériques
      // Par exemple: 'cases' = 1, 'tôle' = 2, 'dur' = 3
      return 0; // Par défaut
    default:
      return 0;
  }
}

function formatValue(value, valueType) {
  switch (valueType) {
    case 'numeric':
      return `${value.toFixed(1)}%`;
    case 'boolean':
      return value === 1 ? 'Oui' : 'Non';
    case 'text':
      return value;
    default:
      return value;
  }
}

function formatIndicatorType(type) {
  const typeMap = {
    'scolarisation': 'Taux de scolarisation',
    'eau_potable': 'Accès à l\'eau potable',
    'sante': 'Accès aux soins',
    'habitat': 'Type de logement',
    'energie': 'Accès à l\'énergie',
  };
  return typeMap[type] || type;
}

function getYAxisLabel(type, valueType) {
  if (valueType === 'numeric') {
    return 'Valeur (%)';
  } else if (valueType === 'boolean') {
    return 'Oui (1) / Non (0)';
  }
  return 'Valeur';
}

export default SocialIndicatorChart;
