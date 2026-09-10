import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../../services/api';
import SearchableSelect from '../common/SearchableSelect';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Card from '../common/Card';

function Menage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [villages, setVillages] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [selectedVillages, setSelectedVillages] = useState([]);
  const [selectedCommunes, setSelectedCommunes] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);

  const loadFilters = async () => {
    try {
      const response = await dashboardService.getVillagesAndCommunes();
      setVillages(response.data.villages);
      setCommunes(response.data.communes);
    } catch (error) {
      console.error('Erreur lors du chargement des filtres:', error);
    }
  };

  const loadAvailableYears = () => {
    // Generate years from 2020 to current year
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2020; year <= currentYear; year++) {
      years.push(year);
    }
    setAvailableYears(years.reverse());
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Ajouter les villages sélectionnés
      selectedVillages.forEach(village => {
        params.append('village', village);
      });

      // Ajouter les communes sélectionnées
      selectedCommunes.forEach(commune => {
        params.append('commune', commune);
      });

      // Ajouter l'année sélectionnée
      if (selectedYear) {
        params.append('year', selectedYear);
      }

      const response = await dashboardService.getGlobal(params);
      setData(response.data);
    } catch (error) {
      console.error('❌ Erreur:', error);
      console.error('Détails:', error.response?.data);
      setError(error.response?.data?.detail || error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [selectedVillages, selectedCommunes, selectedYear]);

  // Effets déclarés APRÈS les fonctions (sinon TDZ « Cannot access 'loadData'
  // before initialization » → page blanche)
  useEffect(() => {
    loadFilters();
    loadAvailableYears();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetFilters = () => {
    setSelectedVillages([]);
    setSelectedCommunes([]);
    setSelectedYear(new Date().getFullYear());
  };

  // Préparer les options pour SearchableSelect
  const villageOptions = villages.map(village => ({
    value: village,
    label: village
  }));

  const communeOptions = communes.map(commune => ({
    value: commune,
    label: commune
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-yellow mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <Icon name="ExclamationTriangleIcon" size="xl" className="text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            onClick={loadData}
            variant="primary"
            icon="ArrowPathIcon"
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Icon name="InboxIcon" size="xl" className="text-gray-400 mx-auto mb-4" />
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
          Informations <span className="text-primary-yellow">Globales</span> des Ménages
        </h1>
        <p className="text-gray-600">Vue d'ensemble des données des ménages</p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* Multi-select Commune */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commune(s)
            </label>
            <SearchableSelect
              options={communeOptions}
              value={selectedCommunes}
              onChange={setSelectedCommunes}
              placeholder="Toutes les communes"
              displayKey="label"
              valueKey="value"
              multiple={true}
            />
          </div>

          {/* Multi-select Village */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Village(s)
            </label>
            <SearchableSelect
              options={villageOptions}
              value={selectedVillages}
              onChange={setSelectedVillages}
              placeholder="Tous les villages"
              displayKey="label"
              valueKey="value"
              multiple={true}
            />
          </div>

          {/* Year Selector */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Année de référence
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent bg-white"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleResetFilters}
            variant="secondary"
            icon="XMarkIcon"
            className="whitespace-nowrap"
          >
            Réinitialiser
          </Button>
        </div>
        {(selectedVillages.length > 0 || selectedCommunes.length > 0) && (
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Filtres actifs:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedCommunes.map((commune, index) => (
                <span key={`commune-${index}`} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                  <Icon name="MapPinIcon" size="sm" />
                  <span>Commune: {commune}</span>
                  <span
                    onClick={() => setSelectedCommunes(prev => prev.filter(c => c !== commune))}
                    className="ml-1 hover:text-blue-900 cursor-pointer"
                  >
                    ×
                  </span>
                </span>
              ))}
              {selectedVillages.map((village, index) => (
                <span key={`village-${index}`} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full">
                  <Icon name="HomeIcon" size="sm" />
                  <span>Village: {village}</span>
                  <span
                    onClick={() => setSelectedVillages(prev => prev.filter(v => v !== village))}
                    className="ml-1 hover:text-green-900 cursor-pointer"
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section Adultes */}
      {data.adultes && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-dark mb-6 flex items-center gap-2">
              <Icon name="UsersIcon" size="lg" className="text-orange-600" />
              Statistiques des Adultes (18+ ans)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card padding="md" className="hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="inline-block p-3 rounded-lg bg-blue-50 mb-3">
                      <Icon name="UsersIcon" size="md" className="text-blue-600" />
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Total Adultes</p>
                    <p className="text-3xl font-bold text-blue-600">{data.adultes.total || 0}</p>
                  </div>
                </div>
              </Card>

              <Card padding="md" className="hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="inline-block p-3 rounded-lg bg-blue-100 mb-3">
                      <Icon name="UserIcon" size="md" className="text-blue-700" />
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Hommes Adultes</p>
                    <p className="text-3xl font-bold text-blue-700">{data.adultes.hommes || 0}</p>
                  </div>
                </div>
              </Card>

              <Card padding="md" className="hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="inline-block p-3 rounded-lg bg-pink-50 mb-3">
                      <Icon name="UserIcon" size="md" className="text-pink-600" />
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Femmes Adultes</p>
                    <p className="text-3xl font-bold text-pink-600">{data.adultes.femmes || 0}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Section Enfants */}
      {data.enfants && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-dark mb-6 flex items-center gap-2">
              <Icon name="UserGroupIcon" size="lg" className="text-blue-600" />
              Statistiques des Enfants
            </h2>
            <div className="mb-4 p-3 rounded-lg bg-blue-100 text-blue-900 text-sm">
              {data?.enfants?.comparaison_annee?.annee && (
                <p className="mt-1">
                  Comparaison {data.enfants.comparaison_annee.annee} vs {data.enfants.comparaison_annee.annee_precedente}:&nbsp;
                  {data.enfants.comparaison_annee.delta != null
                    ? `${data.enfants.comparaison_annee.delta > 0 ? '+' : ''}${data.enfants.comparaison_annee.delta}%`
                    : 'ND'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card padding="md" className="hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="inline-block p-3 rounded-lg bg-blue-50 mb-3">
                      <Icon name="UserGroupIcon" size="md" className="text-blue-600" />
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Total Enfants</p>
                    <p className="text-3xl font-bold text-blue-600">{data.enfants.total || 0}</p>
                  </div>
                </div>
              </Card>

              <Card padding="md" className="hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="inline-block p-3 rounded-lg bg-green-50 mb-3">
                      <Icon name="AcademicCapIcon" size="md" className="text-green-600" />
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Enfants Scolarisés</p>
                    <p className="text-3xl font-bold text-green-600">{data.enfants.scolarises || 0}</p>
                  </div>
                </div>
              </Card>

              <Card padding="md" className="hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="inline-block p-3 rounded-lg bg-purple-50 mb-3">
                      <Icon name="ChartBarIcon" size="md" className="text-purple-600" />
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Taux de Scolarisation</p>
                    <p className="text-3xl font-bold text-purple-600">{data.enfants.taux_scolarisation || 0}%</p>
                    <p className="text-sm text-gray-500 mt-1">Année {selectedYear}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Pyramide de scolarisation par tranche d'âge */}
            {data.enfants.scolarisation_par_age && data.enfants.scolarisation_par_age.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-dark mb-4">
                  Taux de Scolarisation par Tranche d'Âge
                </h3>
                <div className="space-y-6">
                  {data.enfants.scolarisation_par_age.map((group, index) => {
                    const maxTotal = Math.max(...data.enfants.scolarisation_par_age.map(g => g.total));
                    const scolarisesWidth = group.total > 0 ? (group.scolarises / maxTotal) * 100 : 0;
                    const nonScolarisesWidth = group.total > 0 ? (group.non_scolarises / maxTotal) * 100 : 0;

                    return (
                      <div key={index} className="flex items-center gap-4">
                        {/* Label tranche d'âge */}
                        <div className="w-20 text-sm font-semibold text-gray-700">
                          {group.tranche_age} ans
                        </div>

                        {/* Pyramide - Scolarisés (gauche, vert) */}
                        <div className="flex-1 flex justify-end">
                          <div className="relative w-full">
                            <div className="flex justify-end">
                              <div
                                className="bg-green-500 text-white text-xs py-2 px-3 rounded-l transition-all duration-500 hover:bg-green-600"
                                style={{ width: `${scolarisesWidth}%` }}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold flex items-center gap-1">
                                  <Icon name="AcademicCapIcon" size="sm" className="text-white" />
                                  {group.scolarises}
                                </span>
                                  <span className="ml-2">({group.taux_scolarisation}%)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pyramide - Non scolarisés (droite, rouge) */}
                        <div className="flex-1">
                          <div className="relative w-full">
                            <div className="flex justify-start">
                              <div
                                className="bg-red-500 text-white text-xs py-2 px-3 rounded-r transition-all duration-500 hover:bg-red-600"
                                style={{ width: `${nonScolarisesWidth}%` }}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold flex items-center gap-1">
                                  <Icon name="XCircleIcon" size="sm" className="text-white" />
                                  {group.non_scolarises}
                                </span>
                                  <span className="ml-2">({Math.round((group.non_scolarises / group.total) * 100) || 0}%)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="w-24 text-sm font-semibold text-gray-600 text-right">
                          Total: {group.total}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Légende */}
                <div className="flex justify-center gap-8 mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm text-gray-700">Scolarisés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-sm text-gray-700">Non scolarisés</span>
                  </div>
                </div>
              </div>
            )}

            {/* Historique du taux de scolarisation */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
                <Icon name="ChartBarIcon" size="md" className="text-gray-600" />
                Historique du Taux de Scolarisation
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Sélectionnez une année dans les filtres ci-dessus pour voir les données de scolarisation de cette année-là.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Année sélectionnée</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedYear}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Taux de scolarisation</p>
                  <p className="text-2xl font-bold text-green-600">{data.enfants.taux_scolarisation || 0}%</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Enfants scolarisés</p>
                  <p className="text-2xl font-bold text-purple-600">{data.enfants.scolarises || 0}</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note :</strong> L'historique des taux de scolarisation permet de suivre l'évolution année par année.
                  Les données affichées correspondent à l'année sélectionnée dans les filtres.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Impact des Kits Scolaires */}
      {data.impact_dotation && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
            <Icon name="AcademicCapIcon" size="md" className="text-gray-600" />
            Impact des Kits Scolaires
          </h3>
          <p className="text-gray-600 mb-6">
            Comparaison du taux de scolarisation déclaré entre les ménages ayant reçu des kits scolaires et ceux n'en ayant pas reçu.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Avec Kit */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-green-900">Avec Kit Scolaire</span>
                <span className="text-2xl font-bold text-green-700">{data.impact_dotation.taux_avec_kit}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${data.impact_dotation.taux_avec_kit}%` }}></div>
              </div>
              <p className="text-sm text-green-700 mt-2">
                Concerne {data.impact_dotation.enfants_concernes_avec_kit} enfants (3-18 ans)
              </p>
            </div>

            {/* Sans Kit */}
            <div className="bg-orange-50 p-6 rounded-lg border border-orange-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-orange-900">Sans Kit Scolaire</span>
                <span className="text-2xl font-bold text-orange-700">{data.impact_dotation.taux_sans_kit}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${data.impact_dotation.taux_sans_kit}%` }}></div>
              </div>
              <p className="text-sm text-orange-700 mt-2">
                Concerne {data.impact_dotation.enfants_concernes_sans_kit} enfants (3-18 ans)
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className={`text-lg font-medium ${data.impact_dotation.taux_avec_kit > data.impact_dotation.taux_sans_kit ? 'text-green-600' : 'text-gray-600'}`}>
              {data.impact_dotation.taux_avec_kit > data.impact_dotation.taux_sans_kit
                ? `Le taux de scolarisation est supérieur de ${(data.impact_dotation.taux_avec_kit - data.impact_dotation.taux_sans_kit).toFixed(1)} points pour les bénéficiaires de kits.`
                : "Pas de différence significative observée."}
            </p>
          </div>
        </div>
      )}

      {/* Message si pas de données */}
      {data.global?.total === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 text-lg font-medium mb-2">
            Aucune donnée disponible
          </p>
          <p className="text-yellow-700 mb-4">
            Commencez par ajouter des producteurs pour voir les statistiques des ménages
          </p>
          <a
            href="/producteurs"
            className="inline-block bg-primary-yellow text-dark px-6 py-2 rounded-lg font-semibold hover:bg-yellow-500"
          >
            Ajouter un producteur
          </a>
        </div>
      )}
    </div>
  );
}

export default Menage;
