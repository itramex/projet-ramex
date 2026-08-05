import { useState, useEffect, memo } from 'react';
import { agrService } from '../../services/api';
import Icon from '../common/Icon';
import Card from '../common/Card';
import { iconMap } from '../../styles/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function AGRStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await agrService.getStats();
      setData(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || error.message || 'Erreur lors du chargement des statistiques AGR');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card title="Statistiques AGR" padding="md">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-yellow mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des statistiques AGR...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Statistiques AGR" padding="md">
        <div className="text-center py-12">
          <Icon name={iconMap.warning} size="xl" className="text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadStats}
            className="bg-primary-yellow text-dark px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500"
          >
            Réessayer
          </button>
        </div>
      </Card>
    );
  }

  if (!data || data.total_agr === 0) {
    return (
      <Card title="Statistiques AGR" padding="md">
        <div className="text-center py-12">
          <Icon name={iconMap.emptyBox} size="xl" className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">Aucune AGR enregistrée</p>
          <p className="text-gray-500">Les statistiques apparaîtront une fois que des AGR seront ajoutées</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark">
            Statistiques <span className="text-primary-yellow">AGR</span>
          </h2>
          <p className="text-gray-600">Activités Génératrices de Revenus</p>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Icon name={iconMap.refresh} size="sm" />
          Actualiser
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total AGR"
          value={data.total_agr || 0}
          iconName={iconMap.activite}
          color="bg-blue-600"
        />
        <StatCard
          title="Producteurs avec AGR"
          value={data.producteurs_with_agr || 0}
          subtitle={data.producteurs_with_multiple_agr ? `${data.producteurs_with_multiple_agr} avec plusieurs AGR` : ''}
          iconName={iconMap.producteurs}
          color="bg-green-600"
        />
        <StatCard
          title="Revenu Total"
          value={formatCurrency(data.total_revenue || 0)}
          iconName={iconMap.production}
          color="bg-chick-yellow"
        />
        <StatCard
          title="Revenu Moyen"
          value={formatCurrency(calculateAverageRevenue(data))}
          iconName={iconMap.rendement}
          color="bg-gray-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AGR by Type - Pie Chart */}
        {data.by_type && Object.keys(data.by_type).length > 0 && (
          <ChartCard title="Répartition par Type d'AGR">
            <Pie
              data={{
                labels: Object.keys(data.by_type).map(type => formatAGRType(type)),
                datasets: [{
                  data: Object.values(data.by_type),
                  backgroundColor: [
                    '#3B82F6', // blue
                    '#10B981', // green
                    '#F59E0B', // amber
                    '#EF4444', // red
                    '#8B5CF6', // purple
                    '#EC4899', // pink
                  ],
                  borderWidth: 2,
                  borderColor: '#fff',
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
              plugins={[pieLabelPlugin]}
            />
          </ChartCard>
        )}

        {/* Average Revenue by Type - Bar Chart */}
        {data.average_revenue_by_type && Object.keys(data.average_revenue_by_type).length > 0 && (
          <ChartCard title="Revenu Moyen par Type d'AGR">
            <Bar
              data={{
                labels: Object.keys(data.average_revenue_by_type).map(type => formatAGRType(type)),
                datasets: [{
                  label: 'Revenu Moyen (Ar)',
                  data: Object.values(data.average_revenue_by_type),
                  backgroundColor: '#FCD34D',
                  borderRadius: 8,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `Revenu moyen: ${formatCurrency(context.parsed.y)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatCurrency(value, true)
                    }
                  }
                }
              }}
            />
          </ChartCard>
        )}
      </div>

      {/* Top 10 Producteurs by AGR Revenue */}
      {data.top_producteurs && data.top_producteurs.length > 0 && (
        <Card title="Top 10 Producteurs par Revenu AGR" padding="md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre d'AGR
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenu Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.top_producteurs.map((producteur, index) => (
                  <tr key={producteur.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 ? (
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                            index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-300' : 'bg-orange-400'
                          } text-white font-bold`}>
                            {index + 1}
                          </span>
                        ) : (
                          <span className="text-gray-600 font-medium">{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{producteur.code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{producteur.nom}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {producteur.agr_count} AGR
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(producteur.total_revenue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// Utility Components
const StatCard = memo(({ title, value, subtitle, iconName, color }) => {
  const textColor = color === 'bg-chick-yellow' ? 'text-gray-900' : 'text-white';
  
  return (
    <Card padding="md" className="hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-dark">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${color} w-14 h-14 rounded-full flex items-center justify-center`}>
          <Icon name={iconName} size="lg" className={textColor} />
        </div>
      </div>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

const ChartCard = memo(({ title, children }) => {
  return (
    <Card title={title} padding="md">
      <div className="h-64">
        {children}
      </div>
    </Card>
  );
});

ChartCard.displayName = 'ChartCard';

// Utility Functions
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
    'autre': 'Autre',
  };
  return typeMap[type] || type;
}

function calculateAverageRevenue(data) {
  if (!data || !data.total_revenue || !data.total_agr) return 0;
  return data.total_revenue / data.total_agr;
}

// Pie chart label plugin
const pieLabelPlugin = {
  id: 'pieLabelPlugin',
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    const dataset = data.datasets[0];
    if (!dataset) return;
    const total = dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);
    ctx.save();
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    chart.getDatasetMeta(0).data.forEach((arc, i) => {
      const value = Number(dataset.data[i]) || 0;
      if (value <= 0 || total <= 0) return;
      const pct = Math.round((value / total) * 100);
      const { x, y } = arc.tooltipPosition();
      ctx.fillText(`${pct}%`, x, y);
    });
    ctx.restore();
  }
};

export default AGRStats;
