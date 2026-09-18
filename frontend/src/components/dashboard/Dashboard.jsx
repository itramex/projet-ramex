import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { dashboardService } from '../../services/api';
import Icon from '../common/Icon';
import Card from '../common/Card';
import { iconMap } from '../../styles/icons';
import AGRStats from './AGRStats';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [productionData, setProductionData] = useState(null);
  const [decisionData, setDecisionData] = useState(null);
  const [socialData, setSocialData] = useState(null);
  const [socialSubTab, setSocialSubTab] = useState('hygiene');
  const [cultureDetail, setCultureDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    villages: [],
    communes: [],
    fokontanys: [],
    culture: [],
    certification: [],
    dateFrom: '',
    dateTo: ''
  });
  const [villagesCommunes, setVillagesCommunes] = useState({ villages: [], communes: [], fokontanys: [] });
  const [showVillageDropdown, setShowVillageDropdown] = useState(false);
  const [showCommuneDropdown, setShowCommuneDropdown] = useState(false);
  const [showFokontanyDropdown, setShowFokontanyDropdown] = useState(false);
  const [showCultureDropdown, setShowCultureDropdown] = useState(false);
  const [showCertificationDropdown, setShowCertificationDropdown] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      filters.villages.forEach(v => params.append('village', v));
      filters.communes.forEach(c => params.append('commune', c));
      filters.fokontanys.forEach(f => params.append('fokontany', f));
      const response = await dashboardService.getGlobal(params);
      setData(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadVillagesCommunes = useCallback(async () => {
    try {
      const response = await dashboardService.getVillagesAndCommunes();
      setVillagesCommunes(response.data);
    } catch (error) {
      console.error('Erreur chargement villages/communes:', error);
    }
  }, []);

  const loadProductionData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Ajouter les villages sélectionnés
      filters.villages.forEach(village => {
        params.append('village', village);
      });

      // Ajouter les communes sélectionnées
      filters.communes.forEach(commune => {
        params.append('commune', commune);
      });

      // Ajouter les cultures sélectionnées (#16 multi)
      filters.culture.forEach(culture => {
        params.append('culture', culture);
      });

      const response = await dashboardService.getProduction(params);
      setProductionData(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadDecisionData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      filters.villages.forEach(village => params.append('village', village));
      filters.communes.forEach(commune => params.append('commune', commune));
      filters.certification.forEach(certification => params.append('certification', certification));
      if (filters.dateFrom) {
        params.append('date_from', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('date_to', filters.dateTo);
      }

      const response = await dashboardService.getDecisionnel(params);
      setDecisionData(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadCultureDetail = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      filters.villages.forEach(village => params.append('village', village));
      filters.communes.forEach(commune => params.append('commune', commune));
      filters.culture.forEach(culture => params.append('culture', culture));
      const response = await dashboardService.getProductionParCulture(params);
      setCultureDetail(response.data);
    } catch (error) {
      console.error('Erreur chargement production par culture:', error);
    }
  }, [filters]);

  const loadSocialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      filters.villages.forEach(v => params.append('village', v));
      filters.communes.forEach(c => params.append('commune', c));
      filters.fokontanys.forEach(f => params.append('fokontany', f));
      const [hygiene, enfants, environnement, evolution] = await Promise.all([
        dashboardService.getHygiene(params),
        dashboardService.getEnfants(params),
        dashboardService.getEnvironnement(params),
        dashboardService.getScolarisationEvolution(params),
      ]);
      setSocialData({
        hygiene: hygiene.data,
        enfants: enfants.data,
        environnement: environnement.data,
        scolarisationEvolution: evolution.data,
      });
    } catch (error) {
      setError(error.response?.data?.detail || error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Effets déclarés APRÈS les useCallback (sinon erreur TDZ « Cannot access
  // 'loadDashboard' before initialization » → page blanche)
  useEffect(() => {
    loadDashboard();
    loadVillagesCommunes();
  }, [loadDashboard, loadVillagesCommunes]);

  useEffect(() => {
    if (activeTab === 'production') {
      loadProductionData();
      loadCultureDetail();
    }
    if (activeTab === 'decisionnel') {
      loadDecisionData();
    }
    if (activeTab === 'social') {
      loadSocialData();
    }
  }, [activeTab, filters, loadProductionData, loadCultureDetail, loadDecisionData, loadSocialData]);

  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  }, []);

  const toggleVillage = useCallback((village) => {
    setFilters(prev => ({
      ...prev,
      villages: prev.villages.includes(village)
        ? prev.villages.filter(v => v !== village)
        : [...prev.villages, village]
    }));
  }, []);

  const toggleCommune = useCallback((commune) => {
    setFilters(prev => ({
      ...prev,
      communes: prev.communes.includes(commune)
        ? prev.communes.filter(c => c !== commune)
        : [...prev.communes, commune]
    }));
  }, []);

  const toggleFokontany = useCallback((fokontany) => {
    setFilters(prev => ({
      ...prev,
      fokontanys: prev.fokontanys.includes(fokontany)
        ? prev.fokontanys.filter(f => f !== fokontany)
        : [...prev.fokontanys, fokontany]
    }));
  }, []);

  // #16 : multi-sélection culture / certification
  const toggleCulture = useCallback((culture) => {
    setFilters(prev => ({
      ...prev,
      culture: prev.culture.includes(culture)
        ? prev.culture.filter(c => c !== culture)
        : [...prev.culture, culture]
    }));
  }, []);

  const toggleCertification = useCallback((certification) => {
    setFilters(prev => ({
      ...prev,
      certification: prev.certification.includes(certification)
        ? prev.certification.filter(c => c !== certification)
        : [...prev.certification, certification]
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      villages: [],
      communes: [],
      fokontanys: [],
      culture: [],
      certification: [],
      dateFrom: '',
      dateTo: ''
    });
  }, []);

  // Ne bloquer l'affichage que lors du tout premier chargement : sinon chaque
  // changement de filtre démonterait la page (dont les listes déroulantes de
  // filtres) et provoquerait un flash « Chargement du dashboard... ».
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-yellow mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <Icon name={iconMap.warningTriangle} size="xl" className="text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDashboard}
            className="bg-primary-yellow text-dark px-6 py-2 rounded-lg font-semibold hover:bg-yellow-500"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Icon name={iconMap.emptyBox} size="xl" className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Aucune donnée disponible</p>
        </div>
      </div>
    );
  }
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark mb-2">
          Tableau de <span className="text-primary-yellow">Bord</span>
        </h1>
        <p className="text-gray-600">Vue d'ensemble des producteurs</p>
      </div>

      {/* Tabs */}
      <Card padding="none" className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview'
                  ? 'border-chick-yellow text-chick-yellow'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Icon name={iconMap.chiffresClés} size="sm" />
              Chiffres clés
            </button>
            <button
              onClick={() => setActiveTab('production')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'production'
                  ? 'border-chick-yellow text-chick-yellow'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Icon name={iconMap.estimationsProduction} size="sm" />
              Estimations de Production
            </button>
            <button
              onClick={() => setActiveTab('agr')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'agr'
                  ? 'border-chick-yellow text-chick-yellow'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Icon name={iconMap.activite} size="sm" />
              AGR
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'social'
                  ? 'border-chick-yellow text-chick-yellow'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Icon name={iconMap.social} size="sm" />
              Social
            </button>
            <button
              onClick={() => setActiveTab('decisionnel')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'decisionnel'
                  ? 'border-chick-yellow text-chick-yellow'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Icon name={iconMap.dashboard} size="sm" />
              Décisionnel
            </button>
          </nav>
        </div>
      </Card>

      {/* Affichage conditionnel selon l'onglet */}
      {activeTab === 'overview' ? (
        <OverviewTab
          data={data}
          filters={filters}
          villagesCommunes={villagesCommunes}
          showVillageDropdown={showVillageDropdown}
          setShowVillageDropdown={setShowVillageDropdown}
          showCommuneDropdown={showCommuneDropdown}
          setShowCommuneDropdown={setShowCommuneDropdown}
          showFokontanyDropdown={showFokontanyDropdown}
          setShowFokontanyDropdown={setShowFokontanyDropdown}
          toggleVillage={toggleVillage}
          toggleCommune={toggleCommune}
          toggleFokontany={toggleFokontany}
          resetFilters={resetFilters}
          applyFilters={loadDashboard}
        />
      ) : activeTab === 'production' ? (
        <ProductionTab
          data={productionData}
          cultureData={cultureDetail}
          filters={filters}
          villagesCommunes={villagesCommunes}
          toggleVillage={toggleVillage}
          toggleCommune={toggleCommune}
          onResetFilters={resetFilters}
          showVillageDropdown={showVillageDropdown}
          setShowVillageDropdown={setShowVillageDropdown}
          showCommuneDropdown={showCommuneDropdown}
          setShowCommuneDropdown={setShowCommuneDropdown}
          toggleCulture={toggleCulture}
          showCultureDropdown={showCultureDropdown}
          setShowCultureDropdown={setShowCultureDropdown}
          toggleCertification={toggleCertification}
        />
      ) : activeTab === 'agr' ? (
        <AGRStats filters={filters} />
      ) : activeTab === 'social' ? (
        <SocialTab
          data={socialData}
          subTab={socialSubTab}
          onSubTabChange={setSocialSubTab}
        />
      ) : activeTab === 'decisionnel' ? (
        <DecisionTab
          data={decisionData}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={loadDecisionData}
          onResetFilters={resetFilters}
          toggleCertification={toggleCertification}
          showCertificationDropdown={showCertificationDropdown}
          setShowCertificationDropdown={setShowCertificationDropdown}
        />
      ) : null}
    </div>
  );
}

// ========== Onglet Vue d'ensemble ==========

// Plugin Chart.js pour afficher les pourcentages sur les graphiques (stable, hors composant)
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

const OverviewTab = memo(({ data, filters, villagesCommunes, showVillageDropdown, setShowVillageDropdown, showCommuneDropdown, setShowCommuneDropdown, showFokontanyDropdown, setShowFokontanyDropdown, toggleVillage, toggleCommune, toggleFokontany, resetFilters, applyFilters }) => {
  // Chart data mémoisés pour éviter les re-renders inutiles
  // (hooks appelés inconditionnellement — règles des hooks React)
  const genreChartData = useMemo(() => ({
    labels: data?.demographics?.par_genre?.map(g => g.sexe === 'M' ? 'Masculin' : 'Féminin') || [],
    datasets: [{
      data: data?.demographics?.par_genre?.map(g => g.count) || [],
      backgroundColor: ['#4B5563', '#FCD34D'],
      borderWidth: 2,
      borderColor: '#fff',
    }]
  }), [data?.demographics?.par_genre]);

  const ageChartData = useMemo(() => ({
    labels: data?.demographics?.age_distribution?.map(g => g.groupe) || [],
    datasets: [
      {
        label: 'Hommes',
        data: data?.demographics?.age_distribution?.map(g => g.hommes_abs || g.hommes) || [],
        backgroundColor: '#4B5563',
        borderRadius: 8,
      },
      {
        label: 'Femmes',
        data: data?.demographics?.age_distribution?.map(g => g.femmes_abs || g.femmes) || [],
        backgroundColor: '#FCD34D',
        borderRadius: 8,
      }
    ]
  }), [data?.demographics?.age_distribution]);

  if (!data) return null;

  return (
    <>
      {/* Filtres (Overview) */}
      <Card title="Filtres" padding="md" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Multi-select Village */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Village(s)</label>
            <button
              onClick={() => setShowVillageDropdown(!showVillageDropdown)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow bg-white text-left flex justify-between items-center"
            >
              <span className={filters.villages.length === 0 ? 'text-gray-400' : 'text-dark'}>
                {filters.villages.length === 0
                  ? 'Tous les villages'
                  : `${filters.villages.length} village(s)`}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showVillageDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {villagesCommunes.villages.map((village, index) => (
                  <label key={index} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.villages.includes(village)}
                      onChange={() => toggleVillage(village)}
                      className="mr-2 h-4 w-4 text-chick-yellow focus:ring-chick-yellow border-gray-300 rounded"
                    />
                    <span className="text-sm">{village}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Multi-select Commune */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Commune(s)</label>
            <button
              onClick={() => setShowCommuneDropdown(!showCommuneDropdown)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow bg-white text-left flex justify-between items-center"
            >
              <span className={filters.communes.length === 0 ? 'text-gray-400' : 'text-dark'}>
                {filters.communes.length === 0
                  ? 'Toutes les communes'
                  : `${filters.communes.length} commune(s)`}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCommuneDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {villagesCommunes.communes.map((commune, index) => (
                  <label key={index} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.communes.includes(commune)}
                      onChange={() => toggleCommune(commune)}
                      className="mr-2 h-4 w-4 text-chick-yellow focus:ring-chick-yellow border-gray-300 rounded"
                    />
                    <span className="text-sm">{commune}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Multi-select Fokontany */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Fokontany</label>
            <button
              onClick={() => setShowFokontanyDropdown(!showFokontanyDropdown)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow bg-white text-left flex justify-between items-center"
            >
              <span className={filters.fokontanys.length === 0 ? 'text-gray-400' : 'text-dark'}>
                {filters.fokontanys.length === 0
                  ? 'Tous les fokontany'
                  : `${filters.fokontanys.length} sélectionné(s)`}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showFokontanyDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {villagesCommunes.fokontanys?.map((fk, index) => (
                  <label key={index} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.fokontanys.includes(fk)}
                      onChange={() => toggleFokontany(fk)}
                      className="mr-2 h-4 w-4 text-chick-yellow focus:ring-chick-yellow border-gray-300 rounded"
                    />
                    <span className="text-sm">{fk}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Boutons */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-primary-yellow text-dark rounded-md hover:bg-yellow-500 transition-colors"
          >
            Appliquer
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </Card>
      {/* Cards statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Producteurs"
          value={(data.global?.total_filtres ?? data.global?.total) || 0}
          iconName={iconMap.totalProducteurs}
          color="bg-gray-600"
        />
        <StatCard
          title="Producteurs Actifs"
          value={(data.global?.actifs_filtres ?? data.global?.actifs) || 0}
          subtitle={`${(data.global?.taux_actifs_filtres ?? data.global?.taux_actifs) || 0}%`}
          iconName={iconMap.producteursActifs}
          color="bg-green-600"
        />
        <StatCard
          title="Femmes Leaders"
          value={data.leadership?.femmes_leaders || 0}
          subtitle={`${data.leadership?.pourcentage_leaders || 0}%`}
          iconName={iconMap.femmesLeaders}
          color="bg-chick-yellow"
        />
        <StatCard
          title="Paysans Relais"
          value={data.leadership?.paysans_relais || 0}
          iconName={iconMap.paysansRelais}
          color="bg-gray-700"
        />
      </div>

      {/* Message si pas de producteurs */}
      {data.global?.total_filtres === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 text-lg font-medium mb-2">
            Aucun producteur enregistré
          </p>
          <p className="text-yellow-700 mb-4">
            Commencez par ajouter des producteurs pour voir les statistiques
          </p>
          <a
            href="/producteurs"
            className="inline-block bg-primary-yellow text-dark px-6 py-2 rounded-lg font-semibold hover:bg-yellow-500"
          >
            Ajouter un producteur
          </a>
        </div>
      )}

      {/* Graphiques - Seulement si données disponibles */}
      {data.global?.total_filtres > 0 && (
        <>
          {/* Graphiques principaux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Répartition par genre */}
            {data.demographics?.par_genre?.length > 0 && (
              <ChartCard title="Répartition par Genre">
                <Pie
                  data={genreChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      }
                    }
                  }}
                  plugins={[pieLabelPlugin]}
                />
              </ChartCard>
            )}

            {/* Répartition par âge et sexe (nombres absolus) */}
            {data.demographics?.age_distribution?.length > 0 && (
              <ChartCard title="Répartition par Âge (Hommes vs Femmes)">
                <Bar
                  data={ageChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                      tooltip: {
                        callbacks: {
                          afterBody: (items) => {
                            // Afficher aussi les pourcentages
                            const idx = items[0]?.dataIndex ?? 0;
                            const g = data.demographics.age_distribution[idx];
                            return [`Pourcentage hommes: ${g.hommes_pct}%`, `Pourcentage femmes: ${g.femmes_pct}%`];
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (val) => val
                        }
                      }
                    }
                  }}
                />
              </ChartCard>
            )}
          </div>
        </>
      )}
    </>
  );
});

OverviewTab.displayName = 'OverviewTab';

// ========== Onglet Production ==========
const ProductionTab = memo(({ data, cultureData, filters, villagesCommunes, toggleVillage, toggleCommune, onResetFilters, showVillageDropdown, setShowVillageDropdown, showCommuneDropdown, setShowCommuneDropdown, toggleCulture, showCultureDropdown, setShowCultureDropdown, toggleCertification }) => {
  if (!data) {
    return (
      <div className="text-center py-12">
        <Icon name={iconMap.estimationsProduction} size="xl" className="text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Chargement des données de production...</p>
      </div>
    );
  }

  return (
    <>
      {/* Filtres */}
      <Card title="Filtres" padding="md" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Multi-select Village */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Village(s)</label>
            <button
              onClick={() => setShowVillageDropdown(!showVillageDropdown)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow bg-white text-left flex justify-between items-center"
            >
              <span className={filters.villages.length === 0 ? 'text-gray-400' : 'text-dark'}>
                {filters.villages.length === 0
                  ? 'Tous les villages'
                  : `${filters.villages.length} village(s)`}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showVillageDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {villagesCommunes.villages.map((village, index) => (
                  <label key={index} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.villages.includes(village)}
                      onChange={() => toggleVillage(village)}
                      className="mr-2 h-4 w-4 text-chick-yellow focus:ring-chick-yellow border-gray-300 rounded"
                    />
                    <span className="text-sm">{village}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Multi-select Commune */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Commune(s)</label>
            <button
              onClick={() => setShowCommuneDropdown(!showCommuneDropdown)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow bg-white text-left flex justify-between items-center"
            >
              <span className={filters.communes.length === 0 ? 'text-gray-400' : 'text-dark'}>
                {filters.communes.length === 0
                  ? 'Toutes les communes'
                  : `${filters.communes.length} commune(s)`}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCommuneDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {villagesCommunes.communes.map((commune, index) => (
                  <label key={index} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.communes.includes(commune)}
                      onChange={() => toggleCommune(commune)}
                      className="mr-2 h-4 w-4 text-chick-yellow focus:ring-chick-yellow border-gray-300 rounded"
                    />
                    <span className="text-sm">{commune}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Multi-select Culture (#16) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Culture(s)</label>
            <button
              type="button"
              onClick={() => setShowCultureDropdown(!showCultureDropdown)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-left flex justify-between items-center"
            >
              <span className={filters.culture.length === 0 ? 'text-gray-400' : 'text-dark'}>
                {filters.culture.length === 0
                  ? 'Toutes les cultures'
                  : `${filters.culture.length} culture(s)`}
              </span>
              <span className="text-gray-400">▾</span>
            </button>
            {showCultureDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {[['vanille', 'Vanille'], ['cafe', 'Café'], ['girofle', 'Girofle'], ['cacao', 'Cacao'], ['poivre', 'Poivre'], ['autre', 'Autre']].map(([value, label], index) => (
                  <label key={`culture-${index}`} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.culture.includes(value)}
                      onChange={() => toggleCulture(value)}
                      className="mr-3 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Bouton Réinitialiser */}
          <div className="flex items-end">
            <button
              onClick={onResetFilters}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Affichage des filtres actifs */}
        {(filters.villages.length > 0 || filters.communes.length > 0 || filters.culture.length > 0 || filters.certification.length > 0) && (
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Filtres actifs:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.communes.map((commune, index) => (
                <span key={`commune-${index}`} className="bg-gray-100 text-gray-800 border border-gray-300 px-3 py-1 rounded-full flex items-center gap-2">
                  <span>{commune}</span>
                  <button onClick={() => toggleCommune(commune)} className="hover:text-gray-900">×</button>
                </span>
              ))}
              {filters.villages.map((village, index) => (
                <span key={`village-${index}`} className="bg-gray-100 text-gray-800 border border-gray-300 px-3 py-1 rounded-full flex items-center gap-2">
                  <span>{village}</span>
                  <button onClick={() => toggleVillage(village)} className="hover:text-gray-900">×</button>
                </span>
              ))}
              {filters.culture.map((culture, index) => (
                <span key={`culture-${index}`} className="bg-yellow-50 text-gray-800 border border-yellow-300 px-3 py-1 rounded-full flex items-center gap-2">
                  <span className="capitalize">{culture}</span>
                  <button onClick={() => toggleCulture(culture)} className="hover:text-gray-900">×</button>
                </span>
              ))}
              {filters.certification.map((cert, index) => (
                <span key={`cert-${index}`} className="bg-blue-50 text-gray-800 border border-blue-300 px-3 py-1 rounded-full flex items-center gap-2">
                  <span className="uppercase">{cert}</span>
                  <button onClick={() => toggleCertification(cert)} className="hover:text-gray-900">×</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Cards statistiques de production */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Parcelles"
          value={data.global?.total_parcelles || 0}
          iconName={iconMap.totalParcelles}
          color="bg-green-600"
        />
        <StatCard
          title="Superficie Totale"
          value={`${Number(data.global?.total_superficie_ha || 0).toFixed(2)} ha`}
          iconName={iconMap.superficie}
          color="bg-gray-600"
        />
        <StatCard
          title="Production Estimée"
          value={`${Number(data.global?.total_production_estimee_kg || 0).toFixed(2)} kg`}
          iconName={iconMap.production}
          color="bg-chick-yellow"
        />
        <StatCard
          title="Rendement Moyen"
          value={`${Number(data.global?.rendement_moyen_kg_ha || 0).toFixed(2)} kg/ha`}
          iconName={iconMap.rendement}
          color="bg-gray-700"
        />
      </div>

      {/* Graphiques de production */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Production par culture */}
        {data.par_culture?.length > 0 && (
          <ChartCard title="Production par Culture">
            <Bar
              data={{
                labels: data.par_culture.map(c => {
                  const labels = { vanille: 'Vanille', cafe: 'Café', girofle: 'Girofle', autre: 'Autre' };
                  return labels[c.culture_principale] || c.culture_principale;
                }),
                datasets: [{
                  label: 'Production (kg)',
                  data: data.par_culture.map(c => c.production_estimee || 0),
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
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  }
                }
              }}
            />
          </ChartCard>
        )}

        {/* Top 10 Villages par production */}
        {data.par_village?.length > 0 && (
          <ChartCard title="Top 10 Villages par Production">
            <Bar
              data={{
                labels: data.par_village.map(v => v.producteur__village || 'Non spécifié'),
                datasets: [{
                  label: 'Production (kg)',
                  data: data.par_village.map(v => v.production_estimee || 0),
                  backgroundColor: '#6B7280',
                  borderRadius: 8,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    display: false,
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  }
                }
              }}
            />
          </ChartCard>
        )}
      </div>

      {/* Productions détaillées par culture (multi-cultures par parcelle) */}
      {cultureData?.productions_par_culture?.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-dark">
              Productions détaillées par culture
              <span className="ml-2 text-sm font-normal text-gray-500">
                (chaque parcelle compte pour chacune de ses cultures — {cultureData.nb_cultures_differentes} culture{cultureData.nb_cultures_differentes > 1 ? 's' : ''})
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Culture</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Production totale</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Parcelles</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Moyenne / parcelle</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cultureData.productions_par_culture.map((item, index) => {
                  const share = cultureData.total_production_kg > 0
                    ? Math.round((item.production_totale_kg / cultureData.total_production_kg) * 100)
                    : 0;
                  const cultureLabels = { vanille: 'Vanille', cafe: 'Café', girofle: 'Girofle', cacao: 'Cacao', poivre: 'Poivre', autre: 'Autre' };
                  const cultureName = cultureLabels[item.culture] || item.culture;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{cultureName}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{Number(item.production_totale_kg || 0).toLocaleString('fr-FR')} kg</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{item.nb_parcelles}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{Number(item.production_moyenne_kg || 0).toLocaleString('fr-FR')} kg</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{share} %</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{Number(cultureData.total_production_kg || 0).toLocaleString('fr-FR')} kg</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* #36 — Réalisations réelles par année (non cumulé) */}
      {data.realisations?.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-dark">
              Réalisations réelles par année
              <span className="ml-2 text-sm font-normal text-gray-500">
                (production enregistrée — chaque année affichée séparément, total non cumulé)
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Année</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Culture</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Production réelle</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenu (Ar)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.realisations.map((item, index) => {
                  const cultureLabels = { vanille: 'Vanille', cafe: 'Café', girofle: 'Girofle', cacao: 'Cacao', poivre: 'Poivre', autre: 'Autre' };
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.annee}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 capitalize">{cultureLabels[item.culture] || item.culture}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{Number(item.produite_kg || 0).toLocaleString('fr-FR')} kg</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{Number(item.revenu_ar || 0).toLocaleString('fr-FR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* #36 — Résilience autres produits (AGR) : vendu vs consommé */}
      {data.resilience_agr?.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-dark">
              Autres produits (AGR) — Vendu vs Consommé
              <span className="ml-2 text-sm font-normal text-gray-500">(par année, non cumulé)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Année</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Vendu</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% vendu</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Consommé</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% consommé</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.resilience_agr.map((item, index) => {
                  const typeLabels = { pisciculture: 'Pisciculture', aviculture: 'Aviculture', autre: 'Autre' };
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.annee}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{typeLabels[item.type_agr] || item.type_agr}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{Number(item.produite || 0).toLocaleString('fr-FR')}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{Number(item.vendue || 0).toLocaleString('fr-FR')}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{item.pct_vendu !== null ? `${item.pct_vendu} %` : '—'}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{Number(item.consommee || 0).toLocaleString('fr-FR')}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{item.pct_consomme !== null ? `${item.pct_consomme} %` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Détail par culture - Cards enrichies */}
      {data.par_culture?.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-dark">Détail par Culture</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.par_culture.map((item, index) => {
                const getCultureIcon = (culture) => {
                  const cultureLower = String(culture).toLowerCase();
                  if (cultureLower.includes('vanille')) return '🌿';
                  if (cultureLower.includes('cafe') || cultureLower.includes('café')) return '☕';
                  if (cultureLower.includes('girofle')) return '🌺';
                  if (cultureLower.includes('cacao')) return '🍫';
                  if (cultureLower.includes('poivre')) return '🌶️';
                  return '🌾';
                };

                const totalProduction = data.global?.total_production_estimee_kg || 1;
                const cultureLabels = { vanille: 'Vanille', cafe: 'Café', girofle: 'Girofle', autre: 'Autre' };
                const cultureName = cultureLabels[item.culture_principale] || item.culture_principale;

                return (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{getCultureIcon(item.culture_principale)}</span>
                        <div>
                          <h4 className="font-bold text-gray-800 capitalize">{cultureName}</h4>
                          <p className="text-xs text-gray-500">{item.nb_parcelles} parcelle{item.nb_parcelles > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Production totale</span>
                        <span className="font-bold text-amber-600">{Number(item.production_estimee || 0).toFixed(2)} kg</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Superficie</span>
                        <span className="font-semibold text-gray-700">{Number(item.superficie_totale || 0).toFixed(2)} ha</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Rendement</span>
                        <span className="font-semibold text-gray-700">
                          {item.superficie_totale > 0
                            ? Number((item.production_estimee || 0) / item.superficie_totale).toFixed(2)
                            : 0} kg/ha
                        </span>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Part du total</span>
                          <span className="text-xs font-semibold text-green-600">
                            {((item.production_estimee / totalProduction) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${(item.production_estimee / totalProduction) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {data.par_culture.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg mb-2">📊</p>
                <p>Aucune donnée de production disponible</p>
                <p className="text-sm mt-1">Ajoutez des estimations de production dans les parcelles</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Producteurs */}
      {data.top_producteurs?.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-dark">Top 10 Producteurs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nb Parcelles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Superficie (ha)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Production Estimée (kg)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.top_producteurs.map((prod, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {prod.producteur__code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prod.producteur__nom} {prod.producteur__prenom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prod.nb_parcelles}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(prod.superficie_totale || 0).toFixed(2)} ha
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(prod.production_estimee || 0).toFixed(2)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
});

ProductionTab.displayName = 'ProductionTab';

const DecisionTab = memo(({ data, filters, onFilterChange, onApplyFilters, onResetFilters, toggleCertification, showCertificationDropdown, setShowCertificationDropdown }) => {
  const [exporting, setExporting] = useState('');

  const downloadExport = async (format) => {
    setExporting(format);
    try {
      const params = {};
      if (filters.certification?.length) params.certification = filters.certification;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.villages?.length) params.village = filters.villages;
      if (filters.communes?.length) params.commune = filters.communes;

      const response = await dashboardService.exportDecisionnel(format, params);
      const blob = new Blob([response.data], {
        type: format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      link.href = url;
      link.download = `dashboard_decisionnel.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data?.detail || "Erreur lors de l'export");
    } finally {
      setExporting('');
    }
  };

  if (!data) {
    return (
      <div className="text-center py-12">
        <Icon name={iconMap.dashboard} size="xl" className="text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Chargement du tableau decisionnel...</p>
      </div>
    );
  }

  const comparatif = data.commercial?.comparatif_mensuel || [];
  const anomalies = data.tracabilite?.top_anomalies || [];

  return (
    <>
      <Card title="Filtres decisionnels" padding="md" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date debut</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Certification(s)</label>
            <button
              type="button"
              onClick={() => setShowCertificationDropdown(!showCertificationDropdown)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-left flex justify-between items-center"
            >
              <span className={filters.certification.length === 0 ? 'text-gray-400' : 'text-dark'}>
                {filters.certification.length === 0
                  ? 'Toutes les certifications'
                  : `${filters.certification.length} certification(s)`}
              </span>
              <span className="text-gray-400">▾</span>
            </button>
            {showCertificationDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {['bio', 'ra', 'rauebt', 'ffl', 'g4g'].map((cert, index) => (
                  <label key={`cert-${index}`} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.certification.includes(cert)}
                      onChange={() => toggleCertification(cert)}
                      className="mr-3 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <span className="text-sm uppercase">{cert}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={onApplyFilters}
              className="px-4 py-2 bg-primary-yellow text-dark rounded-md hover:bg-yellow-500"
            >
              Appliquer
            </button>
            <button
              onClick={onResetFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Reinitialiser
            </button>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => downloadExport('excel')}
              disabled={!!exporting}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {exporting === 'excel' ? 'Export...' : 'Excel'}
            </button>
            <button
              onClick={() => downloadExport('pdf')}
              disabled={!!exporting}
              className="px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 disabled:opacity-50"
            >
              {exporting === 'pdf' ? 'Export...' : 'PDF'}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Collecte / Estimation" value={`${data.commercial?.couverture_collecte_pct || 0}%`} iconName={iconMap.estimationsProduction} color="bg-green-600" />
        <StatCard title="Tracabilite complete" value={`${data.tracabilite?.taux_completude_pct || 0}%`} iconName={iconMap.tracabilite} color="bg-gray-700" />
        <StatCard title="Femmes leaders" value={`${data.impact?.taux_femmes_leaders_pct || 0}%`} iconName={iconMap.femmesLeaders} color="bg-chick-yellow" />
        <StatCard title="Kits couverts" value={`${data.impact?.couverture_kits_pct || 0}%`} iconName={iconMap.activite} color="bg-gray-600" />
      </div>

      {comparatif.length > 0 && (
        <ChartCard title="Comparatif mensuel: objectif vs collecte">
          <Line
            data={{
              labels: comparatif.map(i => i.mois),
              datasets: [
                {
                  label: 'Objectif (kg)',
                  data: comparatif.map(i => i.objectif_kg),
                  borderColor: '#6b7280',
                  backgroundColor: '#6b728033',
                  tension: 0.35,
                },
                {
                  label: 'Collecte reelle (kg)',
                  data: comparatif.map(i => i.collecte_kg),
                  borderColor: '#16a34a',
                  backgroundColor: '#16a34a33',
                  tension: 0.35,
                },
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } }
            }}
          />
        </ChartCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
        <Card title="Vue Commerciale" padding="md">
          <div className="space-y-2 text-sm text-gray-700">
            <p>Estimation: <span className="font-semibold">{Number(data.commercial?.estimation_production_kg || 0).toFixed(2)} kg</span></p>
            <p>Collecte reelle: <span className="font-semibold">{Number(data.commercial?.collecte_reelle_kg || 0).toFixed(2)} kg</span></p>
            <p>Ecart: <span className="font-semibold">{Number(data.commercial?.ecart_estimation_collecte_kg || 0).toFixed(2)} kg</span></p>
            <p>Achats: <span className="font-semibold">{Number(data.commercial?.valeur_achats_ar || 0).toLocaleString()} Ar</span></p>
            <p>Exports: <span className="font-semibold">{Number(data.commercial?.valeur_exports_usd || 0).toLocaleString()} USD</span></p>
          </div>
        </Card>

        <Card title="Vue Finance" padding="md">
          <div className="space-y-2 text-sm text-gray-700">
            <p>Depenses achats: <span className="font-semibold">{Number(data.finance?.depenses_achats_ar || 0).toLocaleString()} Ar</span></p>
            <p>Premium: <span className="font-semibold">{Number(data.finance?.montant_premium_ar || 0).toLocaleString()} Ar</span></p>
            <p>Remboursements avances: <span className="font-semibold">{Number(data.finance?.remboursements_avances_ar || 0).toLocaleString()} Ar</span></p>
            <p>Solde avances: <span className="font-semibold">{Number(data.finance?.solde_avances_ar || 0).toLocaleString()} Ar</span></p>
            <p>Recettes export: <span className="font-semibold">{Number(data.finance?.recettes_exports_usd || 0).toLocaleString()} USD</span></p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="Impact Programme" padding="md">
          <div className="space-y-2 text-sm text-gray-700">
            <p>Producteurs actifs: <span className="font-semibold">{data.impact?.producteurs_actifs || 0}</span></p>
            <p>Producteurs avec AGR: <span className="font-semibold">{data.impact?.producteurs_avec_agr || 0}</span></p>
            <p>Revenu AGR total: <span className="font-semibold">{Number(data.impact?.revenu_agr_total_ar || 0).toLocaleString()} Ar</span></p>
            <p>Mahavelona: <span className="font-semibold">{data.impact?.producteurs_mahavelona || 0}</span></p>
          </div>
        </Card>

        <Card title="Tracabilite" padding="md">
          <div className="space-y-2 text-sm text-gray-700">
            <p>Collectes: <span className="font-semibold">{data.tracabilite?.total_collectes || 0}</span></p>
            <p>Lots de traitement: <span className="font-semibold">{data.tracabilite?.total_lots_traitement || 0}</span></p>
            <p>Colis: <span className="font-semibold">{data.tracabilite?.total_colis || 0}</span></p>
            <p>Commandes export: <span className="font-semibold">{data.tracabilite?.total_commandes_export || 0}</span></p>
            <p>Anomalies de poids: <span className="font-semibold">{data.tracabilite?.collectes_anomalies_poids || 0}</span></p>
          </div>
        </Card>
      </div>

      <Card title="Top anomalies de collecte" padding="md" className="mb-8">
        {anomalies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">FABC</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Producteur</th>
                  <th className="px-3 py-2 text-left">Commune</th>
                  <th className="px-3 py-2 text-right">Retour (kg)</th>
                  <th className="px-3 py-2 text-right">Taux perte %</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.slice(0, 10).map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="border-t">
                    <td className="px-3 py-2">{item.numero_fabc}</td>
                    <td className="px-3 py-2">{item.date_marche}</td>
                    <td className="px-3 py-2">{item.producteur__code} - {item.producteur__nom} {item.producteur__prenom || ''}</td>
                    <td className="px-3 py-2">{item.commune || '-'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-red-700">{item.poids_retour}</td>
                    <td className="px-3 py-2 text-right">{item.taux_perte_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-green-700">Aucune anomalie detectee sur la periode.</p>
        )}
      </Card>

      <Card title="Alertes" padding="md">
        {data.alerts?.length > 0 ? (
          <ul className="list-disc pl-6 space-y-1 text-sm text-red-700">
            {data.alerts.map((alert, idx) => <li key={idx}>{alert}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-green-700">Aucune alerte critique.</p>
        )}
      </Card>
    </>
  );
});

DecisionTab.displayName = 'DecisionTab';

// ========== Onglet Social (Hygiène / Enfants / Environnement) ==========
const SocialTab = memo(({ data, subTab, onSubTabChange }) => {
  if (!data || !data.hygiene || !data.enfants || !data.environnement) {
    return (
      <div className="text-center py-12">
        <Icon name={iconMap.social} size="xl" className="text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Chargement des données sociales...</p>
      </div>
    );
  }

  const subTabs = [
    { id: 'hygiene', label: 'Hygiène & Santé' },
    { id: 'enfants', label: 'Enfants & Scolarisation' },
    { id: 'environnement', label: 'Environnement' },
  ];

  return (
    <>
      {/* Sous-onglets */}
      <Card padding="none" className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {subTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${subTab === tab.id
                    ? 'border-chick-yellow text-chick-yellow'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </Card>

      {subTab === 'hygiene' && <HygieneView data={data.hygiene} />}
      {subTab === 'enfants' && (
        <EnfantsView
          data={data.enfants}
          evolution={data.scolarisationEvolution}
        />
      )}
      {subTab === 'environnement' && <EnvironnementView data={data.environnement} />}
    </>
  );
});

SocialTab.displayName = 'SocialTab';

// ----- Vue Hygiène & Santé -----
const HygieneView = memo(({ data }) => {
  const [absentsModal, setAbsentsModal] = useState(null); // { champ, label }
  const [absentsData, setAbsentsData] = useState(null);
  const [absentsLoading, setAbsentsLoading] = useState(false);
  const indicateurs = [
    { key: 'poubelles_triees', label: 'Poubelles triées', color: 'bg-green-500' },
    { key: 'wc_maison', label: 'WC à la maison', color: 'bg-blue-500' },
    { key: 'wc_champ', label: 'WC au champ', color: 'bg-cyan-500' },
    { key: 'eau_potable', label: 'Accès à l\'eau potable', color: 'bg-teal-500' },
    { key: 'assurance_sante', label: 'Assurance santé', color: 'bg-purple-500' },
  ];

  const CHAMP_PAR_KEY = {
    poubelles_triees: 'a_poubelles_triees',
    wc_maison: 'wc_maison',
    wc_champ: 'wc_champ',
    eau_potable: 'eau_potable',
    assurance_sante: 'a_assurance_sante',
  };

  const openAbsents = async (champ, label) => {
    setAbsentsModal({ champ, label });
    setAbsentsLoading(true);
    setAbsentsData(null);
    try {
      const response = await dashboardService.getHygieneAbsents({ champ });
      setAbsentsData(response.data);
    } catch (error) {
      console.error('Erreur chargement liste absents:', error);
      setAbsentsData({ producteurs: [], count: 0 });
    } finally {
      setAbsentsLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Producteurs actifs" value={data.total_producteurs} subtitle="Population analysée" iconName="UsersIcon" color="bg-chick-yellow" />
        <StatCard title="Eau potable" value={`${data.eau_potable?.pourcentage ?? 0} %`} subtitle={`${data.eau_potable?.count ?? 0} producteurs concernés`} iconName="CheckCircleIcon" color="bg-teal-500" />
        <StatCard title="Assurance santé" value={`${data.assurance_sante?.pourcentage ?? 0} %`} subtitle={`${data.assurance_sante?.count ?? 0} producteurs couverts`} iconName="CheckCircleIcon" color="bg-purple-500" />
      </div>

      <Card title="Conditions d'hygiène des producteurs" padding="md">
        <div className="space-y-4">
          {indicateurs.map(ind => {
            const item = data[ind.key] || { count: 0, pourcentage: 0 };
            return (
              <div key={ind.key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{ind.label}</span>
                  <span className="text-sm text-gray-500">{item.count} producteur{item.count > 1 ? 's' : ''} · {item.pourcentage} %</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`${ind.color} h-3 rounded-full transition-all`} style={{ width: `${Math.min(item.pourcentage || 0, 100)}%` }} />
                </div>
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => openAbsents(CHAMP_PAR_KEY[ind.key], ind.label)}
                    className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    Voir la liste
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    
      {absentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-dark">Producteurs sans : {absentsModal.label}</h3>
                <p className="text-xs text-gray-500">{absentsData ? `${absentsData.count} producteur(s)` : 'Chargement…'}</p>
              </div>
              <button onClick={() => setAbsentsModal(null)} className="text-gray-400 hover:text-gray-700">
                <Icon name="XMarkIcon" size="md" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3">
              {absentsLoading ? (
                <div className="py-10 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow" />
                </div>
              ) : !absentsData || absentsData.producteurs.length === 0 ? (
                <p className="py-10 text-center text-gray-500">Aucun producteur concerne.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="py-2">Code</th>
                      <th className="py-2">Nom</th>
                      <th className="py-2">Village</th>
                      <th className="py-2">Commune</th>
                      <th className="py-2">Telephone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {absentsData.producteurs.map(p => (
                      <tr key={p.id} className="hover:bg-amber-50">
                        <td className="py-2 font-medium text-dark">{p.code}</td>
                        <td className="py-2">{p.nom_complet}</td>
                        <td className="py-2 text-gray-600">{p.village}</td>
                        <td className="py-2 text-gray-600">{p.commune}</td>
                        <td className="py-2 text-gray-600">{p.telephone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
</>
  );
});

HygieneView.displayName = 'HygieneView';

// ----- Vue Enfants & Scolarisation -----
const EnfantsView = memo(({ data, evolution }) => {
  const horsAge = Math.max(
    (data.total_enfants || 0) - (data.enfants_scolarises || 0) - (data.enfants_non_scolarises || 0),
    0
  );

  // Évolution annuelle (#12) : archives annuelles + année courante (live)
  const annees = evolution?.annees || [];
  const aPlusieursAnnees = annees.length > 1;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total enfants" value={data.total_enfants} subtitle={`${data.total_garcons} garçons · ${data.total_filles} filles`} iconName="UsersIcon" color="bg-chick-yellow" />
        <StatCard title="En âge scolaire (3-18 ans)" value={data.enfants_en_age_scolaire} subtitle="Estimé via les années de naissance" iconName="UserIcon" color="bg-blue-500" />
        <StatCard title="Enfants scolarisés" value={data.enfants_scolarises} subtitle={`Taux de scolarisation : ${data.taux_scolarisation} %`} iconName="CheckCircleIcon" color="bg-green-500" />
        <StatCard title="Non scolarisés" value={data.enfants_non_scolarises} subtitle="À accompagner en priorité" iconName="ExclamationTriangleIcon" color="bg-red-500" />
      </div>

      {/* Transparence sur la méthode de calcul — évite la confusion « 0 scolarisé »
          et documente la source réellement utilisée (#34). */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-900">
        <p className="font-semibold mb-1">Comment ce taux est calculé</p>
        <p>
          {data.methode_calcul === 'declare_agrege'
            && "À partir du nombre d'enfants scolarisés déclaré directement dans la fiche du producteur."}
          {data.methode_calcul === 'deduit_compteurs'
            && "À partir des enfants déclarés au ménage, diminués de ceux explicitement signalés comme non scolarisés. Les années de naissance des enfants étant incomplètes et parfois erronées dans la base, elles ne peuvent pas servir de base fiable."}
          {data.methode_calcul === 'slots'
            && "À partir des années de naissance des enfants (3-18 ans) et de leur statut de scolarisation."}
          {data.methode_calcul === 'historique'
            && "À partir des données d'historique annuel enregistrées pour l'année sélectionnée."}
        </p>
        {data.slots && data.methode_calcul === 'deduit_compteurs' && (
          <p className="mt-1 text-blue-700">
            Détail technique : {data.slots.age} enfant(s) disposent d'une année de naissance
            exploitable, dont {data.slots.scolarises} marqué(s) comme scolarisé(s).
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Scolarisation des enfants">
          <Doughnut
            data={{
              labels: ['Scolarisés', 'Non scolarisés', 'Hors âge scolaire'],
              datasets: [{
                data: [data.enfants_scolarises, data.enfants_non_scolarises, horsAge],
                backgroundColor: ['#10B981', '#EF4444', '#9CA3AF'],
                borderWidth: 1,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: { legend: { position: 'bottom' } },
            }}
          />
        </ChartCard>

        <ChartCard title="Répartition par genre">
          <Doughnut
            data={{
              labels: ['Garçons', 'Filles'],
              datasets: [{
                data: [data.total_garcons, data.total_filles],
                backgroundColor: ['#3B82F6', '#EC4899'],
                borderWidth: 1,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: { legend: { position: 'bottom' } },
            }}
          />
        </ChartCard>
      </div>

      {/* Évolution annuelle du taux de scolarisation (#12).
          Sources : archives annuelles (ProducteurSnapshot) + année courante (live). */}
      <div className="mt-6">
        <ChartCard title="Évolution du taux de scolarisation par année">
          {aPlusieursAnnees ? (
            <Line
              data={{
                labels: annees.map(a => a.annee),
                datasets: [
                  {
                    label: 'Taux de scolarisation (%)',
                    data: annees.map(a => a.taux_scolarisation),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.3,
                    fill: true,
                  },
                  {
                    label: 'Enfants scolarisés',
                    data: annees.map(a => a.scolarises),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.3,
                    yAxisID: 'y1',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Taux (%)' },
                  },
                  y1: {
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Enfants scolarisés' },
                  },
                },
              }}
            />
          ) : (
            <p className="text-sm text-gray-600 py-4">
              {evolution?.message_donnees
                || "Aucune donnée annuelle disponible pour le moment."}
            </p>
          )}

          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Année</th>
                  <th className="py-2 pr-4">Enfants</th>
                  <th className="py-2 pr-4">Scolarisés</th>
                  <th className="py-2 pr-4">Non scolarisés</th>
                  <th className="py-2 pr-4">Taux</th>
                  <th className="py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {annees.map(a => (
                  <tr key={a.annee} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-semibold">{a.annee}</td>
                    <td className="py-2 pr-4">{a.total_enfants}</td>
                    <td className="py-2 pr-4 text-green-700">{a.scolarises}</td>
                    <td className="py-2 pr-4 text-red-700">{a.non_scolarises}</td>
                    <td className="py-2 pr-4">{a.taux_scolarisation} %</td>
                    <td className="py-2 text-gray-500">
                      {a.source === 'live' ? 'Données actuelles' : 'Archive annuelle'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {annees.length > 1 && evolution?.cumul && (
                <tfoot>
                  <tr className="font-semibold bg-gray-50">
                    <td className="py-2 pr-4">Cumul ({annees.length} ans)</td>
                    <td className="py-2 pr-4">{evolution.cumul.total_enfants}</td>
                    <td className="py-2 pr-4 text-green-700">{evolution.cumul.scolarises}</td>
                    <td className="py-2 pr-4">—</td>
                    <td className="py-2 pr-4">{evolution.cumul.taux_scolarisation} %</td>
                    <td className="py-2" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </ChartCard>
      </div>
    </>
  );
});

EnfantsView.displayName = 'EnfantsView';

// Composants utilitaires
const StatCard = memo(({ title, value, subtitle, iconName, color }) => {
  // Determine text color based on background color
  const textColor = color === 'bg-chick-yellow' ? 'text-gray-900' : 'text-white';
  
  return (
    <Card padding="md" className="hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-dark">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${color} w-16 h-16 rounded-full flex items-center justify-center`}>
          <Icon name={iconName} size="xl" className={textColor} />
        </div>
      </div>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

// ----- Vue Environnement -----
const EnvironnementView = memo(({ data }) => {
  const total = data.total_producteurs || 0;
  const pct = (value) => total > 0 ? Math.round(((value || 0) / total) * 100) : 0;

  const indicateurs = [
    { key: 'respecte_dina', label: 'Respecte le dina (règlement local)', color: 'bg-green-500' },
    { key: 'ne_brule_pas_foret', label: 'Ne brûle pas la forêt', color: 'bg-emerald-500' },
    { key: 'ne_coupe_pas_foret', label: 'Ne coupe pas la forêt', color: 'bg-teal-500' },
    { key: 'pratique_peche', label: 'Pratique la pêche', color: 'bg-blue-500' },
    { key: 'pratique_tavy', label: 'Pratique le tavy (culture sur brûlis)', color: 'bg-red-500' },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Producteurs actifs" value={total} subtitle="Population analysée" iconName="UsersIcon" color="bg-chick-yellow" />
        <StatCard title="Respect du dina" value={`${pct(data.respecte_dina)} %`} subtitle={`${data.respecte_dina} producteurs`} iconName="CheckCircleIcon" color="bg-green-500" />
        <StatCard title="Pratique le tavy" value={`${pct(data.pratique_tavy)} %`} subtitle={`${data.pratique_tavy} producteurs — point de vigilance`} iconName="ExclamationTriangleIcon" color="bg-red-500" />
      </div>

      <Card title="Comportements environnementaux" padding="md">
        <div className="space-y-4">
          {indicateurs.map(ind => {
            const value = data[ind.key] || 0;
            const percent = pct(value);
            return (
              <div key={ind.key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{ind.label}</span>
                  <span className="text-sm text-gray-500">{value} producteur{value > 1 ? 's' : ''} · {percent} %</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`${ind.color} h-3 rounded-full transition-all`} style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Note : « pratique le tavy » est un indicateur négatif (culture sur brûlis) — un pourcentage élevé appelle une action de sensibilisation.
        </p>
      </Card>
    </>
  );
});

EnvironnementView.displayName = 'EnvironnementView';

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

export default Dashboard;
