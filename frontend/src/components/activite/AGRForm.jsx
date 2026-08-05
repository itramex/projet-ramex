import { useState, useEffect } from 'react';
import Button from '../common/Button';
import Icon from '../common/Icon';

function AGRForm({ agr, producteurId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    producteur: producteurId || '',
    type_agr: '',
    ordre: 1,
    intrants_recus: false,
    quantite_intrants: '',
    utilisation: '',
    quantite_consommee_annuelle: '',
    quantite_vendue_annuelle: '',
    unite_mesure: 'kg',
    prix_vente_unitaire: '',
    nombre_bassins: '',
    nombre_volailles: '',
    active: true,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Types d'AGR disponibles
  const typesAGR = [
    { value: 'pisciculture', label: 'Pisciculture', icon: '🐟' },
    { value: 'aviculture', label: 'Aviculture', icon: '🐔' },
    { value: 'apiculture', label: 'Apiculture', icon: '🐝' },
    { value: 'maraichage', label: 'Maraîchage', icon: '🥬' },
    { value: 'elevage_bovin', label: 'Élevage bovin', icon: '🐄' },
    { value: 'elevage_porcin', label: 'Élevage porcin', icon: '🐷' },
    { value: 'autre', label: 'Autre', icon: '🌾' },
  ];

  // Options d'utilisation
  const utilisationOptions = [
    { value: 'consommation', label: 'À consommer' },
    { value: 'vente', label: 'À vendre' },
    { value: 'les_deux', label: 'Les deux' },
  ];

  useEffect(() => {
    if (agr) {
      setFormData({
        ...agr,
        producteur: agr.producteur || producteurId,
        quantite_intrants: agr.quantite_intrants || '',
        quantite_consommee_annuelle: agr.quantite_consommee_annuelle || '',
        quantite_vendue_annuelle: agr.quantite_vendue_annuelle || '',
        prix_vente_unitaire: agr.prix_vente_unitaire || '',
        nombre_bassins: agr.nombre_bassins || '',
        nombre_volailles: agr.nombre_volailles || '',
      });
    } else if (producteurId) {
      setFormData(prev => ({ ...prev, producteur: producteurId }));
    }
  }, [agr, producteurId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Calculate estimated revenue in real-time
  const calculateRevenue = () => {
    const qteVendue = parseFloat(formData.quantite_vendue_annuelle) || 0;
    const prix = parseFloat(formData.prix_vente_unitaire) || 0;
    return qteVendue * prix;
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.type_agr) {
      newErrors.type_agr = 'Type d\'AGR requis';
    }

    // Conditional validation based on utilisation
    if (formData.utilisation) {
      if (formData.utilisation === 'consommation' || formData.utilisation === 'les_deux') {
        if (!formData.quantite_consommee_annuelle || parseFloat(formData.quantite_consommee_annuelle) <= 0) {
          newErrors.quantite_consommee_annuelle = 'Quantité consommée requise et doit être positive';
        }
      }

      if (formData.utilisation === 'vente' || formData.utilisation === 'les_deux') {
        if (!formData.quantite_vendue_annuelle || parseFloat(formData.quantite_vendue_annuelle) <= 0) {
          newErrors.quantite_vendue_annuelle = 'Quantité vendue requise et doit être positive';
        }
        if (!formData.prix_vente_unitaire || parseFloat(formData.prix_vente_unitaire) <= 0) {
          newErrors.prix_vente_unitaire = 'Prix de vente requis et doit être positif';
        }
      }
    }

    // Positive numbers validation
    if (formData.quantite_intrants && parseFloat(formData.quantite_intrants) < 0) {
      newErrors.quantite_intrants = 'La quantité doit être positive';
    }
    if (formData.quantite_consommee_annuelle && parseFloat(formData.quantite_consommee_annuelle) < 0) {
      newErrors.quantite_consommee_annuelle = 'La quantité doit être positive';
    }
    if (formData.quantite_vendue_annuelle && parseFloat(formData.quantite_vendue_annuelle) < 0) {
      newErrors.quantite_vendue_annuelle = 'La quantité doit être positive';
    }
    if (formData.prix_vente_unitaire && parseFloat(formData.prix_vente_unitaire) < 0) {
      newErrors.prix_vente_unitaire = 'Le prix doit être positif';
    }
    if (formData.nombre_bassins && parseFloat(formData.nombre_bassins) < 0) {
      newErrors.nombre_bassins = 'Le nombre doit être positif';
    }
    if (formData.nombre_volailles && parseFloat(formData.nombre_volailles) < 0) {
      newErrors.nombre_volailles = 'Le nombre doit être positif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setLoading(true);
    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        // Convert empty strings to null for numeric fields
        quantite_intrants: formData.quantite_intrants ? parseFloat(formData.quantite_intrants) : null,
        quantite_consommee_annuelle: formData.quantite_consommee_annuelle ? parseFloat(formData.quantite_consommee_annuelle) : null,
        quantite_vendue_annuelle: formData.quantite_vendue_annuelle ? parseFloat(formData.quantite_vendue_annuelle) : null,
        prix_vente_unitaire: formData.prix_vente_unitaire ? parseFloat(formData.prix_vente_unitaire) : null,
        nombre_bassins: formData.nombre_bassins ? parseInt(formData.nombre_bassins) : null,
        nombre_volailles: formData.nombre_volailles ? parseInt(formData.nombre_volailles) : null,
      };

      await onSave(submitData);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      if (error.response?.data) {
        // Display API validation errors
        const apiErrors = {};
        Object.keys(error.response.data).forEach(key => {
          apiErrors[key] = Array.isArray(error.response.data[key])
            ? error.response.data[key][0]
            : error.response.data[key];
        });
        setErrors(apiErrors);
      }
      alert('Erreur lors de l\'enregistrement. Veuillez vérifier les champs.');
    } finally {
      setLoading(false);
    }
  };

  // Check if we should show consumption fields
  const showConsommation = formData.utilisation === 'consommation' || formData.utilisation === 'les_deux';
  // Check if we should show sale fields
  const showVente = formData.utilisation === 'vente' || formData.utilisation === 'les_deux';
  // Check if we should show specific fields based on type
  const showBassins = formData.type_agr === 'pisciculture';
  const showVolailles = formData.type_agr === 'aviculture';

  const estimatedRevenue = calculateRevenue();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {agr ? 'Modifier l\'AGR' : 'Nouvelle AGR'}
              </h2>
              <p className="text-green-100 text-sm mt-1">
                Activité Génératrice de Revenus
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              aria-label="Fermer"
            >
              <Icon name="XMarkIcon" size="lg" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Type d'AGR */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
              <Icon name="BriefcaseIcon" size="md" className="text-gray-600" />
              Type d'activité
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'AGR <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {typesAGR.map(type => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.type_agr === type.value
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type_agr"
                      value={type.value}
                      checked={formData.type_agr === type.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-2xl">{type.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{type.label}</span>
                  </label>
                ))}
              </div>
              {errors.type_agr && (
                <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                  <Icon name="ExclamationCircleIcon" size="sm" />
                  {errors.type_agr}
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Intrants */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
              <Icon name="CubeIcon" size="md" className="text-gray-600" />
              Intrants reçus
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  name="intrants_recus"
                  checked={formData.intrants_recus}
                  onChange={handleChange}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Le producteur a reçu des intrants pour cette AGR
                </span>
              </label>

              {formData.intrants_recus && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Quantité d'intrants reçus
                  </label>
                  <input
                    type="number"
                    name="quantite_intrants"
                    value={formData.quantite_intrants}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                      errors.quantite_intrants ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ex: 100"
                  />
                  {errors.quantite_intrants && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <Icon name="ExclamationCircleIcon" size="sm" />
                      {errors.quantite_intrants}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">
                    Nombre d'intrants fournis (alevins, poussins, plants, etc.)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Utilisation */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
              <Icon name="ArrowPathIcon" size="md" className="text-gray-600" />
              Utilisation de la production
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'utilisation
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {utilisationOptions.map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.utilisation === option.value
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="utilisation"
                        value={option.value}
                        checked={formData.utilisation === option.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Conditional fields based on utilisation */}
              {showConsommation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Quantité consommée annuellement {formData.utilisation !== 'les_deux' && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="quantite_consommee_annuelle"
                      value={formData.quantite_consommee_annuelle}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        errors.quantite_consommee_annuelle ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Ex: 50.5"
                    />
                    <select
                      name="unite_mesure"
                      value={formData.unite_mesure}
                      onChange={handleChange}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="kg">kg</option>
                      <option value="nombre">nombre</option>
                      <option value="litre">litre</option>
                    </select>
                  </div>
                  {errors.quantite_consommee_annuelle && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <Icon name="ExclamationCircleIcon" size="sm" />
                      {errors.quantite_consommee_annuelle}
                    </p>
                  )}
                </div>
              )}

              {showVente && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Quantité vendue annuellement {formData.utilisation !== 'les_deux' && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        name="quantite_vendue_annuelle"
                        value={formData.quantite_vendue_annuelle}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          errors.quantite_vendue_annuelle ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Ex: 150.5"
                      />
                      <select
                        name="unite_mesure"
                        value={formData.unite_mesure}
                        onChange={handleChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="kg">kg</option>
                        <option value="nombre">nombre</option>
                        <option value="litre">litre</option>
                      </select>
                    </div>
                    {errors.quantite_vendue_annuelle && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <Icon name="ExclamationCircleIcon" size="sm" />
                        {errors.quantite_vendue_annuelle}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Prix de vente unitaire (Ariary) {formData.utilisation !== 'les_deux' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      name="prix_vente_unitaire"
                      value={formData.prix_vente_unitaire}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        errors.prix_vente_unitaire ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Ex: 5000"
                    />
                    {errors.prix_vente_unitaire && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <Icon name="ExclamationCircleIcon" size="sm" />
                        {errors.prix_vente_unitaire}
                      </p>
                    )}
                  </div>

                  {/* Revenue Preview */}
                  {estimatedRevenue > 0 && (
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="CurrencyDollarIcon" size="md" className="text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Revenu annuel estimé:</span>
                        </div>
                        <span className="text-2xl font-bold text-green-600">
                          {estimatedRevenue.toLocaleString('fr-FR')} Ar
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Calculé automatiquement: {formData.quantite_vendue_annuelle || 0} × {formData.prix_vente_unitaire || 0} Ar
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Section 4: État actuel (conditional) */}
          {(showBassins || showVolailles) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
                <Icon name="ChartBarIcon" size="md" className="text-gray-600" />
                État actuel
              </h3>
              <div className="space-y-4">
                {showBassins && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nombre de bassins actuels
                    </label>
                    <input
                      type="number"
                      name="nombre_bassins"
                      value={formData.nombre_bassins}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        errors.nombre_bassins ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Ex: 3"
                    />
                    {errors.nombre_bassins && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <Icon name="ExclamationCircleIcon" size="sm" />
                        {errors.nombre_bassins}
                      </p>
                    )}
                  </div>
                )}

                {showVolailles && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nombre de volailles actuelles
                    </label>
                    <input
                      type="number"
                      name="nombre_volailles"
                      value={formData.nombre_volailles}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        errors.nombre_volailles ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Ex: 50"
                    />
                    {errors.nombre_volailles && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <Icon name="ExclamationCircleIcon" size="sm" />
                        {errors.nombre_volailles}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Statut */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">
                AGR active
              </span>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t flex-shrink-0">
          <Button
            type="button"
            onClick={onCancel}
            disabled={loading}
            variant="secondary"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
            variant="primary"
            icon={loading ? undefined : "CheckIcon"}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            {loading ? 'Enregistrement...' : (agr ? 'Mettre à jour' : 'Créer')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AGRForm;
