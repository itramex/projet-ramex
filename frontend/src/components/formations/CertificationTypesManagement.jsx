import { useState, useEffect } from 'react';
import { formationService } from '../../services/api';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import SearchableSelect from '../common/SearchableSelect';

function CertificationTypesManagement() {
  const [certificationTypes, setCertificationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentCertification, setCurrentCertification] = useState(null);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    niveau: '',
    actif: ''
  });

  useEffect(() => {
    loadCertificationTypes();
  }, []);

  const loadCertificationTypes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await formationService.getAllTypesCertifications();
      const types = response.data.results || response.data;

      setCertificationTypes(types);
    } catch (err) {
      console.error('Erreur chargement types de certifications:', err);
      setError(err.response?.data?.detail || 'Erreur lors du chargement des certifications');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentCertification({
      nom: '',
      code: '',
      niveau: 'autre',
      description: '',
      organisme_certificateur: '',
      duree_validite_ans: 1,
      actif: true
    });
    setModalMode('create');
    setShowModal(true);
  };

  const handleEdit = (certType) => {
    setCurrentCertification({ ...certType });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleView = (certType) => {
    setCurrentCertification({ ...certType });
    setModalMode('view');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentCertification(null);
  };

  const handleSuccess = () => {
    setShowModal(false);
    setCurrentCertification(null);
    loadCertificationTypes();
  };

  const handleDelete = async (certType) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la certification "${certType.nom}" ?`)) {
      try {
        await formationService.deleteTypeCertification(certType.id);
        loadCertificationTypes();
      } catch (err) {
        console.error('Erreur suppression:', err);
        setError(err.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const filteredTypes = certificationTypes.filter(cert => {
    const matchesSearch = cert.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesNiveau = filters.niveau ? cert.niveau === filters.niveau : true;
    const matchesActif = filters.actif ? cert.actif === (filters.actif === 'true') : true;

    return matchesSearch && matchesNiveau && matchesActif;
  });

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({ niveau: '', actif: '' });
  };

  const niveauOptions = [
    { value: '', label: 'Tous les niveaux' },
    { value: 'bio', label: 'BIO' },
    { value: 'fair_trade', label: 'Fair Trade' },
    { value: 'rainforest', label: 'Rainforest Alliance' },
    { value: 'uebt', label: 'UEBT' },
    { value: 'g4g', label: 'Good4Good' },
    { value: 'ffl', label: 'FFL' },
    { value: 'pact', label: 'PACT' },
    { value: 'autre', label: 'Autre' }
  ];

  const actifOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'true', label: 'Actif' },
    { value: 'false', label: 'Inactif' }
  ];

  const getNiveauBadge = (niveau) => {
    const variantMap = {
      bio: 'success',
      fair_trade: 'info',
      rainforest: 'warning',
      uebt: 'neutral',
      g4g: 'primary',
      ffl: 'secondary',
      pact: 'purple',
      autre: 'gray'
    };

    const labels = {
      bio: 'BIO',
      fair_trade: 'Fair Trade',
      rainforest: 'Rainforest Alliance',
      uebt: 'UEBT',
      g4g: 'Good4Good',
      ffl: 'FFL',
      pact: 'PACT',
      autre: 'Autre'
    };

    return (
      <Badge variant={variantMap[niveau] || 'neutral'} size="sm">
        {labels[niveau] || niveau}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <Icon name="ExclamationTriangleIcon" size="xl" className="text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            onClick={loadCertificationTypes}
            variant="primary"
            icon="ArrowPathIcon"
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-dark mb-2">
              Gestion des <span className="text-chick-yellow">Certifications</span>
            </h1>
            <p className="text-gray-600">Gérez les types de certifications disponibles dans le système</p>
          </div>
          <Button
            variant="primary"
            icon="PlusIcon"
            onClick={handleAdd}
            className="flex-shrink-0"
          >
            Ajouter une Certification
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom, code ou description..."
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-chick-yellow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
            <select
              value={filters.niveau}
              onChange={(e) => setFilters({ ...filters, niveau: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-chick-yellow"
            >
              {niveauOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={filters.actif}
              onChange={(e) => setFilters({ ...filters, actif: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-chick-yellow"
            >
              {actifOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleResetFilters}
              variant="secondary"
              icon="ArrowPathIcon"
              className="w-full"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card padding="md" className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Certifications</p>
              <p className="text-3xl font-bold text-dark">{certificationTypes.length}</p>
            </div>
            <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center">
              <Icon name="CheckBadgeIcon" size="lg" className="text-white" />
            </div>
          </div>
        </Card>

        <Card padding="md" className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Actives</p>
              <p className="text-3xl font-bold text-dark">{certificationTypes.filter(c => c.actif).length}</p>
            </div>
            <div className="bg-green-500 w-16 h-16 rounded-full flex items-center justify-center">
              <Icon name="CheckCircleIcon" size="lg" className="text-white" />
            </div>
          </div>
        </Card>

        <Card padding="md" className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Inactives</p>
              <p className="text-3xl font-bold text-dark">{certificationTypes.filter(c => !c.actif).length}</p>
            </div>
            <div className="bg-gray-500 w-16 h-16 rounded-full flex items-center justify-center">
              <Icon name="PauseCircleIcon" size="lg" className="text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Certifications List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-chick-yellow mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune certification trouvée</p>
              <Button onClick={handleResetFilters} variant="secondary" size="sm" className="mt-4">
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organisme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTypes.map((certType) => (
                  <tr key={certType.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{certType.nom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="info" size="sm">{certType.code}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getNiveauBadge(certType.niveau)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {certType.organisme_certificateur || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {certType.duree_validite_ans} an(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={certType.actif ? 'success' : 'error'} size="sm">
                        {certType.actif ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleView(certType)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir"
                      >
                        <Icon name="EyeIcon" size="sm" className="inline" />
                      </button>
                      <button
                        onClick={() => handleEdit(certType)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Modifier"
                      >
                        <Icon name="PencilIcon" size="sm" className="inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(certType)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Icon name="TrashIcon" size="sm" className="inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Certification Form Modal */}
      {showModal && (
        <CertificationTypeFormModal
          certification={currentCertification}
          mode={modalMode}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

// ========== Certification Type Form Modal ==========
function CertificationTypeFormModal({ certification, mode, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nom: certification?.nom || '',
    code: certification?.code || '',
    niveau: certification?.niveau || 'autre',
    description: certification?.description || '',
    organisme_certificateur: certification?.organisme_certificateur || '',
    duree_validite_ans: certification?.duree_validite_ans || 1,
    actif: certification?.actif !== undefined ? certification.actif : true
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (certification) {
      setFormData({
        nom: certification.nom || '',
        code: certification.code || '',
        niveau: certification.niveau || 'autre',
        description: certification.description || '',
        organisme_certificateur: certification.organisme_certificateur || '',
        duree_validite_ans: certification.duree_validite_ans || 1,
        actif: certification.actif !== undefined ? certification.actif : true
      });
    }
  }, [certification]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'create') {
        await formationService.createTypeCertification(formData);
      } else if (mode === 'edit') {
        await formationService.updateTypeCertification(certification.id, formData);
      }
      onSuccess();
    } catch (err) {
      console.error('Erreur soumission:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la soumission du formulaire');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = mode === 'view';
  const isCreate = mode === 'create';
  const title = mode === 'create' ? 'Ajouter une Certification' : mode === 'edit' ? 'Modifier la Certification' : 'Détails de la Certification';

  const niveauOptions = [
    { value: 'bio', label: 'BIO' },
    { value: 'fair_trade', label: 'Fair Trade' },
    { value: 'rainforest', label: 'Rainforest Alliance' },
    { value: 'uebt', label: 'UEBT' },
    { value: 'g4g', label: 'Good4Good' },
    { value: 'ffl', label: 'FFL' },
    { value: 'pact', label: 'PACT' },
    { value: 'autre', label: 'Autre' }
  ];

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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                required
                readOnly={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
                placeholder="Ex: Rainforest Alliance, Fair Trade, etc."
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                readOnly={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
                placeholder="Ex: RA, FT, G4G, etc."
                maxLength={50}
              />
            </div>

            {/* Niveau */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Niveau/Type <span className="text-red-500">*</span>
              </label>
              <select
                name="niveau"
                value={formData.niveau}
                onChange={handleChange}
                required
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
              >
                {niveauOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                readOnly={isReadOnly}
                rows={3}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
                placeholder="Description de la certification..."
              />
            </div>

            {/* Organisme Certificateur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organisme Certificateur
              </label>
              <input
                type="text"
                name="organisme_certificateur"
                value={formData.organisme_certificateur}
                onChange={handleChange}
                readOnly={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
                placeholder="Ex: Rainforest Alliance, Fairtrade International, etc."
              />
            </div>

            {/* Durée de Validité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée de Validité (années) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="duree_validite_ans"
                value={formData.duree_validite_ans}
                onChange={handleChange}
                required
                readOnly={isReadOnly}
                min={1}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : 'focus:outline-none focus:ring-2 focus:ring-chick-yellow'}`}
              />
            </div>

            {/* Statut Actif */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="actif"
                id="actif"
                checked={formData.actif}
                onChange={handleChange}
                disabled={isReadOnly}
                className="h-4 w-4 text-chick-yellow border-gray-300 rounded focus:ring-chick-yellow"
              />
              <label htmlFor="actif" className="ml-2 block text-sm text-gray-700">
                Certification Active
              </label>
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
        </div>
      </div>
    </div>
  );
}

export default CertificationTypesManagement;