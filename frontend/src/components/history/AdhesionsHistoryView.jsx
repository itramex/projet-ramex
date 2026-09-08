import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import Card from '../common/Card';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';
import api from '../../services/api';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function AdhesionsHistoryView() {
  console.log('AdhesionsHistoryView component mounted');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cooperatives, setCooperatives] = useState([]);
  const [filters, setFilters] = useState({
    annee_debut: '',
    annee_fin: '',
    cooperative: ''
  });
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    console.log('useEffect triggered, fetching data...');
    fetchData();
    fetchCooperatives();
    // Chargement initial au montage uniquement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (customFilters = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Utiliser les filtres passés en paramètre ou les filtres actuels
      const activeFilters = customFilters || filters;
      
      // Construire les paramètres de requête
      const params = new URLSearchParams();
      if (activeFilters.annee_debut) params.append('annee_debut', activeFilters.annee_debut);
      if (activeFilters.annee_fin) params.append('annee_fin', activeFilters.annee_fin);
      if (activeFilters.cooperative) params.append('cooperative', activeFilters.cooperative);
      
      console.log('Fetching adhesions data with filters:', activeFilters);
      console.log('URL params:', params.toString());
      const response = await api.get(`/history/producteur-snapshots/adhesions_par_annee/?${params}`);
      console.log('Adhesions data received:', response.data);
      setData(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des adhésions:', err);
      console.error('Error details:', err.response?.data);
      setError('Impossible de charger les données d\'adhésion');
    } finally {
      setLoading(false);
    }
  };

  const fetchCooperatives = async () => {
    try {
      console.log('Fetching cooperatives...');
      const response = await api.get('/cooperatives/');
      console.log('Cooperatives received:', response.data);
      setCooperatives(response.data.results || response.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des coopératives:', err);
      // Ne pas bloquer l'affichage si les coopératives ne se chargent pas
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    console.log('Applying filters:', filters);
    fetchData(filters);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chick-yellow"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <Icon name={iconMap.alerte} size="lg" className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-chick-yellow text-dark rounded-lg hover:bg-yellow-500"
          >
            Réessayer
          </button>
        </div>
      </Card>
    );
  }

  if (!data || !data.par_annee || data.par_annee.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <Icon name={iconMap.info} size="lg" className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucune donnée d'adhésion disponible</p>
        </div>
      </Card>
    );
  }

  // Préparer les données pour les graphiques
  const chartLabels = data.par_annee.map(a => a.annee.toString());
  
  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Total Producteurs',
        data: data.par_annee.map(a => a.total_producteurs),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const barChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Nouveaux',
        data: data.par_annee.map(a => a.nouveaux_producteurs),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
      },
      {
        label: 'Sortis',
        data: data.par_annee.map(a => a.producteurs_sortis),
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name={iconMap.filtre} size="sm" />
          Filtres
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Année début
            </label>
            <input
              type="number"
              value={filters.annee_debut}
              onChange={(e) => handleFilterChange('annee_debut', e.target.value)}
              placeholder="Ex: 2023"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-chick-yellow focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Année fin
            </label>
            <input
              type="number"
              value={filters.annee_fin}
              onChange={(e) => handleFilterChange('annee_fin', e.target.value)}
              placeholder="Ex: 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-chick-yellow focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coopérative
            </label>
            <select
              value={filters.cooperative}
              onChange={(e) => handleFilterChange('cooperative', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-chick-yellow focus:border-transparent"
            >
              <option value="">Toutes les coopératives</option>
              {cooperatives.map((coop) => (
                <option key={coop.id} value={coop.id}>
                  {coop.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleApplyFilters}
            className="px-6 py-2 bg-chick-yellow text-dark font-medium rounded-lg hover:bg-yellow-500 transition-colors"
          >
            Appliquer les filtres
          </button>
          <button
            onClick={() => {
              const emptyFilters = { annee_debut: '', annee_fin: '', cooperative: '' };
              setFilters(emptyFilters);
              fetchData(emptyFilters);
            }}
            className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </Card>

      {/* Statistiques Globales */}
      {data.statistiques_globales && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Période</p>
                <p className="text-2xl font-bold text-dark">
                  {data.statistiques_globales.periode}
                </p>
              </div>
              <Icon name={iconMap.calendrier} size="lg" className="text-chick-yellow" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Nouveaux</p>
                <p className="text-2xl font-bold text-green-600">
                  +{data.statistiques_globales.total_nouveaux}
                </p>
              </div>
              <Icon name={iconMap.producteur} size="lg" className="text-green-600" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sortis</p>
                <p className="text-2xl font-bold text-red-600">
                  -{data.statistiques_globales.total_sortis}
                </p>
              </div>
              <Icon name={iconMap.alerte} size="lg" className="text-red-600" />
            </div>
          </Card>

        </div>
      )}

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4">Évolution du Nombre de Producteurs</h3>
          <div style={{ height: '300px' }}>
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4">Nouveaux vs Sortis par Année</h3>
          <div style={{ height: '300px' }}>
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </Card>
      </div>

      {/* Tableau Détaillé */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name={iconMap.liste} size="sm" />
          Détails par Année
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Année
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nouveaux
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sortis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Croissance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hommes / Femmes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.par_annee.map((annee) => (
                <React.Fragment key={annee.annee}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{annee.annee}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{annee.total_producteurs}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        +{annee.nouveaux_producteurs}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        -{annee.producteurs_sortis}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${annee.taux_croissance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {annee.taux_croissance > 0 ? '+' : ''}{annee.taux_croissance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {annee.par_sexe.M || 0} / {annee.par_sexe.F || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedYear(selectedYear === annee.annee ? null : annee.annee)}
                        className="text-chick-yellow hover:text-yellow-600 font-medium"
                      >
                        {selectedYear === annee.annee ? 'Masquer' : 'Voir détails'}
                      </button>
                    </td>
                  </tr>
                  {selectedYear === annee.annee && annee.nouveaux_details && annee.nouveaux_details.length > 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 bg-gray-50">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700">
                            Nouveaux producteurs en {annee.annee} (premiers 10):
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {annee.nouveaux_details.map((prod, idx) => (
                              <div key={idx} className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                                <span className="font-medium">{prod.code}</span> - {prod.nom} {prod.prenom}
                                <br />
                                <span className="text-xs text-gray-500">
                                  {prod.commune} / {prod.village} / {prod.cooperative_nom}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default AdhesionsHistoryView;
