import { useState, useEffect } from 'react';
import Button from '../common/Button';
import Icon from '../common/Icon';
import VillageSelector from '../common/VillageSelector';

function CooperativeForm({ cooperative, onSave, onClose }) {
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    sigle: '',
    region: '',
    district: '',
    commune: '',
    fokontany: '',
    village: '',
    telephone: '',
    email: '',
    date_creation: '',
    description: '',
    objectifs: '',
    active: true,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooperative) {
      setFormData({
        code: cooperative.code || '',
        nom: cooperative.nom || '',
        sigle: cooperative.sigle || '',
        region: cooperative.region || '',
        district: cooperative.district || '',
        commune: cooperative.commune || '',
        fokontany: cooperative.fokontany || '',
        village: cooperative.village || '',
        telephone: cooperative.telephone || '',
        email: cooperative.email || '',
        date_creation: cooperative.date_creation || '',
        description: cooperative.description || '',
        objectifs: cooperative.objectifs || '',
        active: cooperative.active !== undefined ? cooperative.active : true,
      });
    }
  }, [cooperative]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleVillageDataChange = (villageData) => {
    setFormData(prev => ({
      ...prev,
      village: villageData.village,
      commune: villageData.commune,
      fokontany: villageData.fokontany
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
    
    if (!formData.code?.trim()) newErrors.code = 'Code requis';
    if (!formData.nom?.trim()) newErrors.nom = 'Nom requis';
    if (!formData.commune?.trim()) newErrors.commune = 'Commune requise';
    if (!formData.village?.trim()) newErrors.village = 'Village requis';
    if (!formData.date_creation) newErrors.date_creation = 'Date de création requise';

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Veuillez remplir tous les champs obligatoires');
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

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {cooperative ? 'Modifier la coopérative' : 'Nouvelle coopérative'}
              </h2>
              {cooperative && (
                <p className="text-green-100 text-sm mt-1">Code: {cooperative.code}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              aria-label="Fermer"
            >
              <Icon name="XMarkIcon" size="lg" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Informations générales */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
                <Icon name="ClipboardDocumentListIcon" size="md" className="text-gray-600" />
                Informations générales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    disabled={!!cooperative}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                      errors.code ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    } ${cooperative ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Ex: COOP001"
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
                    placeholder="Nom de la coopérative"
                  />
                  {errors.nom && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <Icon name="ExclamationCircleIcon" size="sm" />
                      {errors.nom}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sigle</label>
                  <input
                    type="text"
                    name="sigle"
                    value={formData.sigle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                    placeholder="Ex: COOP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date de création <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date_creation"
                    value={formData.date_creation}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                      errors.date_creation ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.date_creation && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <Icon name="ExclamationCircleIcon" size="sm" />
                      {errors.date_creation}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Localisation */}
            <div className="mb-6">
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
                    Sélectionnez le village pour remplir automatiquement commune, fokontany
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Région
                  </label>
                  <input
                    type="text"
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                      errors.region ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Sava"
                  />
                  {errors.region && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <Icon name="ExclamationCircleIcon" size="sm" />
                      {errors.region}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">District</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                    placeholder="Ex: Antalaha"
                  />
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

            {/* Contact */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
                <Icon name="PhoneIcon" size="md" className="text-gray-600" />
                Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                    placeholder="Ex: +261 34 12 345 67"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                      errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="email@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <Icon name="ExclamationCircleIcon" size="sm" />
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
                <Icon name="DocumentTextIcon" size="md" className="text-gray-600" />
                Description
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                    placeholder="Description de la coopérative..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Objectifs</label>
                  <textarea
                    name="objectifs"
                    value={formData.objectifs}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                    placeholder="Objectifs de la coopérative..."
                  />
                </div>
              </div>
            </div>

            {/* Statut */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="w-4 h-4 text-chick-yellow focus:ring-chick-yellow border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Coopérative active
                </span>
              </label>
            </div>
          </div>

          {/* Footer avec boutons - TOUJOURS VISIBLE */}
          <div className="flex-shrink-0 flex justify-end gap-3 p-6 bg-gray-50 border-t">
            <Button
              type="button"
              onClick={handleCancel}
              disabled={loading}
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
              className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
            >
              {loading ? 'Enregistrement...' : (cooperative ? 'Mettre à jour' : 'Créer')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CooperativeForm;
