import { useState, useEffect, useRef, useDeferredValue, useCallback } from 'react';
import { producteurService, dashboardService } from '../../services/api';
import { Pagination } from '../../components/common/Pagination';
import ProducteurForm from './ProducteurForm';
import ProducteurDetails from './ProducteurDetails';
import ImportExcel from '../common/ImportExcel';
import SearchableSelect from '../common/SearchableSelect';
import ExportPersonnalise from '../common/ExportPersonnalise';
import { CanCreate, CanUpdate, CanDelete, CanImport } from '../common/PermissionWrapper';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';

const ITEMS_PER_PAGE = 100;

function ProducteurList() {
  const [producteurs, setProducteurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filters, setFilters] = useState({
    sexe: [],
    village: [],
    commune: [],
    ageMin: '',
    ageMax: '',
  });
  const [showInactifs, setShowInactifs] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExportPersonnalise, setShowExportPersonnalise] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedProducteur, setSelectedProducteur] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // Options pour les dropdowns de filtre (chargées depuis le dashboard)
  const [villageOptions, setVillageOptions] = useState([]);
  const [communeOptions, setCommuneOptions] = useState([]);

  useEffect(() => {
    loadVillagesCommunes();
  }, []);

  const loadVillagesCommunes = async () => {
    try {
      const response = await dashboardService.getVillagesAndCommunes();
      const vc = response.data;
      setVillageOptions((vc.villages || []).map(v => ({ value: v, label: v })));
      setCommuneOptions((vc.communes || []).map(c => ({ value: c, label: c })));
    } catch (e) {
      console.error('Erreur chargement villages/communes:', e);
    }
  };

  // Pagination côté serveur
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  // Charger les producteurs avec les filtres et pagination côté serveur
  const loadProducteurs = useCallback(async (page = 1) => {
    setLoading(true);
    setShowHistorique(false);
    try {
      const params = { page, page_size: ITEMS_PER_PAGE };
      if (!showInactifs) params.actif = 'true';
      if (deferredSearchTerm) params.search = deferredSearchTerm;
      if (filters.sexe && filters.sexe.length > 0) params.sexe = filters.sexe.join(',');
      if (filters.village && filters.village.length > 0) params.village = filters.village.join(',');
      if (filters.commune && filters.commune.length > 0) params.commune = filters.commune.join(',');
      if (filters.ageMin) params.age_min = filters.ageMin;
      if (filters.ageMax) params.age_max = filters.ageMax;

      const response = await producteurService.getAll(params);
      const data = response.data;
      setProducteurs(data.results || []);
      setTotalItems(data.count || 0);
    } catch (error) {
      console.error('Erreur chargement producteurs:', error);
    }
    setLoading(false);
  }, [deferredSearchTerm, filters, showInactifs]);

  // Charger au montage et quand les filtres changent (reset page 1)
  useEffect(() => {
    loadProducteurs(1);
    setCurrentPage(1);
  }, [deferredSearchTerm, filters, showInactifs]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadProducteurs(page);
  };

  // Scroll synchronization
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);



  const handleScroll = (source) => (e) => {
    const scrollLeft = e.target.scrollLeft;
    if (source === 'top' && tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = scrollLeft;
      if (bottomScrollRef.current) bottomScrollRef.current.scrollLeft = scrollLeft;
    } else if (source === 'table') {
      if (topScrollRef.current) topScrollRef.current.scrollLeft = scrollLeft;
      if (bottomScrollRef.current) bottomScrollRef.current.scrollLeft = scrollLeft;
    } else if (source === 'bottom' && tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = scrollLeft;
      if (topScrollRef.current) topScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  // Colonnes disponibles - TOUS LES CHAMPS du modèle Producteur
  const availableColumns = [
    // === IDENTIFICATION ===
    { id: 'code', label: 'Code', enabled: true, required: true, category: 'Identification' },
    { id: 'nom_complet', label: 'Nom Complet', enabled: true, required: true, category: 'Identification' },
    { id: 'cin', label: 'CIN', enabled: false, category: 'Identification' },
    { id: 'photo', label: 'Photo', enabled: false, category: 'Identification' },

    // === INFORMATIONS PERSONNELLES ===
    { id: 'genre', label: 'Genre', enabled: true, category: 'Personnel' },
    { id: 'age', label: 'Âge', enabled: false, category: 'Personnel' },
    { id: 'date_naissance', label: 'Date de naissance', enabled: false, category: 'Personnel' },
    { id: 'statut_matrimonial', label: 'Statut matrimonial', enabled: false, category: 'Personnel' },
    { id: 'niveau_education', label: 'Niveau éducation', enabled: false, category: 'Personnel' },
    { id: 'femme_leader', label: 'Femme leader', enabled: false, category: 'Personnel' },

    // === LOCALISATION ===
    { id: 'village', label: 'Village', enabled: true, category: 'Localisation' },
    { id: 'commune', label: 'Commune', enabled: true, category: 'Localisation' },
    { id: 'fokontany', label: 'Fokontany', enabled: false, category: 'Localisation' },

    // === CONTACT ===
    { id: 'telephone', label: 'Téléphone', enabled: false, category: 'Contact' },
    { id: 'email', label: 'Email', enabled: false, category: 'Contact' },

    // === COOPÉRATIVE ===
    { id: 'cooperative', label: 'Coopérative', enabled: false, category: 'Coopérative' },
    { id: 'responsabilite_cooperative', label: 'Responsabilité coop', enabled: true, category: 'Coopérative' },
    { id: 'membre_groupement_epargne', label: 'Membre VSLA', enabled: false, category: 'Coopérative' },
    { id: 'date_adhesion_groupement', label: 'Date adhésion VSLA', enabled: false, category: 'Coopérative' },
    { id: 'paysan_relais', label: 'Paysan relais', enabled: false, category: 'Coopérative' },
    { id: 'satellite_floraison', label: 'Satellite floraison', enabled: false, category: 'Coopérative' },

    // === COMPOSITION DU FOYER ===
    { id: 'nb_adultes_plus_18', label: 'Adultes +18 ans', enabled: false, category: 'Foyer' },
    { id: 'nb_hommes_adultes', label: 'Hommes adultes', enabled: false, category: 'Foyer' },
    { id: 'nb_femmes_adultes', label: 'Femmes adultes', enabled: false, category: 'Foyer' },
    { id: 'personne_handicap_foyer', label: 'Handicap au foyer', enabled: false, category: 'Foyer' },
    { id: 'autres_enfants_foyer', label: 'Autres enfants', enabled: false, category: 'Foyer' },

    // === ENFANTS ===
    { id: 'nb_enfants_garcons', label: 'Garçons', enabled: false, category: 'Enfants' },
    { id: 'nb_enfants_filles', label: 'Filles', enabled: false, category: 'Enfants' },
    { id: 'nb_autres_garcons', label: 'Autres garçons', enabled: false, category: 'Enfants' },
    { id: 'nb_autres_filles', label: 'Autres filles', enabled: false, category: 'Enfants' },
    { id: 'total_enfants', label: 'Total enfants', enabled: false, category: 'Enfants' },

    // === SCOLARISATION ===
    { id: 'nb_enfants_scolarises', label: 'Enfants scolarisés', enabled: false, category: 'Scolarisation' },
    { id: 'nb_enfants_non_scolarises', label: 'Enfants non scolarisés', enabled: false, category: 'Scolarisation' },

    // === GESTION DÉCHETS ===
    { id: 'a_poubelles_triees', label: 'Poubelles triées', enabled: false, category: 'Déchets' },
    { id: 'types_poubelles', label: 'Types poubelles', enabled: false, category: 'Déchets' },
    { id: 'dechets_non_eparpilles_maison', label: 'Déchets maison OK', enabled: false, category: 'Déchets' },
    { id: 'dechets_non_eparpilles_parcelle', label: 'Déchets parcelle OK', enabled: false, category: 'Déchets' },
    { id: 'recyclage_dechets', label: 'Recyclage', enabled: false, category: 'Déchets' },
    { id: 'dechets_chimiques_enterres', label: 'Chimiques enterrés', enabled: false, category: 'Déchets' },

    // === GESTION EAU ===
    { id: 'fosse_eaux_usees_maison', label: 'Fosse maison', enabled: false, category: 'Eau' },
    { id: 'fosse_eaux_usees_champ', label: 'Fosse champ', enabled: false, category: 'Eau' },
    { id: 'recyclage_eau_pluie', label: 'Recyclage eau pluie', enabled: false, category: 'Eau' },
    { id: 'wc_maison', label: 'WC maison', enabled: false, category: 'Eau' },
    { id: 'wc_champ', label: 'WC champ', enabled: false, category: 'Eau' },
    { id: 'lieu_lavage', label: 'Lieu lavage', enabled: false, category: 'Eau' },
    { id: 'source_eau', label: 'Source eau', enabled: false, category: 'Eau' },
    { id: 'eau_potable', label: 'Eau potable', enabled: false, category: 'Eau' },
    { id: 'fait_bouillir_eau', label: 'Fait bouillir eau', enabled: false, category: 'Eau' },
    { id: 'utilise_sureau', label: "Utilise Sur'eau", enabled: false, category: 'Eau' },
    { id: 'lave_linge_riviere', label: 'Lave à la rivière', enabled: false, category: 'Eau' },

    // === SANTÉ ===
    { id: 'type_centre_sante', label: 'Type centre santé', enabled: false, category: 'Santé' },
    { id: 'a_assurance_sante', label: 'Assurance santé', enabled: false, category: 'Santé' },
    { id: 'mahavelona', label: 'Mahavelona (Mutuelle)', enabled: false, category: 'Santé' },

    // === VIE COMMUNAUTAIRE ===
    { id: 'respecte_dina', label: 'Respecte dina', enabled: false, category: 'Communautaire' },
    { id: 'participe_travaux_communautaires', label: 'Travaux communautaires', enabled: false, category: 'Communautaire' },
    { id: 'participe_protection_environnement', label: 'Protection environnement', enabled: false, category: 'Communautaire' },
    { id: 'ne_brule_pas_foret', label: 'Ne brûle pas forêt', enabled: false, category: 'Communautaire' },
    { id: 'ne_coupe_pas_foret', label: 'Ne coupe pas forêt', enabled: false, category: 'Communautaire' },
    { id: 'ne_cultive_pas_zone_protegee', label: 'Pas culture zone protégée', enabled: false, category: 'Communautaire' },
    { id: 'respecte_loi_animaux_proteges', label: 'Respecte loi animaux', enabled: false, category: 'Communautaire' },

    // === CHASSE & ÉLEVAGE ===
    { id: 'pratique_chasse', label: 'Pratique chasse', enabled: false, category: 'Chasse & Élevage' },
    { id: 'animaux_chasses', label: 'Animaux chassés', enabled: false, category: 'Chasse & Élevage' },
    { id: 'pratique_elevage', label: 'Pratique élevage', enabled: false, category: 'Chasse & Élevage' },
    { id: 'animaux_eleves', label: 'Animaux élevés', enabled: false, category: 'Chasse & Élevage' },

    // === ACTIVITÉS AGRICOLES ===
    { id: 'a_exploite_foret_apres_2019', label: 'Exploité forêt >2019', enabled: false, category: 'Agriculture' },
    { id: 'pratique_tavy', label: 'Pratique Tavy', enabled: false, category: 'Agriculture' },
    { id: 'fait_defrichage', label: 'Fait défrichage', enabled: false, category: 'Agriculture' },
    { id: 'pratique_peche', label: 'Pratique pêche', enabled: false, category: 'Agriculture' },
    { id: 'peche_mer', label: 'Pêche mer', enabled: false, category: 'Agriculture' },
    { id: 'peche_eau_douce', label: 'Pêche eau douce', enabled: false, category: 'Agriculture' },
    { id: 'respecte_regles_peche', label: 'Respecte règles pêche', enabled: false, category: 'Agriculture' },

    // === PRODUITS CHIMIQUES ===
    { id: 'utilise_chimiques_autres_cultures', label: 'Chimiques autres cultures', enabled: false, category: 'Chimiques' },
    { id: 'stocke_chimiques_maison', label: 'Stocke chimiques maison', enabled: false, category: 'Chimiques' },
    { id: 'lieu_nettoyage_outils_chimiques', label: 'Lieu nettoyage outils', enabled: false, category: 'Chimiques' },

    // === DOTATIONS & FORMATIONS ===
    { id: 'dotations_recues', label: 'Dotations reçues', enabled: false, category: 'Dotations' },
    { id: 'formations_suivies', label: 'Formations suivies', enabled: false, category: 'Dotations' },
    { id: 'dotation', label: 'Dotation (activité)', enabled: false, category: 'Dotations' },

    // === ACTIVITÉS GÉNÉRATRICES DE REVENUS ===
    { id: 'agr1', label: 'AGR 1', enabled: false, category: 'AGR' },
    { id: 'agr2', label: 'AGR 2', enabled: false, category: 'AGR' },

    // === PARCELLES ===
    { id: 'nb_parcelles', label: 'Nb parcelles', enabled: false, category: 'Parcelles' },

    // === STATUT & AUDIT ===
    { id: 'statut', label: 'Statut', enabled: true, category: 'Statut' },
    { id: 'date_adhesion_cooperative', label: 'Date adhésion coop', enabled: false, category: 'Statut' },
    { id: 'verifie', label: 'Vérifié', enabled: false, category: 'Statut' },
    { id: 'date_verification', label: 'Date vérification', enabled: false, category: 'Statut' },
    { id: 'date_modification', label: 'Dernière modification', enabled: false, category: 'Statut' },
  ];

  // État pour les colonnes visibles (charger depuis localStorage)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('producteurs_visible_columns');
    return saved ? JSON.parse(saved) : availableColumns;
  });

  // États pour l'historique
  const [showHistorique, setShowHistorique] = useState(false);
  const [historique, setHistorique] = useState([]);
  const [anneeHistorique, setAnneeHistorique] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // États pour replier/déplier les sections
  const [showHistoriqueSection, setShowHistoriqueSection] = useState(false);
  const [showFiltresSection, setShowFiltresSection] = useState(true);

  // Chargement historique
  const loadHistorique = async () => {
    if (!anneeHistorique && !(dateDebut && dateFin)) {
      alert('Veuillez choisir une année ou un intervalle de dates');
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (anneeHistorique) params.year = anneeHistorique;
      if (dateDebut && dateFin) {
        params.start = dateDebut;
        params.end = dateFin;
      }

      const response = await producteurService.historique(params);

      if (response.data && response.data.historique) {
        setHistorique(response.data.historique);
        setShowHistorique(true);
      } else {
        console.warn('Format de réponse inattendu:', response.data);
        setHistorique([]);
        setShowHistorique(true);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      alert('Erreur lors du chargement de l\'historique. Vérifiez votre authentification.');
      setHistorique([]);
    }
    setLoading(false);
  };

  const handleSave = async (data) => {
    try {
      if (selectedProducteur) {
        await producteurService.update(selectedProducteur.id, data);
      } else {
        await producteurService.create(data);
      }
      loadProducteurs(currentPage);
      setShowForm(false);
      setSelectedProducteur(null);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  const handleDelete = async (producteur) => {
    if (window.confirm(`Désactiver ${producteur.nom_complet} ?`)) {
      try {
        await producteurService.delete(producteur.id);
        loadProducteurs(currentPage);
      } catch (error) {
        console.error('Erreur suppression:', error);
      }
    }
  };

  const handleRestaurer = async (producteur) => {
    try {
      await producteurService.restaurer(producteur.id);
      loadProducteurs(currentPage);
    } catch (error) {
      console.error('Erreur restauration:', error);
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (!showInactifs) params.actif = 'true';
      if (deferredSearchTerm) params.search = deferredSearchTerm;
      if (filters.sexe && filters.sexe.length > 0) params.sexe = filters.sexe.join(',');
      if (filters.village && filters.village.length > 0) params.village = filters.village.join(',');
      if (filters.commune && filters.commune.length > 0) params.commune = filters.commune.join(',');

      const response = await producteurService.export(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `producteurs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export');
    }
  };

  // Filtrage amélioré - moved to pagination section to avoid initialization error

  useEffect(() => {
    if (tableScrollRef.current) {
      setScrollWidth(tableScrollRef.current.scrollWidth);
      setClientWidth(tableScrollRef.current.clientWidth);
    }
  }, [producteurs, visibleColumns, viewMode]);

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setFilters({ sexe: [], village: [], commune: [], ageMin: '', ageMax: '' });
  };

  // Compter les filtres actifs
  const activeFiltersCount = [
    searchTerm,
    filters.sexe && filters.sexe.length > 0,
    filters.village && filters.village.length > 0,
    filters.commune && filters.commune.length > 0,
    filters.ageMin,
    filters.ageMax
  ].filter(Boolean).length;

  // Gestion des colonnes visibles
  const toggleColumn = (columnId) => {
    const updated = visibleColumns.map(col =>
      col.id === columnId ? { ...col, enabled: !col.enabled } : col
    );
    setVisibleColumns(updated);
    localStorage.setItem('producteurs_visible_columns', JSON.stringify(updated));
  };

  const resetColumns = () => {
    setVisibleColumns(availableColumns);
    localStorage.setItem('producteurs_visible_columns', JSON.stringify(availableColumns));
  };

  // villageOptions et communeOptions sont chargés depuis le dashboard (voir loadVillagesCommunes)

  // Fonction pour rendre le contenu d'une cellule selon la colonne
  const renderCell = useCallback((column, prod) => {
    switch (column.id) {
      // === IDENTIFICATION ===
      case 'code':
        return <span className="font-semibold text-dark">{prod.code}</span>;

      case 'nom_complet':
        return (
          <div>
            <div className="font-medium text-dark">{prod.nom}</div>
            <div className="text-sm text-gray-600">{prod.prenom}</div>
            {prod.age && (
              <div className="text-xs text-gray-500 mt-1">{prod.age} ans</div>
            )}
          </div>
        );

      case 'cin':
        return <span className="text-sm text-gray-900">{prod.cin || '-'}</span>;

      case 'photo':
        return prod.photo ? (
          <img
            src={prod.photo}
            alt="Photo producteur"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : '-';

      // === INFORMATIONS PERSONNELLES ===
      case 'genre':
        // Use display field if available, otherwise fall back to original logic
        if (prod.sexe_display) {
          return (
            <Badge variant={prod.sexe === 'M' ? 'info' : 'warning'} size="sm">
              {prod.sexe_display}
            </Badge>
          );
        }
        return (
          <Badge variant={prod.sexe === 'M' ? 'info' : 'warning'} size="sm">
            {prod.sexe === 'M' ? 'M' : 'F'}
          </Badge>
        );

      case 'age':
        return prod.age ? <span className="text-sm text-gray-900">{prod.age} ans</span> : '-';

      case 'date_naissance':
        return prod.date_naissance ? (
          <span className="text-sm text-gray-900">
            {new Date(prod.date_naissance).toLocaleDateString('fr-FR')}
          </span>
        ) : '-';

      case 'statut_matrimonial':
        return <span className="text-sm text-gray-900">{prod.statut_matrimonial_display || prod.statut_matrimonial || '-'}</span>;

      case 'niveau_education':
        return <span className="text-sm text-gray-900">{prod.niveau_education_display || prod.niveau_education || '-'}</span>;

      case 'femme_leader':
        return prod.femme_leader ? (
          <Badge variant="warning" size="sm" icon="SparklesIcon">
            Leader
          </Badge>
        ) : '-';

      // === LOCALISATION ===
      case 'village':
        return <span className="text-sm text-gray-900">{prod.village || '-'}</span>;

      case 'commune':
        return <span className="text-sm text-gray-900">{prod.commune || '-'}</span>;

      case 'fokontany':
        return <span className="text-sm text-gray-900">{prod.fokontany || '-'}</span>;

      // === CONTACT ===
      case 'telephone':
        return <span className="text-sm text-gray-900">{prod.telephone || '-'}</span>;

      case 'email':
        return <span className="text-sm text-gray-900">{prod.email || '-'}</span>;

      // === COOPÉRATIVE ===
      case 'cooperative':
        return <span className="text-sm text-gray-900">{prod.cooperative?.nom || '-'}</span>;

      case 'responsabilite_cooperative':
        return <span className="text-sm text-gray-900">{prod.responsabilite_cooperative_display || prod.responsabilite_cooperative || '-'}</span>;

      case 'membre_groupement_epargne':
        return prod.membre_groupement_epargne ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'date_adhesion_groupement':
        return prod.date_adhesion_groupement ? (
          <span className="text-sm text-gray-900">
            {new Date(prod.date_adhesion_groupement).toLocaleDateString('fr-FR')}
          </span>
        ) : '-';

      case 'paysan_relais':
        return prod.paysan_relais ? (
          <Badge variant="warning" size="sm" icon="SpeakerWaveIcon">
            Relais
          </Badge>
        ) : '-';

      case 'satellite_floraison':
        return prod.satellite_floraison ? (
          <Badge variant="success" size="sm" icon="SignalIcon">
            Satellite
          </Badge>
        ) : '-';

      // === COMPOSITION DU FOYER ===
      case 'nb_adultes_plus_18':
        return <span className="text-sm text-gray-900">{prod.nb_adultes_plus_18 || 0}</span>;

      case 'nb_hommes_adultes':
        return <span className="text-sm text-gray-900">{prod.nb_hommes_adultes || 0}</span>;

      case 'nb_femmes_adultes':
        return <span className="text-sm text-gray-900">{prod.nb_femmes_adultes || 0}</span>;

      case 'personne_handicap_foyer':
        return prod.personne_handicap_foyer ? <Icon name="UserIcon" size="sm" className="text-gray-600" /> : '-';

      case 'autres_enfants_foyer':
        return <span className="text-sm text-gray-900">{prod.autres_enfants_foyer || 0}</span>;

      // === ENFANTS ===
      case 'nb_enfants_garcons':
        return <span className="text-sm text-gray-900">{prod.nb_enfants_garcons || 0}</span>;

      case 'nb_enfants_filles':
        return <span className="text-sm text-gray-900">{prod.nb_enfants_filles || 0}</span>;

      case 'nb_autres_garcons':
        return <span className="text-sm text-gray-900">{prod.nb_autres_garcons || 0}</span>;

      case 'nb_autres_filles':
        return <span className="text-sm text-gray-900">{prod.nb_autres_filles || 0}</span>;

      case 'total_enfants': {
        const total = (prod.nb_enfants_garcons || 0) + (prod.nb_enfants_filles || 0) +
          (prod.nb_autres_garcons || 0) + (prod.nb_autres_filles || 0);
        return <span className="text-sm text-gray-900">{total}</span>;
      }

      // === SCOLARISATION ===
      case 'nb_enfants_scolarises':
        return <span className="text-sm text-gray-900">{prod.nb_enfants_scolarises || 0}</span>;

      case 'nb_enfants_non_scolarises':
        return <span className="text-sm text-gray-900">{prod.nb_enfants_non_scolarises || 0}</span>;

      // === GESTION DÉCHETS ===
      case 'a_poubelles_triees':
        return prod.a_poubelles_triees ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'types_poubelles':
        return <span className="text-sm text-gray-900">{prod.types_poubelles || '-'}</span>;

      case 'dechets_non_eparpilles_maison':
        return prod.dechets_non_eparpilles_maison ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'dechets_non_eparpilles_parcelle':
        return prod.dechets_non_eparpilles_parcelle ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'recyclage_dechets':
        return prod.recyclage_dechets ? <Icon name="ArrowPathIcon" size="sm" className="text-green-600" /> : '-';

      case 'dechets_chimiques_enterres':
        return prod.dechets_chimiques_enterres ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      // === GESTION EAU ===
      case 'fosse_eaux_usees_maison':
        return prod.fosse_eaux_usees_maison ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'fosse_eaux_usees_champ':
        return prod.fosse_eaux_usees_champ ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'recyclage_eau_pluie':
        return prod.recyclage_eau_pluie ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'wc_maison':
        return prod.wc_maison ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'wc_champ':
        return prod.wc_champ ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'lieu_lavage':
        return prod.lieu_lavage ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'source_eau':
        return <span className="text-sm text-gray-900">{prod.source_eau_display || prod.source_eau || '-'}</span>;

      case 'eau_potable':
        return prod.eau_potable ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'fait_bouillir_eau':
        return prod.fait_bouillir_eau ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'utilise_sureau':
        return prod.utilise_sureau ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'lave_linge_riviere':
        return prod.lave_linge_riviere ? <Icon name="CheckIcon" size="sm" className="text-blue-600" /> : '-';

      // === SANTÉ ===
      case 'type_centre_sante':
        return <span className="text-sm text-gray-900">{prod.type_centre_sante_display || prod.type_centre_sante || '-'}</span>;

      case 'a_assurance_sante':
        return prod.a_assurance_sante ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'mahavelona':
        return prod.mahavelona ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      // === VIE COMMUNAUTAIRE ===
      case 'respecte_dina':
        return prod.respecte_dina ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'participe_travaux_communautaires':
        return prod.participe_travaux_communautaires ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'participe_protection_environnement':
        return prod.participe_protection_environnement ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'ne_brule_pas_foret':
        return prod.ne_brule_pas_foret ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'ne_coupe_pas_foret':
        return prod.ne_coupe_pas_foret ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'ne_cultive_pas_zone_protegee':
        return prod.ne_cultive_pas_zone_protegee ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'respecte_loi_animaux_proteges':
        return prod.respecte_loi_animaux_proteges ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      // === CHASSE & ÉLEVAGE ===
      case 'pratique_chasse':
        return prod.pratique_chasse ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'animaux_chasses':
        return <span className="text-sm text-gray-900">{prod.animaux_chasses || '-'}</span>;

      case 'pratique_elevage':
        return prod.pratique_elevage ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'animaux_eleves':
        return <span className="text-sm text-gray-900">{prod.animaux_eleves || '-'}</span>;

      // === ACTIVITÉS AGRICOLES ===
      case 'a_exploite_foret_apres_2019':
        return prod.a_exploite_foret_apres_2019 ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'pratique_tavy':
        return prod.pratique_tavy ? <Icon name="FireIcon" size="sm" className="text-orange-600" /> : '-';

      case 'fait_defrichage':
        return prod.fait_defrichage ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'pratique_peche':
        return prod.pratique_peche ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      case 'peche_mer':
        return prod.peche_mer ? <Icon name="CheckIcon" size="sm" className="text-blue-600" /> : '-';

      case 'peche_eau_douce':
        return prod.peche_eau_douce ? <Icon name="CheckIcon" size="sm" className="text-blue-600" /> : '-';

      case 'respecte_regles_peche':
        return prod.respecte_regles_peche ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      // === PRODUITS CHIMIQUES ===
      case 'utilise_chimiques_autres_cultures':
        return prod.utilise_chimiques_autres_cultures ? <Icon name="ExclamationTriangleIcon" size="sm" className="text-orange-600" /> : '-';

      case 'stocke_chimiques_maison':
        return prod.stocke_chimiques_maison ? <Icon name="ExclamationTriangleIcon" size="sm" className="text-orange-600" /> : '-';

      case 'lieu_nettoyage_outils_chimiques':
        return prod.lieu_nettoyage_outils_chimiques ? <Icon name="CheckIcon" size="sm" className="text-green-600" /> : '-';

      // === DOTATIONS & FORMATIONS ===
      case 'dotations_recues':
        return <span className="text-sm text-gray-900">{prod.dotations_recues || '-'}</span>;

      case 'formations_suivies':
        return <span className="text-sm text-gray-900">{prod.formations_suivies || '-'}</span>;

      case 'dotation':
        return <span className="text-sm text-gray-900">{prod.dotation || '-'}</span>;

      // === ACTIVITÉS GÉNÉRATRICES DE REVENUS ===
      case 'agr1':
        return <span className="text-sm text-gray-900">{prod.agr1 || '-'}</span>;

      case 'agr2':
        return <span className="text-sm text-gray-900">{prod.agr2 || '-'}</span>;

      // === PARCELLES ===
      case 'nb_parcelles':
        return <span className="text-sm text-gray-900">{prod.nb_parcelles || 0}</span>;

      // === STATUT & AUDIT ===
      case 'statut':
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={prod.actif ? 'success' : 'error'} size="sm">
              {prod.actif ? 'Actif' : 'Inactif'}
            </Badge>
            {prod.femme_leader && (
              <Badge variant="warning" size="sm" icon="SparklesIcon">
                Leader
              </Badge>
            )}
            {prod.paysan_relais && (
              <Badge variant="warning" size="sm" icon="SpeakerWaveIcon">
                Relais
              </Badge>
            )}
          </div>
        );

      case 'date_adhesion_cooperative':
        return prod.date_adhesion_cooperative ? (
          <span className="text-sm text-gray-900">
            {new Date(prod.date_adhesion_cooperative).toLocaleDateString('fr-FR')}
          </span>
        ) : '-';

      case 'verifie':
        return prod.verifie ? (
          <Badge variant="info" size="sm" icon="CheckBadgeIcon">
            Vérifié
          </Badge>
        ) : '-';

      case 'date_verification':
        return prod.date_verification ? (
          <span className="text-sm text-gray-900">
            {new Date(prod.date_verification).toLocaleDateString('fr-FR')}
          </span>
        ) : '-';

      case 'date_modification':
        return prod.date_modification ? (
          <span className="text-sm text-gray-900">
            {new Date(prod.date_modification).toLocaleDateString('fr-FR')}
          </span>
        ) : '-';

      default:
        return null;
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-dark">
            Gestion des <span className="text-primary-yellow">Producteurs</span>
          </h2>
          <p className="text-gray-600 mt-1">
            {totalItems} producteur(s) au total (Page {currentPage} de {totalPages})
          </p>
        </div>

        <div className="flex gap-3">
          <CanImport>
            <Button
              onClick={() => setShowImport(true)}
              variant="secondary"
              icon="ArrowUpTrayIcon"
              className="!bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-700"
            >
              Importer Excel
            </Button>
          </CanImport>

          {viewMode === 'list' && (
            <>
              <Button
                onClick={handleExport}
                variant="secondary"
                icon="ArrowDownTrayIcon"
                className="!bg-green-600 !text-white !border-green-600 hover:!bg-green-700"
              >
                Export rapide
              </Button>

              <Button
                onClick={() => setShowExportPersonnalise(true)}
                variant="secondary"
                icon="DocumentTextIcon"
                className="!bg-emerald-600 !text-white !border-emerald-600 hover:!bg-emerald-700"
              >
                Export personnalisé
              </Button>

              <Button
                onClick={() => setShowColumnSelector(true)}
                variant="secondary"
                icon="AdjustmentsHorizontalIcon"
                className="!bg-purple-600 !text-white !border-purple-600 hover:!bg-purple-700"
              >
                Personnaliser l'affichage
              </Button>
            </>
          )}

          <CanCreate>
            <Button
              onClick={() => {
                setSelectedProducteur(null);
                setShowForm(true);
              }}
              variant="primary"
              icon="PlusIcon"
            >
              Nouveau Producteur
            </Button>
          </CanCreate>
        </div>
      </div>

      {/* Filtres historique */}
      {
        viewMode === 'list' && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-3 cursor-pointer" onClick={() => setShowHistoriqueSection(!showHistoriqueSection)}>
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Icon name="CalendarIcon" size="md" />
                Historique
              </h3>
              <button className="text-gray-500 hover:text-gray-700 transition-colors">
                {showHistoriqueSection ? (
                  <Icon name="ChevronUpIcon" size="md" />
                ) : (
                  <Icon name="ChevronDownIcon" size="md" />
                )}
              </button>
            </div>
            {showHistoriqueSection && (
              <div className="space-y-4">
                {/* Ligne 1: Champs de sélection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">Année</label>
                    <select
                      value={anneeHistorique}
                      onChange={(e) => {
                        setAnneeHistorique(e.target.value);
                        setDateDebut('');
                        setDateFin('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    >
                      <option value="">-- Toutes --</option>
                      <option value="2015">2015</option>
                      <option value="2016">2016</option>
                      <option value="2017">2017</option>
                      <option value="2018">2018</option>
                      <option value="2019">2019</option>
                      <option value="2020">2020</option>
                      <option value="2021">2021</option>
                      <option value="2022">2022</option>
                      <option value="2023">2023</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">Date début</label>
                    <input
                      type="date"
                      value={dateDebut}
                      onChange={(e) => {
                        setDateDebut(e.target.value);
                        setAnneeHistorique('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">Date fin</label>
                    <input
                      type="date"
                      value={dateFin}
                      onChange={(e) => {
                        setDateFin(e.target.value);
                        setAnneeHistorique('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Ligne 2: Boutons d'action */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={loadHistorique}
                    disabled={loading}
                    variant="secondary"
                    icon="ChartBarIcon"
                    size="sm"
                    className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                  >
                    Historique
                  </Button>

                  <Button
                    onClick={loadProducteurs}
                    disabled={loading}
                    variant="secondary"
                    size="sm"
                  >
                    Liste actuelle
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* Toggle Vue */}
      <div className="flex justify-end mb-4">
        <div className="bg-gray-100 p-1 rounded-lg flex items-center">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary-yellow' : 'text-gray-500 hover:text-gray-700'}`}
            title="Vue par village"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary-yellow' : 'text-gray-500 hover:text-gray-700'}`}
            title="Vue liste"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(
              producteurs.reduce((acc, prod) => {
                const village = prod.village || 'Non défini';
                if (!acc[village]) {
                  acc[village] = {
                    nom: village,
                    commune: prod.commune || 'Non définie',
                    fokontany: prod.fokontany || 'Non défini',
                    count: 0,
                    hommes: 0,
                    femmes: 0,
                    producteurs: []
                  };
                }
                acc[village].count++;
                if (prod.sexe === 'M') acc[village].hommes++;
                if (prod.sexe === 'F') acc[village].femmes++;
                acc[village].producteurs.push(prod);
                return acc;
              }, {})
            ).map(([villageName, data]) => (
              <div key={villageName} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-dark mb-1">{data.nom}</h3>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Commune:</span> {data.commune}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Fokontany:</span> {data.fokontany}
                    </p>
                    <div className="flex gap-3 mt-2 text-sm">
                      <Badge variant="info" size="sm">
                        Hommes : {data.hommes}
                      </Badge>
                      <Badge variant="warning" size="sm">
                        Femmes : {data.femmes}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-primary-yellow/10 text-primary-yellow font-bold px-3 py-1 rounded-full text-sm">
                    {data.count} prod.
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, village: [data.nom] }));
                      setViewMode('list');
                    }}
                    variant="primary"
                    icon="ArrowRightIcon"
                    iconPosition="right"
                    className="w-full"
                  >
                    Voir la liste
                  </Button>
                </div>
              </div>
            ))}

            {producteurs.length > 0 && (
              <div className="mt-4 flex justify-center col-span-full">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
            {producteurs.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">Aucun producteur trouvé</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Filtres classiques */}
            {!showHistorique && (
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowFiltresSection(!showFiltresSection)}>
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Icon name="FunnelIcon" size="md" />
                      Filtres de recherche
                    </h3>
                    <button className="text-gray-500 hover:text-gray-700 transition-colors">
                      {showFiltresSection ? (
                        <Icon name="ChevronUpIcon" size="md" />
                      ) : (
                        <Icon name="ChevronDownIcon" size="md" />
                      )}
                    </button>
                  </div>
                  {activeFiltersCount > 0 && (
                    <Button
                      onClick={resetFilters}
                      variant="ghost"
                      size="sm"
                      icon="XMarkIcon"
                      className="text-red-600 hover:text-red-800"
                    >
                      Réinitialiser ({activeFiltersCount})
                    </Button>
                  )}
                </div>

                {showFiltresSection && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="relative">
                    <Icon name="MagnifyingGlassIcon" size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary-yellow w-full"
                    />
                  </div>

                    <SearchableSelect
                      options={[
                        { value: 'M', label: 'Masculin' },
                        { value: 'F', label: 'Féminin' }
                      ]}
                      value={filters.sexe}
                      onChange={(value) => setFilters({ ...filters, sexe: value })}
                      placeholder="Tous les genres"
                      displayKey="label"
                      valueKey="value"
                      multiple={true}
                    />

                    {/* Filtre Village (Multi-select) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                      <SearchableSelect
                        options={villageOptions}
                        value={filters.village}
                        onChange={(val) => setFilters(prev => ({ ...prev, village: val }))}
                        placeholder="Tous les villages"
                        displayKey="label"
                        valueKey="value"
                        multiple={true}
                      />
                    </div>

                    {/* Selected Villages Display */}
                    {filters.village && filters.village.length > 0 && (
                      <div className="col-span-full bg-blue-50 px-4 py-3 border border-blue-200 rounded">
                        <p className="text-sm text-gray-700 mb-2 font-medium">Villages sélectionnés :</p>
                        <div className="flex flex-wrap gap-2">
                          {filters.village.map(v => (
                            <span key={v} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filtre Âge */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Âge</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={filters.ageMin}
                          onChange={(e) => setFilters(prev => ({ ...prev, ageMin: e.target.value }))}
                          placeholder="Min"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary-yellow"
                        />
                        <input
                          type="number"
                          value={filters.ageMax}
                          onChange={(e) => setFilters(prev => ({ ...prev, ageMax: e.target.value }))}
                          placeholder="Max"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary-yellow"
                        />
                      </div>
                    </div>

                    <SearchableSelect
                      options={communeOptions}
                      value={filters.commune}
                      onChange={(value) => setFilters({ ...filters, commune: value })}
                      placeholder="Toutes les communes"
                      displayKey="label"
                      valueKey="value"
                      multiple={true}
                    />

                    <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border border-gray-300 rounded">
                      <input
                        type="checkbox"
                        checked={showInactifs}
                        onChange={(e) => setShowInactifs(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700 text-sm">Afficher inactifs</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Affichage conditionnel : Liste normale */}
            {!showHistorique && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Top Scrollbar */}
                {scrollWidth > clientWidth && (
                  <div
                    ref={topScrollRef}
                    className="overflow-x-auto border-b border-gray-200 bg-gray-100 scrollbar-wide"
                    onScroll={handleScroll('top')}
                  >
                    <div style={{ width: scrollWidth, height: '14px' }}></div>
                  </div>
                )}

                <div
                  className="overflow-x-auto scrollbar-thin"
                  ref={tableScrollRef}
                  onScroll={handleScroll('table')}
                >
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        {visibleColumns.filter(c => c.enabled).map((column) => (
                          <th
                            key={column.id}
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap"
                          >
                            {column.label}
                          </th>
                        ))}
                        <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider sticky right-0 bg-gray-100">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {producteurs.map((producteur, index) => (
                        <tr key={producteur.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors ${!producteur.actif ? 'opacity-60' : ''}`}>
                          {visibleColumns.filter(c => c.enabled).map((column) => (
                            <td key={`${producteur.id}-${column.id}`} className="px-6 py-4 whitespace-nowrap">
                              {renderCell(column, producteur)}
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-inherit shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.1)]">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedProducteur(producteur);
                                  setShowDetails(true);
                                }}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Détails"
                              >
                                <Icon name="EyeIcon" size="sm" />
                              </button>
                              <CanUpdate>
                                <button
                                  onClick={() => {
                                    setSelectedProducteur(producteur);
                                    setShowForm(true);
                                  }}
                                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Modifier"
                                >
                                  <Icon name="PencilIcon" size="sm" />
                                </button>
                              </CanUpdate>
                              <CanDelete>
                                {producteur.actif ? (
                                  <button
                                    onClick={() => handleDelete(producteur)}
                                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Désactiver"
                                  >
                                    <Icon name="TrashIcon" size="sm" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleRestaurer(producteur)}
                                    className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Restaurer"
                                  >
                                    <Icon name="ArrowPathIcon" size="sm" />
                                  </button>
                                )}
                              </CanDelete>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {scrollWidth > clientWidth && (
                  <div
                    ref={bottomScrollRef}
                    className="overflow-x-auto border-t border-gray-200 bg-gray-100 scrollbar-wide"
                    onScroll={handleScroll('bottom')}
                  >
                    <div style={{ width: scrollWidth, height: '14px' }}></div>
                  </div>
                )}
                {producteurs.length > 0 && (
                  <div className="mt-4 flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
                {producteurs.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">Aucun producteur trouvé</p>
                    <p className="text-sm text-gray-400 mt-2">Essayez de modifier vos filtres</p>
                  </div>
                )}



              </div>
            )}
          </>
        )
      }

      {/* Affichage Historique */}
      {
        showHistorique && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4 p-4 bg-purple-50 border-l-4 border-purple-600">
              <p className="text-purple-900 font-semibold flex items-center gap-2">
                <Icon name="ChartBarIcon" size="md" />
                Historique des Données Structurées
              </p>
              <p className="text-sm text-purple-700 mt-1">
                {historique.length} enregistrement(s) trouvé(s)
              </p>
            </div>

            <div className="space-y-6">
              {historique.length === 0 && (
                <div className="text-center p-6 text-gray-500">
                  <Icon name="InformationCircleIcon" size="lg" className="mx-auto mb-2" />
                  <p>Aucune donnée historique trouvée pour la période sélectionnée</p>
                  <p className="text-sm mt-2">Essayez de sélectionner une autre année ou un autre intervalle</p>
                </div>
              )}

              {historique.map((histo, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  {/* En-tête */}
                  <div className="flex justify-between items-start mb-4 pb-3 border-b">
                    <div>
                      <h3 className="text-lg font-bold text-dark">
                        {histo.producteur_code} - {histo.producteur_nom}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {histo.village} • {histo.commune}
                        {histo.cooperative && ` • ${histo.cooperative}`}
                      </p>
                    </div>
                    <Badge variant="info" size="lg">
                      Année {histo.annee}
                    </Badge>
                  </div>

                  {/* Contenu en 3 colonnes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Productions */}
                    <div className="bg-green-50 rounded-lg p-3">
                      <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-1">
                        <Icon name="SparklesIcon" size="sm" />
                        Productions
                      </h4>
                      {histo.productions && histo.productions.length > 0 ? (
                        <div className="space-y-2">
                          {histo.productions.map((prod, idx) => (
                            <div key={idx} className="text-sm">
                              <p className="font-medium text-gray-800">{prod.culture}</p>
                              <p className="text-gray-600">{prod.quantite_kg} kg</p>
                              <p className="text-green-700">{prod.revenu.toLocaleString()} Ar</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Aucune production</p>
                      )}
                    </div>

                    {/* AGR */}
                    <div className="bg-blue-50 rounded-lg p-3">
                      <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                        <Icon name="CurrencyDollarIcon" size="sm" />
                        Revenus AGR
                      </h4>
                      {histo.agr && Object.keys(histo.agr).length > 0 ? (
                        <div className="space-y-2 text-sm">
                          {histo.agr.agr1 && (
                            <div>
                              <p className="font-medium text-gray-800">{histo.agr.agr1}</p>
                              <p className="text-blue-700">{histo.agr.revenu_agr1.toLocaleString()} Ar</p>
                            </div>
                          )}
                          {histo.agr.agr2 && (
                            <div>
                              <p className="font-medium text-gray-800">{histo.agr.agr2}</p>
                              <p className="text-blue-700">{histo.agr.revenu_agr2.toLocaleString()} Ar</p>
                            </div>
                          )}
                          {histo.agr.revenu_total > 0 && (
                            <div className="pt-2 border-t border-blue-200">
                              <p className="font-bold text-blue-900">
                                Total: {histo.agr.revenu_total.toLocaleString()} Ar
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Aucun revenu AGR</p>
                      )}
                    </div>

                    {/* Indicateurs Sociaux */}
                    <div className="bg-purple-50 rounded-lg p-3">
                      <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-1">
                        <Icon name="UserGroupIcon" size="sm" />
                        Indicateurs Sociaux
                      </h4>
                      {histo.social && Object.keys(histo.social).length > 0 ? (
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-gray-600">Enfants scolarisés</p>
                            <p className="font-bold text-purple-700">{histo.social.nb_enfants_scolarises || 0}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Taux de scolarisation</p>
                            <p className="font-bold text-purple-700">{histo.social.taux_scolarisation || 0}%</p>
                          </div>
                          <div className="flex gap-2 pt-2">
                            {histo.social.a_assurance_sante && (
                              <Badge variant="success" size="sm">Assurance santé</Badge>
                            )}
                            {histo.social.mahavelona && (
                              <Badge variant="success" size="sm">Mahavelona</Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Aucun indicateur</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {
        showForm && (
          <ProducteurForm
            producteur={selectedProducteur}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setSelectedProducteur(null);
            }}
          />
        )
      }

      {
        showDetails && selectedProducteur && (
          <ProducteurDetails
            producteurId={selectedProducteur.id}
            onClose={() => {
              setShowDetails(false);
              setSelectedProducteur(null);
            }}
            onEdit={(producteur) => {
              setShowDetails(false);
              setSelectedProducteur(producteur);
              setShowForm(true);
            }}
          />
        )
      }

      {
        showImport && (
          <ImportExcel
            onClose={() => setShowImport(false)}
            onSuccess={() => {
              setShowImport(false);
              loadProducteurs(currentPage);
            }}
          />
        )
      }

      {
        showExportPersonnalise && (
          <ExportPersonnalise
            isOpen={showExportPersonnalise}
            onClose={() => setShowExportPersonnalise(false)}
            service={producteurService}
            entityName="producteurs"
            colorScheme="green"
          />
        )
      }

      {/* Modal de personnalisation des colonnes */}
      {
        showColumnSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Personnaliser l'affichage du tableau
                </h3>
                <button
                  onClick={() => setShowColumnSelector(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <p className="text-gray-600 mb-4">
                  Sélectionnez les colonnes que vous souhaitez afficher dans le tableau
                </p>

                {/* Afficher par catégories */}
                <div className="space-y-6">
                  {Array.from(new Set(visibleColumns.map(c => c.category))).map(category => {
                    const categoryColumns = visibleColumns.filter(c => c.category === category);
                    const enabledCount = categoryColumns.filter(c => c.enabled).length;

                    return (
                      <div key={category} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-gray-800">{category}</h4>
                          <div className="flex gap-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {enabledCount}/{categoryColumns.length}
                            </span>
                            <button
                              onClick={() => {
                                const allEnabled = categoryColumns.every(c => c.enabled || c.required);
                                categoryColumns.forEach(column => {
                                  if (!column.required && column.enabled === allEnabled) {
                                    toggleColumn(column.id);
                                  }
                                });
                              }}
                              className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
                              title={categoryColumns.every(c => c.enabled || c.required) ? "Tout désélectionner" : "Tout sélectionner"}
                            >
                              {categoryColumns.every(c => c.enabled || c.required) ? "Tout désélectionner" : "Tout sélectionner"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categoryColumns.map((column) => (
                            <label
                              key={column.id}
                              className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${column.enabled
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                                } ${column.required ? 'opacity-75' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={column.enabled}
                                disabled={column.required}
                                onChange={() => !column.required && toggleColumn(column.id)}
                                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
                              />
                              <div className="flex-1">
                                <span className={`font-medium ${column.enabled ? 'text-purple-900' : 'text-gray-700'
                                  }`}>
                                  {column.label}
                                </span>
                                {column.required && (
                                  <span className="ml-2 text-xs text-purple-600 font-semibold">
                                    (Obligatoire)
                                  </span>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                    <Icon name="ChartBarIcon" size="sm" />
                    {visibleColumns.filter(c => c.enabled).length} colonnes affichées sur {visibleColumns.length}
                  </p>
                  <p className="text-xs text-gray-400">
                    Colonnes par catégories: {Array.from(new Set(visibleColumns.filter(c => c.enabled).map(c => c.category))).join(', ') || 'Aucune'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between gap-3">
                <Button
                  onClick={resetColumns}
                  variant="secondary"
                  icon="ArrowPathIcon"
                >
                  Réinitialiser
                </Button>
                <Button
                  onClick={() => setShowColumnSelector(false)}
                  variant="primary"
                  icon="CheckIcon"
                  className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
                >
                  Appliquer
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default ProducteurList;
