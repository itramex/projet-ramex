import { useState, useEffect } from 'react';
import { cooperativeService } from '../../services/api';
import Button from '../common/Button';
import Icon from '../common/Icon';
import VillageSelector from '../common/VillageSelector';

function ProducteurForm({ producteur, onSave, onCancel }) {
  const [activeTab, setActiveTab] = useState('identification');
  const [cooperatives, setCooperatives] = useState([]);
  const [loadingCooperatives, setLoadingCooperatives] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    prenom: '',
    commune: '',
    fokontany: '',
    village: '',
    telephone: '',
    email: '',
    sexe: 'M',
    femme_leader: false,
    niveau_education: 'primaire',
    date_naissance: '',
    statut_matrimonial: 'celibataire',
    cooperative: null,
    responsabilite_cooperative: 'aucune',
    membre_groupement_epargne: false,
    date_adhesion_groupement: '',
    paysan_relais: false,
    nb_adultes_plus_18: 0,
    nb_hommes_adultes: 0,
    nb_femmes_adultes: 0,
    personne_handicap_foyer: false,
    autres_enfants_foyer: 0,
    nb_enfants_garcons: 0,
    nb_enfants_filles: 0,
    nb_autres_garcons: 0,
    nb_autres_filles: 0,
    annee_naissance_enfant_1: '',
    annee_naissance_enfant_2: '',
    annee_naissance_enfant_3: '',
    annee_naissance_enfant_4: '',
    annee_naissance_enfant_5: '',
    annee_naissance_enfant_6: '',
    nb_enfants_scolarises: 0,
    nb_enfants_non_scolarises: 0,
    niveau_etude_enfant_1: '',
    continue_ecole_enfant_1: true,
    niveau_etude_enfant_2: '',
    continue_ecole_enfant_2: true,
    niveau_etude_enfant_3: '',
    continue_ecole_enfant_3: true,
    niveau_etude_enfant_4: '',
    continue_ecole_enfant_4: true,
    niveau_etude_enfant_5: '',
    continue_ecole_enfant_5: true,
    niveau_etude_enfant_6: '',
    continue_ecole_enfant_6: true,
    a_poubelles_triees: false,
    types_poubelles: '',
    dechets_non_eparpilles_maison: false,
    dechets_non_eparpilles_parcelle: false,
    recyclage_dechets: false,
    dechets_chimiques_enterres: false,
    lieu_dechets_chimiques: '',
    fosse_eaux_usees_maison: false,
    fosse_eaux_usees_champ: false,
    recyclage_eau_pluie: false,
    wc_maison: false,
    wc_champ: false,
    lieu_lavage: false,
    source_eau: '',
    eau_potable: false,
    fait_bouillir_eau: false,
    utilise_sureau: false,
    autre_traitement_eau: '',
    lave_linge_riviere: false,
    type_centre_sante: '',
    a_assurance_sante: false,
    respecte_dina: true,
    participe_travaux_communautaires: true,
    participe_protection_environnement: true,
    ne_brule_pas_foret: true,
    ne_coupe_pas_foret: true,
    ne_cultive_pas_zone_protegee: true,
    respecte_loi_animaux_proteges: true,
    pratique_chasse: false,
    animaux_chasses: '',
    pratique_elevage: false,
    animaux_eleves: '',
    a_exploite_foret_apres_2019: false,
    pratique_tavy: false,
    fait_defrichage: false,
    pratique_peche: false,
    peche_mer: false,
    peche_eau_douce: false,
    respecte_regles_peche: true,
    utilise_chimiques_autres_cultures: false,
    stocke_chimiques_maison: false,
    lieu_nettoyage_outils_chimiques: false,
    dotations_recues: '',
    formations_suivies: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'identification', label: 'Identification', icon: 'UserIcon' },
    { id: 'personnel', label: 'Infos Personnelles', icon: 'ClipboardDocumentListIcon' },
    { id: 'cooperative', label: 'Coopérative', icon: 'UserGroupIcon' },
    { id: 'foyer', label: 'Ménages', icon: 'HomeIcon' },
    { id: 'hygiene', label: 'Hygiène & Santé', icon: 'HeartIcon' },
    { id: 'environnement', label: 'Environnement', icon: 'GlobeAltIcon' },
    { id: 'activites', label: 'Activités', icon: 'BriefcaseIcon' },
    { id: 'formations', label: 'Formations', icon: 'AcademicCapIcon' },
  ];

  useEffect(() => {
    loadCooperatives();
  }, []);

  useEffect(() => {
    if (producteur) {
      setFormData(producteur);
    }
  }, [producteur]);

  const loadCooperatives = async () => {
    setLoadingCooperatives(true);
    try {
      const response = await cooperativeService.getAll({ active: 'true' });
      setCooperatives(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement coopératives:', error);
    } finally {
      setLoadingCooperatives(false);
    }
  };

  // Navigation au clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      const currentIndex = tabs.findIndex(t => t.id === activeTab);

      if ((e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) && currentIndex < tabs.length - 1) {
        e.preventDefault();
        setActiveTab(tabs[currentIndex + 1].id);
      }
      
      if ((e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) && currentIndex > 0) {
        e.preventDefault();
        setActiveTab(tabs[currentIndex - 1].id);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.querySelector('form').requestSubmit();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, tabs, onCancel]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleVillageDataChange = (villageData) => {
    setFormData(prev => ({
      ...prev,
      ...villageData
    }));
    // Clear errors for all location fields
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.village;
      delete newErrors.commune;
      delete newErrors.fokontany;
      return newErrors;
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.code) newErrors.code = 'Code requis';
    if (!formData.nom) newErrors.nom = 'Nom requis';
    if (!formData.commune) newErrors.commune = 'Commune requise';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setActiveTab('identification');
      alert('Veuillez remplir tous les champs obligatoires dans l\'onglet Identification');
      return;
    }
    
    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToTab = (direction) => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (direction === 'next' && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    } else if (direction === 'prev' && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-dark text-white p-6 flex justify-between items-center rounded-t-lg flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">
              {producteur ? 'Modifier' : 'Nouveau'} <span className="text-chick-yellow">Producteur</span>
            </h2>
            {producteur && (
              <p className="text-sm text-gray-300 mt-1">Code: {producteur.code}</p>
            )}
          </div>
          <button 
            onClick={onCancel} 
            className="text-white hover:text-chick-yellow transition-colors p-2 rounded-full hover:bg-gray-700"
            aria-label="Fermer"
          >
            <Icon name="XMarkIcon" size="lg" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b bg-gray-50 flex-shrink-0 sticky top-0 z-10 shadow-sm">
          <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white text-dark border-b-3 border-chick-yellow shadow-sm'
                    : 'text-gray-600 hover:text-dark hover:bg-gray-100'
                }`}
              >
                <Icon name={tab.icon} size="md" />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Indicateur de progression */}
        <div className="bg-gray-100 px-6 py-2 flex-shrink-0">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Onglet {tabs.findIndex(t => t.id === activeTab) + 1} / {tabs.length}
            </span>
            <div className="flex gap-1">
              {tabs.map((tab, idx) => (
                <div
                  key={tab.id}
                  className={`h-2 w-8 rounded-full transition-all ${
                    activeTab === tab.id
                      ? 'bg-chick-yellow'
                      : idx < tabs.findIndex(t => t.id === activeTab)
                      ? 'bg-green-400'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {activeTab === 'identification' && (
              <IdentificationTab 
                formData={formData} 
                handleChange={handleChange} 
                handleVillageDataChange={handleVillageDataChange}
                errors={errors} 
              />
            )}
            {activeTab === 'personnel' && (
              <PersonnelTab formData={formData} handleChange={handleChange} errors={errors} />
            )}
            {activeTab === 'cooperative' && (
              <CooperativeTab 
                formData={formData} 
                handleChange={handleChange} 
                cooperatives={cooperatives}
                loadingCooperatives={loadingCooperatives}
              />
            )}
            {activeTab === 'foyer' && (
              <FoyerEnfantsTab formData={formData} handleChange={handleChange} />
            )}
            {activeTab === 'hygiene' && (
              <HygieneSanteTab formData={formData} handleChange={handleChange} />
            )}
            {activeTab === 'environnement' && (
              <EnvironnementTab formData={formData} handleChange={handleChange} />
            )}
            {activeTab === 'activites' && (
              <ActivitesTab formData={formData} handleChange={handleChange} />
            )}
            {activeTab === 'formations' && (
              <FormationsTab formData={formData} handleChange={handleChange} />
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6 bg-gray-50 flex justify-between items-center flex-shrink-0 sticky bottom-0 shadow-lg">
            <div className="flex gap-3">
              {activeTab !== 'identification' && (
                <Button
                  type="button"
                  onClick={() => navigateToTab('prev')}
                  variant="secondary"
                  icon="ChevronLeftIcon"
                  iconPosition="left"
                >
                  Précédent
                </Button>
              )}
              
              {activeTab !== 'formations' && (
                <Button
                  type="button"
                  onClick={() => navigateToTab('next')}
                  variant="ghost"
                  icon="ChevronRightIcon"
                  iconPosition="right"
                  className="bg-gray-600 text-white hover:bg-gray-700"
                >
                  Suivant
                </Button>
              )}
            </div>

            <div className="flex gap-3 items-center">
              {Object.keys(errors).length > 0 && (
                <div className="text-sm text-red-600 flex items-center gap-2 mr-4">
                  <Icon name="ExclamationCircleIcon" size="md" className="text-red-600" />
                  <span>Champs obligatoires manquants</span>
                </div>
              )}
              
              <Button
                type="button"
                onClick={onCancel}
                variant="secondary"
              >
                Annuler
              </Button>
              
              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                variant="primary"
                icon={loading ? undefined : "CheckIcon"}
                className="shadow-md"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== ONGLET 1: IDENTIFICATION ====================
function IdentificationTab({ formData, handleChange, handleVillageDataChange, errors }) {
  return (
    <div className="space-y-6">
      {/* Section: Informations de base */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="UserIcon" size="md" className="text-gray-600" />
          Informations de base
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Code Producteur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                errors.code ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Ex: PROD001"
            />
            {errors.code && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.code}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                errors.nom ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Nom du producteur"
            />
            {errors.nom && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.nom}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              CIN
              <span className="text-xs text-gray-500 ml-2">(Format: 123 456 789 012)</span>
            </label>
            <input
              type="text"
              name="cin"
              value={formData.cin}
              onChange={handleChange}
              maxLength="15"
              placeholder="123 456 789 012"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
            <input
              type="text"
              name="prenom"
              value={formData.prenom}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                errors.prenom ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Prénom du producteur"
            />
            {errors.prenom && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.prenom}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section: Localisation */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="MapPinIcon" size="md" className="text-gray-600" />
          Localisation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Village <span className="text-red-500">*</span>
            </label>
            <VillageSelector
              value={formData.village}
              onChange={(value) => handleChange({ target: { name: 'village', value } })}
              onVillageDataChange={handleVillageDataChange}
              error={errors.village}
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Sélectionnez le village pour remplir automatiquement commune, fokontany et région
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Commune <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="commune"
              value={formData.commune}
              onChange={handleChange}
              readOnly
              className={`w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed transition-all ${
                errors.commune ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Auto-rempli depuis le village"
            />
            {errors.commune && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.commune}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fokontany</label>
            <input
              type="text"
              name="fokontany"
              value={formData.fokontany}
              onChange={handleChange}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed transition-all"
              placeholder="Auto-rempli depuis le village"
            />
          </div>
        </div>
      </div>

      {/* Section: Contact */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="PhoneIcon" size="md" className="text-gray-600" />
          Contact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">N° Téléphone</label>
            <input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                errors.telephone ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="+261 34 00 000 00"
            />
            {errors.telephone && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.telephone}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              placeholder="exemple@email.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ONGLET 2: PERSONNEL ====================
function PersonnelTab({ formData, handleChange, errors }) {
  return (
    <div className="space-y-6">
      {/* Section: Informations personnelles */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="UserCircleIcon" size="md" className="text-gray-600" />
          Informations personnelles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Genre <span className="text-red-500">*</span>
            </label>
            <select
              name="sexe"
              value={formData.sexe}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
            >
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de naissance</label>
            <input
              type="date"
              name="date_naissance"
              value={formData.date_naissance}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                errors.date_naissance ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.date_naissance && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.date_naissance}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Civilité</label>
            <select
              name="statut_matrimonial"
              value={formData.statut_matrimonial}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
            >
              <option value="celibataire">Célibataire</option>
              <option value="marie">Marié(e)</option>
              <option value="union_libre">Union libre</option>
              <option value="divorce">Divorcé(e)</option>
              <option value="veuf">Veuf/Veuve</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Niveau d'éducation</label>
            <select
              name="niveau_education"
              value={formData.niveau_education}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
            >
              <option value="prescolaire">Préscolaire</option>
              <option value="primaire">Primaire</option>
              <option value="college">Collège</option>
              <option value="lycee">Lycée</option>
              <option value="universite">Université</option>
            </select>
          </div>

          {formData.sexe === 'F' && (
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  name="femme_leader"
                  checked={formData.femme_leader}
                  onChange={handleChange}
                  className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Femme leader (responsabilité au niveau du groupe d'épargne communautaire)
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== ONGLET 3: COOPERATIVE ====================
function CooperativeTab({ formData, handleChange, cooperatives, loadingCooperatives }) {
  return (
    <div className="space-y-6">
      {/* Section: Coopérative */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="UserGroupIcon" size="md" className="text-gray-600" />
          Affiliation coopérative
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Coopérative</label>
            {loadingCooperatives ? (
              <div className="flex items-center gap-2 text-gray-500 p-3 bg-gray-50 rounded-lg">
                <Icon name="ArrowPathIcon" size="md" className="animate-spin" />
                <span>Chargement des coopératives...</span>
              </div>
            ) : (
              <>
                <select
                  name="cooperative"
                  value={formData.cooperative || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                >
                  <option value="">-- Aucune coopérative --</option>
                  {cooperatives.map((coop) => (
                    <option key={coop.id} value={coop.id}>
                      {coop.code} - {coop.nom} ({coop.commune})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Sélectionnez la coopérative dont ce producteur est membre
                </p>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsabilité</label>
            <select
              name="responsabilite_cooperative"
              value={formData.responsabilite_cooperative}
              onChange={handleChange}
              disabled={!formData.cooperative}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="aucune">Aucune responsabilité</option>
              <option value="president_coop">Président Coopérative</option>
              <option value="vice_president_coop">Vice Président Coopérative</option>
              <option value="tresorier_coop">Trésorier Coopérative</option>
              <option value="commissaire_coop">Commissaires aux comptes Coopérative</option>
              <option value="secretaire_coop">Secrétaire Coopérative</option>
              <option value="conseiller_coop">Conseillers Coopérative</option>
              <option value="president_ca">Président CA</option>
              <option value="vice_president_ca">Vice Président CA</option>
              <option value="tresorier_ca">Trésorier CA</option>
              <option value="commissaire_ca">Commissaires aux comptes CA</option>
              <option value="conseiller_ca">Conseiller CA</option>
              <option value="secretaire_ca">Secrétaire CA</option>
            </select>
            {!formData.cooperative && (
              <p className="text-xs text-gray-500 mt-1.5 italic">
                Veuillez d'abord sélectionner une coopérative
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section: Groupement d'épargne */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="BanknotesIcon" size="md" className="text-gray-600" />
          Groupement d'épargne
        </h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="membre_groupement_epargne"
              checked={formData.membre_groupement_epargne}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700">
              Membre d'une caisse communautaire (VSLA)
            </span>
          </label>

          {formData.membre_groupement_epargne && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date d'adhésion au groupement</label>
              <input
                type="date"
                name="date_adhesion_groupement"
                value={formData.date_adhesion_groupement || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* Section: Paysan relais */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="MegaphoneIcon" size="md" className="text-gray-600" />
          Rôle communautaire
        </h3>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            name="paysan_relais"
            checked={formData.paysan_relais}
            onChange={handleChange}
            className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
          />
          <span className="text-sm font-medium text-gray-700">Paysan relais</span>
        </label>
      </div>
    </div>
  );
}

// ==================== ONGLET 4: FOYER & ENFANTS ====================
function FoyerEnfantsTab({ formData, handleChange }) {
  return (
    <div className="space-y-6">
      {/* Section: Composition du ménage */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="HomeIcon" size="md" className="text-gray-600" />
          Composition du ménage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Adultes (18+ ans)</label>
            <input
              type="number"
              name="nb_adultes_plus_18"
              value={formData.nb_adultes_plus_18}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hommes adultes</label>
            <input
              type="number"
              name="nb_hommes_adultes"
              value={formData.nb_hommes_adultes}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Femmes adultes</label>
            <input
              type="number"
              name="nb_femmes_adultes"
              value={formData.nb_femmes_adultes}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              placeholder="0"
            />
          </div>

          <div className="md:col-span-3">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="personne_handicap_foyer"
                checked={formData.personne_handicap_foyer}
                onChange={handleChange}
                className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Personne en situation de handicap dans le ménage
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Section: Enfants */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="UserIcon" size="md" className="text-gray-600" />
          Enfants
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Garçons (propres enfants)</label>
            <input
              type="number"
              name="nb_enfants_garcons"
              value={formData.nb_enfants_garcons}
              onChange={handleChange}
              min="0"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Filles (propres enfants)</label>
            <input
              type="number"
              name="nb_enfants_filles"
              value={formData.nb_enfants_filles}
              onChange={handleChange}
              min="0"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Autres garçons (foyer)</label>
            <input
              type="number"
              name="nb_autres_garcons"
              value={formData.nb_autres_garcons}
              onChange={handleChange}
              min="0"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Autres filles (foyer)</label>
            <input
              type="number"
              name="nb_autres_filles"
              value={formData.nb_autres_filles}
              onChange={handleChange}
              min="0"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Section: Scolarisation */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="AcademicCapIcon" size="md" className="text-gray-600" />
          Scolarisation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Enfants scolarisés</label>
            <input
              type="number"
              name="nb_enfants_scolarises"
              value={formData.nb_enfants_scolarises}
              onChange={handleChange}
              min="0"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Enfants non scolarisés (en âge)</label>
            <input
              type="number"
              name="nb_enfants_non_scolarises"
              value={formData.nb_enfants_non_scolarises}
              onChange={handleChange}
              min="0"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ONGLET 5: HYGIENE & SANTE ====================
function HygieneSanteTab({ formData, handleChange }) {
  return (
    <div className="space-y-6">
      {/* Section: Gestion des déchets */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="TrashIcon" size="md" className="text-gray-600" />
          Gestion des déchets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="a_poubelles_triees"
              checked={formData.a_poubelles_triees}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">Dispose de 2 ou 3 types de poubelles</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="dechets_non_eparpilles_maison"
              checked={formData.dechets_non_eparpilles_maison}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">Déchets non éparpillés (maison)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="recyclage_dechets"
              checked={formData.recyclage_dechets}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">Pratique le recyclage</span>
          </label>
        </div>
      </div>

      {/* Section: Gestion de l'eau */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="BeakerIcon" size="md" className="text-gray-600" />
          Gestion de l'eau
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="wc_maison"
              checked={formData.wc_maison}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">WC à la maison</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="eau_potable"
              checked={formData.eau_potable}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">Eau potable</span>
          </label>
        </div>
      </div>

      {/* Section: Santé */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="HeartIcon" size="md" className="text-gray-600" />
          Santé
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de centre de santé</label>
            <select
              name="type_centre_sante"
              value={formData.type_centre_sante || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
            >
              <option value="">-</option>
              <option value="csb1">CSB I</option>
              <option value="csb2">CSB II</option>
              <option value="hopitaly">Hôpital</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="a_assurance_sante"
                checked={formData.a_assurance_sante}
                onChange={handleChange}
                className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">Possède une assurance santé</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ONGLET 6: ENVIRONNEMENT ====================
function EnvironnementTab({ formData, handleChange }) {
  return (
    <div className="space-y-6">
      {/* Section: Protection environnementale */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="GlobeAltIcon" size="md" className="text-gray-600" />
          Protection environnementale
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="ne_brule_pas_foret"
              checked={formData.ne_brule_pas_foret}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">Ne brûle pas la forêt</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="ne_coupe_pas_foret"
              checked={formData.ne_coupe_pas_foret}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">Ne coupe pas la forêt</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="respecte_dina"
              checked={formData.respecte_dina}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">Respecte les conventions sociales (dina)</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ==================== ONGLET 7: ACTIVITES ====================
function ActivitesTab({ formData, handleChange }) {
  return (
    <div className="space-y-6">
      {/* Section: Activités agricoles */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="BriefcaseIcon" size="md" className="text-gray-600" />
          Activités agricoles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="pratique_tavy"
              checked={formData.pratique_tavy}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">Pratique le brûlis (Tavy)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="pratique_peche"
              checked={formData.pratique_peche}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">Pratique la pêche</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name="pratique_elevage"
              checked={formData.pratique_elevage}
              onChange={handleChange}
              className="w-5 h-5 text-chick-yellow rounded focus:ring-chick-yellow focus:ring-2"
            />
            <span className="text-sm text-gray-700">Pratique l'élevage</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ==================== ONGLET 8: FORMATIONS ====================
function FormationsTab({ formData, handleChange }) {
  return (
    <div className="space-y-6">
      {/* Section: Dotations et formations */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
          <Icon name="AcademicCapIcon" size="md" className="text-gray-600" />
          Dotations et formations
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dotations reçues</label>
            <textarea
              name="dotations_recues"
              value={formData.dotations_recues || ''}
              onChange={handleChange}
              rows="5"
              placeholder="Ex: Boutures (100), Sécateurs (2), Engrais (5kg)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Formations suivies</label>
            <textarea
              name="formations_suivies"
              value={formData.formations_suivies || ''}
              onChange={handleChange}
              rows="5"
              placeholder="Ex: Formation vanniculture (2023), Gestion coopérative (2024)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProducteurForm;
