 import { useState, useEffect } from 'react';
import { formationService, producteurService } from '../../services/api';
import SearchableSelect from '../common/SearchableSelect';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function FormationsCertifications() {
  const [activeTab, setActiveTab] = useState('formations');
  const [formations, setFormations] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [statsFormations, setStatsFormations] = useState(null);
  const [statsCertifications, setStatsCertifications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allProducteurs, setAllProducteurs] = useState([]);

  // Hoist filters state to preserve it during loading/remount
  const [filters, setFilters] = useState({
    producteurs: [],
    type_formation: '',
    type_certification: '',
    annee: '',
    organisme: '',
    lieu: '',
    certificat_obtenu: ''
  });

  useEffect(() => {
    loadData();
    loadProducteurs();
  }, []);

  const loadProducteurs = async () => {
    try {
      const res = await producteurService.getAllForDropdown();
      setAllProducteurs(res.data.results || res.data);
    } catch (err) {
      console.error("Erreur chargement producteurs", err);
    }
  };

  const loadData = async (filters = {}) => {
    setLoading(true);
    setError(null);

    // Prepare filters
    const apiFilters = {};
    if (filters.producteurs && filters.producteurs.length > 0) {
      apiFilters.producteur__in = filters.producteurs.join(',');
    }
    if (filters.type_formation) {
      apiFilters.type_formation = filters.type_formation;
    }
    if (filters.type_certification) {
      apiFilters.type_certification = filters.type_certification;
    }
    if (filters.annee) {
      apiFilters.annee = filters.annee;
    }
    if (filters.organisme) {
      apiFilters.organisme = filters.organisme;
    }
    if (filters.lieu) {
      apiFilters.lieu = filters.lieu;
    }
    if (filters.certificat_obtenu) {
      apiFilters.certificat_obtenu = filters.certificat_obtenu;
    }

    try {
      const [
        formationsRes,
        certificationsRes,
        statsFormationsRes,
        statsCertificationsRes
      ] = await Promise.all([
        formationService.getAllFormations(apiFilters),
        formationService.getAllCertifications(apiFilters),
        formationService.getFormationsStats(),
        formationService.getCertificationsStats(),
      ]);

      setFormations(formationsRes.data.results || formationsRes.data);
      setCertifications(certificationsRes.data.results || certificationsRes.data);
      setStatsFormations(statsFormationsRes.data);
      setStatsCertifications(statsCertificationsRes.data);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setError(error.response?.data?.detail || 'Erreur lors du chargement des donnÃ©es');
    } finally {
      setLoading(false);
    }
  };


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
            RÃ©essayer
          </Button>
        </div>
      </div>
    );
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    loadData(newFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      producteurs: [],
      type_formation: '',
      type_certification: '',
      annee: '',
      organisme: '',
      lieu: '',
      certificat_obtenu: ''
    };
    setFilters(emptyFilters);
    loadData(emptyFilters);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-dark mb-2">
              Certifications et <span className="text-chick-yellow">Formations</span>
            </h1>
            <p className="text-gray-600">Suivi des formations et certifications des producteurs</p>
          </div>
          <Button
            variant="secondary"
            icon="InformationCircleIcon"
            onClick={() => window.location.href = '/formations/specifications'}
            className="flex-shrink-0"
          >
            Voir les spécifications
          </Button>
        </div>
      </div>

      {loading && (
        <div className="mb-4 text-sm text-gray-500 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-chick-yellow"></div>
          <span>Mise Ã  jour...</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('formations')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'formations'
                ? 'border-chick-yellow text-chick-yellow'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Icon name="AcademicCapIcon" size="sm" />
              Formations
            </button>
            <button
              onClick={() => setActiveTab('certifications')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'certifications'
                ? 'border-chick-yellow text-chick-yellow'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Icon name="CheckBadgeIcon" size="sm" />
              Certifications
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'formations' ? (
        <FormationsTab
          formations={formations}
          stats={statsFormations}
          onReload={() => loadData(filters)}
          allProducteurs={allProducteurs}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <CertificationsTab
          certifications={certifications}
          stats={statsCertifications}
          allProducteurs={allProducteurs}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />
      )}
    </div>
  );
}

// ========== Onglet Formations ==========
function FormationsTab({ formations, stats, onReload, allProducteurs, filters, onFilterChange, onResetFilters }) {
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedType, setSelectedType] = useState(null); // ID of selected type for drill-down

  const handleLocalFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    // If setting type via global filter, reset local drill-down
    if (key === 'type_formation') {
      setSelectedType(null);
    }
    onFilterChange(newFilters);
  };

  const handleLocalReset = () => {
    setSelectedType(null);
    onResetFilters();
  };

  const handleAdd = () => {
    setSelectedFormation(null);
    setFormMode('create');
    setShowFormModal(true);
  };

  const handleEdit = (formation) => {
    setSelectedFormation(formation);
    setFormMode('edit');
    setShowFormModal(true);
  };

  const handleView = (formation) => {
    setSelectedFormation(formation);
    setFormMode('view');
    setShowFormModal(true);
  };

  const handleCloseModal = () => {
    setShowFormModal(false);
    setSelectedFormation(null);
  };

  const handleSuccess = () => {
    setShowFormModal(false);
    setSelectedFormation(null);
    onReload();
  };

  // Determine if we should show the list view (either drill-down or filtered)
  const isFiltered = (
    filters.producteurs.length > 0 ||
    filters.type_formation ||
    filters.annee ||
    filters.organisme ||
    filters.lieu ||
    filters.certificat_obtenu
  );
  // Always show producer list in the certifications tab
  const showList = true;

  // Si on est en mode "filtre global", visibleFormations est dÃ©jÃ  filtrÃ© par le backend (props.formations)
  // Si on est en mode "drill-down type" (selectedType), on filtre le tableau existant (si loadData n'a pas filtrÃ©)
  // Mais ici loadData recharge TOUT en fonction des filtres.
  // Donc :
  // - Si filters actifs : formations contient dÃ©jÃ  le rÃ©sultat.
  // - Si selectedType actif (sans filters globaux) : formations contient TOUT, on doit filtrer localement.

  const visibleFormations = selectedType
    ? formations.filter(f => f.type_formation === selectedType.id)
    : formations;

  // Types options for filter
  const typeOptions = stats?.par_type?.map(t => ({
    value: t.type_formation,
    label: t.type_formation__nom || 'Autre'
  })) || [];

  return (
    <div>
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card padding="md" className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Types de Formations</p>
                <p className="text-3xl font-bold text-dark">{stats.types_formations_count || 0}</p>
              </div>
              <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center">
                <Icon name="AcademicCapIcon" size="lg" className="text-white" />
              </div>
            </div>
          </Card>
          <Card padding="md" className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Producteurs Formés</p>
                <p className="text-3xl font-bold text-dark">{stats.producteurs_formes || 0}</p>
              </div>
              <div className="bg-green-500 w-16 h-16 rounded-full flex items-center justify-center">
                <Icon name="UsersIcon" size="lg" className="text-white" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">

        {/* Header with Title and Add Button */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            {(selectedType || isFiltered) && (
              <button
                onClick={() => {
                  if (selectedType) setSelectedType(null);
                  if (isFiltered) onResetFilters();
                }}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                title="Retour"
              >
                <Icon name="ArrowLeftIcon" size="md" className="text-gray-600" />
              </button>
            )}
            <h3 className="text-lg font-bold text-dark">
              {selectedType
                ? `Formations : ${selectedType.nom}`
                : isFiltered ? 'RÃ©sultats de recherche' : 'Types de Formations'}
            </h3>
          </div>
          <Button
            onClick={handleAdd}
            variant="primary"
            icon="PlusIcon"
          >
            Ajouter une Formation
          </Button>
        </div>

        {/* Filters Bar */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Producteurs</label>
            <SearchableSelect
              options={allProducteurs.map(p => ({ value: p.id, label: `${p.code} - ${p.nom} ${p.prenom}` }))}
              value={filters.producteurs}
              onChange={(val) => handleLocalFilterChange('producteurs', val)}
              multiple={true}
              placeholder="Sélectionner des producteurs..."
            />
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de Formation</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-chick-yellow"
              value={filters.type_formation}
              onChange={(e) => handleLocalFilterChange('type_formation', e.target.value)}
            >
              <option value="">Tous les types</option>
              {typeOptions.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-chick-yellow"
              value={filters.annee}
              onChange={(e) => handleLocalFilterChange('annee', e.target.value)}
              placeholder="2025"
            />
          </div>
          <div className="w-full md:w-1/5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisme</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-chick-yellow"
              value={filters.organisme}
              onChange={(e) => handleLocalFilterChange('organisme', e.target.value)}
              placeholder="Formateur/organisme"
            />
          </div>
          {isFiltered && (
            <button
              onClick={handleLocalReset}
              className="text-sm text-red-600 hover:text-red-800 underline pb-2"
            >
              RÃ©initialiser
            </button>
          )}

          {filters.producteurs.length > 0 && (
            <div className="w-full">
              <div className="flex flex-wrap gap-2">
                {allProducteurs
                  .filter(p => filters.producteurs.includes(p.id))
                  .map(p => (
                    <span key={p.id} className="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {p.code} - {p.nom} {p.prenom}
                      <button
                        className="ml-2 text-gray-500 hover:text-gray-700"
                        onClick={() => handleLocalFilterChange('producteurs', filters.producteurs.filter(id => id !== p.id))}
                        title="Retirer"
                      >
                        Ã—
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        {!showList ? (
          // === VIEW 1: List of Types ===
          <div className="overflow-x-auto">
            {(!stats?.par_type || stats.par_type.length === 0) ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucun type de formation enregistrÃ©</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type de Formation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.par_type.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedType({ id: item.type_formation, nom: item.type_formation__nom })}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {item.type_formation__nom || 'Non spÃ©cifiÃ©'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-blue-600 hover:text-blue-900 font-medium hover:underline">
                          Voir les détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          // === VIEW 2: List of Formations for Selected Type ===
          <div className="overflow-x-auto">
            {visibleFormations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune formation trouvÃ©e pour ce type</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producteur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lieu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Formateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleFormations.map((formation) => (
                    <tr key={formation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formation.producteur_code}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formation.producteur_nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(formation.date_formation).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formation.lieu || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formation.organisme || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleView(formation); }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir"
                        >
                          <Icon name="EyeIcon" size="sm" className="inline" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(formation); }}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Modifier"
                        >
                          <Icon name="PencilIcon" size="sm" className="inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Formation Form Modal */}
      {showFormModal && (
        <FormationFormModal
          formation={selectedFormation}
          mode={formMode}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

// ========== Formation Form Modal ==========
function FormationFormModal({ formation, mode, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    producteur: formation?.producteur || '',
    producteurs: [], // Pour la sélection multiple
    type_formation: formation?.type_formation_nom || '', // Texte libre
    date_formation: formation?.date_formation || '',
    lieu: formation?.lieu || '',
    organisme: formation?.organisme || '',
    notes: formation?.notes || '',
  });

  const [producteurs, setProducteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const producteursRes = await producteurService.getAllForDropdown();
      setProducteurs(producteursRes.data.results || producteursRes.data);
    } catch (error) {
      console.error('Erreur chargement donnÃ©es formulaire:', error);
      setError('Erreur lors du chargement des donnÃ©es');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleProducteur = (prodId) => {
    setFormData(prev => {
      const current = prev.producteurs;
      if (current.includes(prodId)) {
        return { ...prev, producteurs: current.filter(id => id !== prodId) };
      } else {
        return { ...prev, producteurs: [...current, prodId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'create') {
        // En mode crÃ©ation, on envoie la liste des producteurs
        if (formData.producteurs.length === 0) {
          throw new Error("Veuillez sélectionner au moins un producteur");
        }
        await formationService.createFormation(formData);
      } else if (mode === 'edit') {
        // En mode Ã©dition, on envoie le seul producteur et le payload adaptÃ©
        const payload = { ...formData };
        delete payload.producteurs;
        await formationService.updateFormation(formation.id, payload);
      }
      onSuccess();
    } catch (error) {
      console.error('Erreur soumission:', error);
      setError(error.message || error.response?.data?.detail || 'Erreur lors de la soumission du formulaire');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducteurs = producteurs.filter(p =>
    `${p.code} ${p.nom} ${p.prenom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isReadOnly = mode === 'view';
  const isCreate = mode === 'create';
  const title = mode === 'create' ? 'Ajouter une Formation' : mode === 'edit' ? 'Modifier la Formation' : 'Détails de la Formation';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-lg">
          <h2 className="text-xl font-bold text-dark">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <Icon name="XMarkIcon" size="lg" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-chick-yellow mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Producteurs Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isCreate ? 'Producteurs' : 'Producteur'} <span className="text-red-500">*</span>
                </label>

                {mode === 'create' ? (
                  <div className="border border-gray-300 rounded-lg p-2 max-h-60 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Rechercher des producteurs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-chick-yellow"
                    />
                    <div className="space-y-1">
                      {filteredProducteurs.map(p => (
                        <div key={p.id} className="flex items-center hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={formData.producteurs.includes(p.id)}
                            onChange={() => toggleProducteur(p.id)}
                            className="h-4 w-4 text-chick-yellow border-gray-300 rounded focus:ring-chick-yellow bg-white"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {p.code} - {p.nom} {p.prenom}
                          </span>
                        </div>
                      ))}
                      {filteredProducteurs.length === 0 && (
                        <p className="text-sm text-gray-500 italic p-2">Aucun producteur trouvé</p>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 border-t pt-1">
                      {formData.producteurs.length} producteur(s) sélectionné(s)
                    </div>
                  </div>
                ) : (
                  // Edit/View Mode - Single Producteur Display
                  <input
                    type="text"
                    value={formation?.producteur_nom || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                )}
              </div>

              {/* Type de Formation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de Formation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="type_formation"
                  value={formData.type_formation}
                  onChange={handleChange}
                  required
                  readOnly={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
                  placeholder="Ex: BPH, SST, etc."
                />
                {!isReadOnly && <p className="text-xs text-gray-500 mt-1">Saisissez le type. S'il n'existe pas, il sera créé automatiquement.</p>}
              </div>

              {/* Date de Formation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de Formation <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date_formation"
                  value={formData.date_formation}
                  onChange={handleChange}
                  required
                  readOnly={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
                />
              </div>

              {/* Lieu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lieu
                </label>
                <input
                  type="text"
                  name="lieu"
                  value={formData.lieu}
                  onChange={handleChange}
                  readOnly={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
                  placeholder="Lieu de la formation"
                />
              </div>

              {/* Nom de Formateur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de Formateur
                </label>
                <input
                  type="text"
                  name="organisme"
                  value={formData.organisme}
                  onChange={handleChange}
                  readOnly={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
                  placeholder="Nom du formateur"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  readOnly={isReadOnly}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
                  placeholder="Notes additionnelles..."
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  disabled={submitting}
                >
                  {isReadOnly ? 'Fermer' : 'Annuler'}
                </Button>
                {!isReadOnly && (
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    loading={submitting}
                  >
                    {mode === 'create' ? 'Ajouter' : 'Modifier'}
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Onglet Certifications ==========
function CertificationsTab({ certifications, stats, allProducteurs, filters, onFilterChange, onResetFilters }) {
  const [selectedType, setSelectedType] = useState(null); // ID of selected type for drill-down
  const [displayMode, setDisplayMode] = useState('compare'); // compare | detail
  const isFiltered = filters.producteurs.length > 0 || filters.type_certification;
  // Always show producer list in the certifications tab
  const showList = true;

  const handleLocalFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    if (key === 'type_certification') {
      setSelectedType(null);
    }
    onFilterChange(newFilters);
  };

  const handleLocalReset = () => {
    setSelectedType(null);
    onResetFilters();
  };

  // Local mapping for selected producer IDs and codes
  const selectedProdIds = new Set((filters.producteurs || []).map(v => String(v)));
  const selectedProdCodes = new Set(
    (allProducteurs || [])
      .filter(p => selectedProdIds.has(String(p.id)))
      .map(p => p.code)
  );

  // Robust local filtering to guarantee correct display even if backend doesn't filter
  const visibleCertifications = (certifications || [])
    .filter(c => !selectedType || String(c.type_certification) === String(selectedType.id))
    .filter(c => !filters.type_certification || String(c.type_certification) === String(filters.type_certification))
    .filter(c => {
      if (!filters.producteurs || filters.producteurs.length === 0) return true;
      // Match by producteur id (producteur | producteur_id | producteurId) or fallback to code match
      const rawId = c.producteur ?? c.producteur_id ?? c.producteurId;
      const hasIdMatch = rawId != null && selectedProdIds.has(String(rawId));
      const hasCodeMatch = c.producteur_code && selectedProdCodes.has(c.producteur_code);
      return hasIdMatch || hasCodeMatch;
    });

  const certificationsByProducteur = Object.values(
    visibleCertifications.reduce((acc, cert) => {
      const producteurId = cert.producteur ?? cert.producteur_id ?? cert.producteurId ?? cert.producteur_code;
      const key = String(producteurId);
      if (!acc[key]) {
        acc[key] = {
          key,
          producteur_code: cert.producteur_code || '-',
          producteur_nom: cert.producteur_nom || '-',
          certifications: [],
        };
      }

      const certCode = cert.type_certification_code || cert.type_certification_nom || cert.type_certification;
      const exists = acc[key].certifications.some((c) => c.code === certCode && c.statut === cert.statut);
      if (!exists) {
        acc[key].certifications.push({
          id: cert.id,
          code: certCode,
          nom: cert.type_certification_nom || certCode,
          statut: cert.statut,
        });
      }
      return acc;
    }, {})
  );

  const getStatutBadge = (statut) => {
    const variantMap = {
      valide: 'success',
      expire: 'error',
      en_cours: 'warning',
      suspendu: 'neutral',
    };
    const labels = {
      valide: 'Valide',
      expire: 'ExpirÃ©',
      en_cours: 'En cours',
      suspendu: 'Suspendu',
    };
    return (
      <Badge variant={variantMap[statut] || 'neutral'} size="sm">
        {labels[statut] || statut}
      </Badge>
    );
  };
  // ===== Historique des certifications (par année) =====
  const [histStart, setHistStart] = useState('');
  const [histEnd, setHistEnd] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedYears, setExpandedYears] = useState({});

  const loadHistory = async () => {
    if (!filters.type_certification) {
      setHistoryData(null);
      return;
    }
    setHistoryLoading(true);
    try {
      const params = { type_certification: filters.type_certification };
      if (histStart) params.start = histStart;
      if (histEnd) params.end = histEnd;
      const resp = await formationService.getCertificationsHistorique(params);
      setHistoryData(resp.data);
    } catch (e) {
      console.error('Erreur historique certifications:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (filters.type_certification) {
      loadHistory();
    } else {
      setHistoryData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type_certification]);

  // ===== Audits & Non-conformitÃ©s =====
  const [audits, setAudits] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [auditNCs, setAuditNCs] = useState([]);
  const [auditNCsLoading, setAuditNCsLoading] = useState(false);

  const loadAudits = async () => {
    setAuditsLoading(true);
    try {
      const params = {};
      if (filters.type_certification) params.type_certification = filters.type_certification;
      const [aRes, sRes] = await Promise.all([
        formationService.getAudits(params),
        formationService.getAuditsStats(),
      ]);
      setAudits(aRes.data.results || aRes.data);
      setAuditStats(sRes.data);
    } catch (e) {
      console.error('Erreur chargement audits:', e);
    } finally {
      setAuditsLoading(false);
    }
  };

  const loadAuditNCs = async (auditId) => {
    setAuditNCsLoading(true);
    try {
      const res = await formationService.getAuditNonConformites(auditId);
      setAuditNCs(res.data);
    } catch (e) {
      console.error('Erreur chargement non-conformitÃ©s:', e);
    } finally {
      setAuditNCsLoading(false);
    }
  };

  const resolveNC = async (ncId) => {
    try {
      await formationService.resolveNonConformite(ncId);
      if (selectedAudit) loadAuditNCs(selectedAudit.id);
    } catch (e) {
      console.error('Erreur rÃ©solution NC:', e);
    }
  };

  useEffect(() => {
    loadAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type_certification]);

  return (
    <div>
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card padding="md" className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Types de Certifications</p>
                <p className="text-3xl font-bold text-dark">{stats.types_certifications_count || 0}</p>
              </div>
              <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center">
                <Icon name="CheckBadgeIcon" size="lg" className="text-white" />
              </div>
            </div>
          </Card>
          <Card padding="md" className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Producteurs Certifiés</p>
                <p className="text-3xl font-bold text-dark">{stats.producteurs_certifies || 0}</p>
              </div>
              <div className="bg-green-500 w-16 h-16 rounded-full flex items-center justify-center">
                <Icon name="UsersIcon" size="lg" className="text-white" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">

        {/* Header content */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            {(selectedType || isFiltered) && (
              <button
                onClick={() => {
                  if (selectedType) setSelectedType(null);
                  if (isFiltered) onResetFilters();
                }}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                title="Retour"
              >
                <Icon name="ArrowLeftIcon" size="md" className="text-gray-600" />
              </button>
            )}
            <h3 className="text-lg font-bold text-dark">
              {selectedType
                ? `Certifications : ${selectedType.nom}`
                : isFiltered ? 'RÃ©sultats de recherche' : 'Liste des certifications'}
            </h3>
          </div>
          {showList && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDisplayMode('compare')}
                className={`px-3 py-1.5 rounded text-sm font-medium border ${
                  displayMode === 'compare'
                    ? 'bg-chick-yellow text-white border-chick-yellow'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Cote a cote
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('detail')}
                className={`px-3 py-1.5 rounded text-sm font-medium border ${
                  displayMode === 'detail'
                    ? 'bg-chick-yellow text-white border-chick-yellow'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Détails
              </button>
            </div>
          )}
        </div>

        {/* Filters Bar */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Producteurs</label>
            <SearchableSelect
              options={allProducteurs.map(p => ({ value: p.id, label: `${p.code} - ${p.nom} ${p.prenom}` }))}
              value={filters.producteurs}
              onChange={(val) => handleLocalFilterChange('producteurs', val)}
              multiple={true}
              placeholder="Sélectionner des producteurs..."
            />
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de Certification</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-chick-yellow"
              value={filters.type_certification}
              onChange={(e) => handleLocalFilterChange('type_certification', e.target.value)}
            >
              <option value="">Tous les types</option>
              {stats?.par_type?.map(t => (
                <option key={t.id} value={t.id}>{t.nom}</option>
              ))}
            </select>
          </div>
          {(filters.producteurs.length > 0 || filters.type_certification) && (
            <button
              onClick={handleLocalReset}
              className="text-sm text-red-600 hover:text-red-800 underline pb-2"
            >
              RÃ©initialiser
            </button>
          )}

          {filters.producteurs.length > 0 && (
            <div className="w-full">
              <div className="flex flex-wrap gap-2">
                {allProducteurs
                  .filter(p => filters.producteurs.includes(p.id))
                  .map(p => (
                    <span key={p.id} className="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {p.code} - {p.nom} {p.prenom}
                      <button
                        className="ml-2 text-gray-500 hover:text-gray-700"
                        onClick={() => handleLocalFilterChange('producteurs', filters.producteurs.filter(id => id !== p.id))}
                        title="Retirer"
                      >
                        Ã—
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        {!showList ? (
          // === VIEW 1: List of Types ===
          <div className="overflow-x-auto">
            {(!stats?.par_type || stats.par_type.length === 0) ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucun type de certification enregistré</p>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                {stats.par_type.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors shadow-sm"
                    onClick={() => setSelectedType({
                      id: item.id,
                      nom: item.nom,
                      code: item.code
                    })}
                  >
                    <div>
                      <span className="text-gray-700 font-medium text-lg">
                        {item.nom || 'Non spÃ©cifiÃ©'}
                      </span>
                      <span className="text-gray-500 text-sm ml-2 font-mono bg-gray-100 px-2 py-1 rounded">
                        {item.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="info" size="md">
                        {item.count} producteurs
                      </Badge>
                      <Icon name="ChevronRightIcon" size="md" className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // === VIEW 2: List of Certifications for Selected Type ===
          <div className="overflow-x-auto">
            {visibleCertifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune certification trouvée pour ce type</p>
              </div>
            ) : displayMode === 'compare' ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producteur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Certifications cote a cote
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {certificationsByProducteur.map((row) => (
                    <tr key={row.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{row.producteur_code}</div>
                        <div className="text-sm text-gray-500">{row.producteur_nom}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {row.certifications.map((cert) => (
                            <span key={`${row.key}-${cert.id}`} className="inline-flex items-center gap-1">
                              <Badge variant="info" size="sm">{cert.code}</Badge>
                              {getStatutBadge(cert.statut)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {row.certifications.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producteur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Certification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleCertifications.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {cert.producteur_code}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cert.producteur_nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {cert.type_certification_nom}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cert.type_certification_code}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatutBadge(cert.statut)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Historique des certifications par année */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark flex items-center gap-2">
            <Icon name="ChartBarIcon" size="md" className="text-gray-600" />
            Historique des certifications par année
          </h3>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Année début</label>
              <input type="number" value={histStart} onChange={(e)=>setHistStart(e.target.value)} className="w-28 px-3 py-2 border rounded" placeholder="Ex: 2021" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Année fin</label>
              <input type="number" value={histEnd} onChange={(e)=>setHistEnd(e.target.value)} className="w-28 px-3 py-2 border rounded" placeholder="Ex: 2025" />
            </div>
            <Button onClick={loadHistory} variant="primary">Appliquer</Button>
          </div>
        </div>
        {!filters.type_certification && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
            Sélectionnez d'abord un type de certification pour afficher l'historique.
          </div>
        )}
        {filters.type_certification && (
          <>
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-chick-yellow mx-auto"></div>
                <p className="mt-3 text-gray-600">Chargement...</p>
              </div>
            ) : (
              <>
                {historyData?.series?.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Bar
                      data={{
                        labels: historyData.series.map(s => s.annee),
                        datasets: [{
                          label: 'Certifications obtenues',
                          data: historyData.series.map(s => s.count),
                          backgroundColor: '#10B981',
                          borderRadius: 8,
                        }]
                      }}
                      options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
                    />
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Année</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certifications</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {historyData.series.map((s, idx) => (
                            <>
                              <tr key={`row-${idx}`} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{s.annee}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-dark">{s.count}</td>
                                <td className="px-4 py-3 text-sm">
                                  <button
                                    onClick={() => setExpandedYears(prev => ({ ...prev, [s.annee]: !prev[s.annee] }))}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    {expandedYears[s.annee] ? 'Masquer producteurs' : 'Voir producteurs'}
                                  </button>
                                </td>
                              </tr>
                              {expandedYears[s.annee] && (
                                <tr key={`exp-${idx}`} className="bg-gray-50">
                                  <td colSpan={3} className="px-4 py-3 text-sm">
                                    <div className="flex flex-wrap gap-2">
                                      {(historyData.producteurs_par_annee?.[s.annee] || []).map((p, i) => (
                                        <span key={i} className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-mono">{p.code}</span>
                                      ))}
                                      {(!historyData.producteurs_par_annee?.[s.annee] || historyData.producteurs_par_annee[s.annee].length === 0) && (
                                        <span className="text-gray-500 italic">Aucun producteur listé</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">Aucune donnÃ©e</div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Detail historique par annee (#20) : certifications + piece jointe, audits, non-conformites */}
      {historyData?.par_annee && Object.keys(historyData.par_annee).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
            <Icon name="CalendarIcon" size="md" className="text-gray-600" />
            Detail par annee
          </h3>
          {Object.entries(historyData.par_annee).map(([annee, bucket]) => (
            <div key={annee} className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="info" size="md">{annee}</Badge>
                <span className="text-sm text-gray-600">
                  {bucket.certifications.length} certification(s) · {bucket.audits.length} audit(s) · {bucket.nonconformites.length} non-conformite(s)
                </span>
              </div>

              {bucket.certifications.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Certifications</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entite</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">N°</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obtention</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Piece jointe</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bucket.certifications.map(cert => (
                          <tr key={cert.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-800">{cert.entite_label}</td>
                            <td className="px-3 py-2 text-gray-600">{cert.type_certification_nom}</td>
                            <td className="px-3 py-2 text-gray-600 font-mono">{cert.numero_certificat || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{cert.date_obtention}</td>
                            <td className="px-3 py-2">{getStatutBadge(cert.statut)}</td>
                            <td className="px-3 py-2">
                              {cert.fichier_certificat_url ? (
                                <a href={cert.fichier_certificat_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1">
                                  <Icon name="ArrowDownTrayIcon" size="sm" />
                                  Certificat
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
{bucket.audits.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Audits</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Organisme</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Resultat</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">NC</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rapport</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bucket.audits.map(audit => (
                          <tr key={audit.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-800">{audit.date_audit}</td>
                            <td className="px-3 py-2 text-gray-600">{audit.organisme || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{audit.resultat_display}</td>
                            <td className="px-3 py-2 text-gray-600">{audit.nb_nonconformites}</td>
                            <td className="px-3 py-2">
                              {audit.rapport_fichier_url ? (
                                <a href={audit.rapport_fichier_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1">
                                  <Icon name="DocumentTextIcon" size="sm" />
                                  Rapport
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
{bucket.nonconformites.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Non-conformites</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Audit</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producteur</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Preuve</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bucket.nonconformites.map(nc => (
                          <tr key={nc.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-600">#{nc.audit_id}</td>
                            <td className="px-3 py-2 text-gray-800">{nc.producteur_nom || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{nc.type_display}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{nc.description}</td>
                            <td className="px-3 py-2 text-gray-600">{nc.statut_display}</td>
                            <td className="px-3 py-2">
                              {nc.fichier_preuve_url ? (
                                <a href={nc.fichier_preuve_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1">
                                  <Icon name="PaperClipIcon" size="sm" />
                                  Preuve
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Audits & Non-conformitÃ©s */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark flex items-center gap-2">
            <Icon name="ClipboardDocumentCheckIcon" size="md" className="text-gray-600" />
            Audits & Non-conformitÃ©s
          </h3>
          <div className="flex items-center gap-3">
            <Button onClick={loadAudits} variant="secondary" icon="ArrowPathIcon">
              RafraÃ®chir
            </Button>
          </div>
        </div>
        {auditsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400 mx-auto"></div>
            <p className="mt-3 text-gray-600">Chargement...</p>
          </div>
        ) : (
          <>
            {auditStats && (
              <div className="flex flex-wrap gap-3 mb-4">
                {auditStats.par_resultat?.map((it, i) => (
                  <span key={i} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                    {it.resultat}: <span className="font-semibold">{it.count}</span>
                  </span>
                ))}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certification</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Résultat</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Non-conformités</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {audits.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{new Date(a.date_audit).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{a.type_certification_nom} <span className="text-gray-500 ml-1">({a.type_certification_code})</span></td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100">{a.resultat_display || a.resultat}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{a.nb_nonconformites || 0}</td>
                      <td className="px-4 py-3 text-sm flex gap-3">
                        {a.rapport_fichier && (
                          <a href={a.rapport_fichier} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Rapport</a>
                        )}
                        <button className="text-green-600 hover:text-green-800" onClick={() => { setSelectedAudit(a); loadAuditNCs(a.id); }}>Voir NC</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedAudit && (
              <div className="mt-6">
                <h4 className="font-semibold text-dark mb-2">Non-conformitÃ©s â€” Audit du {new Date(selectedAudit.date_audit).toLocaleDateString('fr-FR')}</h4>
                {auditNCsLoading ? (
                  <div className="text-center py-6 text-gray-500">Chargement...</div>
                ) : auditNCs.length === 0 ? (
                  <div className="text-gray-500">Aucune non-conformitÃ©</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producteur</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date limite</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {auditNCs.map((nc) => (
                          <tr key={nc.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">{nc.producteur_code || '-'}</td>
                            <td className="px-4 py-2 text-sm">{nc.type_display}</td>
                            <td className="px-4 py-2 text-sm">{nc.statut_display}</td>
                            <td className="px-4 py-2 text-sm">{nc.date_limite ? new Date(nc.date_limite).toLocaleDateString('fr-FR') : '-'}</td>
                            <td className="px-4 py-2 text-sm">
                              {nc.statut !== 'resolue' && (
                                <button onClick={() => resolveNC(nc.id)} className="text-green-600 hover:text-green-800">Marquer rÃ©solue</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FormationsCertifications;



