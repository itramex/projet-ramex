import { useState, useEffect } from 'react';
import { historyService } from '../../services/api';
import SearchableSelect from '../common/SearchableSelect';
import Button from '../common/Button';
import Icon from '../common/Icon';

function ProductionHistoryForm({ mode = 'create', initialData = null, onSuccess, onCancel }) {
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState({
    parcelle: initialData?.parcelle || '',
    annee: initialData?.annee || currentYear,
    culture: initialData?.culture || '',
    quantite_kg: initialData?.quantite_kg || '',
    prix_vente_kg: initialData?.prix_vente_kg || '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [parcelles, setParcelles] = useState([]);
  const [loadingParcelles, setLoadingParcelles] = useState(true);

  // Cultures disponibles
  const cultureOptions = [
    { value: 'vanille', label: 'Vanille' },
    { value: 'cafe', label: 'Café' },
    { value: 'girofle', label: 'Girofle' },
    { value: 'poivre', label: 'Poivre' },
    { value: 'riz', label: 'Riz' },
    { value: 'manioc', label: 'Manioc' },
    { value: 'autre', label: 'Autre' },
  ];

  useEffect(() => {
    loadParcelles();
  }, []);

  const loadParcelles = async () => {
    try {
      setLoadingParcelles(true);
      const response = await historyService.getParcelles();
      const parcellesData = response.data.results || response.data;
      setParcelles(parcellesData.map(p => ({
        value: p.id,
        label: `${p.code_parcelle} - ${p.producteur_nom || 'Sans producteur'}`,
        data: p
      })));
    } catch (error) {
      console.error('Erreur chargement parcelles:', error);
      setErrors({ general: 'Erreur lors du chargement des parcelles' });
    } finally {
      setLoadingParcelles(false);
    }
  };

  // Calcul automatique du revenu total
  const revenuTotal = formData.quantite_kg && formData.prix_vente_kg
    ? (parseFloat(formData.quantite_kg) * parseFloat(formData.prix_vente_kg)).toFixed(2)
    : null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validation parcelle
    if (!formData.parcelle) {
      newErrors.parcelle = 'La parcelle est obligatoire';
    }

    // Validation année
    if (!formData.annee) {
      newErrors.annee = 'L\'année est obligatoire';
    } else {
      const annee = parseInt(formData.annee);
      if (annee < 2000 || annee > currentYear + 1) {
        newErrors.annee = `L'année doit être entre 2000 et ${currentYear + 1}`;
      }
    }

    // Validation culture
    if (!formData.culture) {
      newErrors.culture = 'La culture est obligatoire';
    }

    // Validation quantité
    if (!formData.quantite_kg) {
      newErrors.quantite_kg = 'La quantité est obligatoire';
    } else {
      const quantite = parseFloat(formData.quantite_kg);
      if (isNaN(quantite) || quantite < 0) {
        newErrors.quantite_kg = 'La quantité doit être un nombre positif ou zéro';
      }
    }

    // Validation prix (optionnel mais doit être positif si fourni)
    if (formData.prix_vente_kg) {
      const prix = parseFloat(formData.prix_vente_kg);
      if (isNaN(prix) || prix < 0) {
        newErrors.prix_vente_kg = 'Le prix doit être un nombre positif ou zéro';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const dataToSend = {
        parcelle: formData.parcelle,
        annee: parseInt(formData.annee),
        culture: formData.culture,
        quantite_kg: parseFloat(formData.quantite_kg),
        prix_vente_kg: formData.prix_vente_kg ? parseFloat(formData.prix_vente_kg) : null,
        revenu_total: revenuTotal ? parseFloat(revenuTotal) : null,
      };

      if (mode === 'create') {
        await historyService.createProductionHistory(dataToSend);
      } else {
        await historyService.updateProductionHistory(initialData.id, dataToSend);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      
      // Gérer les erreurs de validation du backend
      if (error.response?.data) {
        const backendErrors = {};
        Object.keys(error.response.data).forEach(key => {
          const errorMessages = error.response.data[key];
          if (Array.isArray(errorMessages)) {
            backendErrors[key] = errorMessages.join(', ');
          } else {
            backendErrors[key] = errorMessages;
          }
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: 'Erreur lors de la sauvegarde. Veuillez réessayer.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-dark flex items-center gap-2">
          <Icon name="ChartBarIcon" size="lg" className="text-primary-yellow" />
          {mode === 'create' ? 'Ajouter une production' : 'Modifier la production'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          type="button"
        >
          <Icon name="XMarkIcon" size="lg" />
        </button>
      </div>

      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <Icon name="ExclamationTriangleIcon" size="md" className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Parcelle */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Parcelle <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={parcelles}
            value={formData.parcelle}
            onChange={(value) => handleChange('parcelle', value)}
            placeholder={loadingParcelles ? "Chargement..." : "Sélectionner une parcelle"}
            displayKey="label"
            valueKey="value"
            disabled={loadingParcelles || mode === 'edit'}
            className={errors.parcelle ? 'border-red-500' : ''}
          />
          {errors.parcelle && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size="sm" />
              {errors.parcelle}
            </p>
          )}
          {mode === 'edit' && (
            <p className="mt-1 text-xs text-gray-500">
              La parcelle ne peut pas être modifiée
            </p>
          )}
        </div>

        {/* Année */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Année <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.annee}
            onChange={(e) => handleChange('annee', e.target.value)}
            min="2000"
            max={currentYear + 1}
            disabled={mode === 'edit'}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow ${
              errors.annee ? 'border-red-500' : 'border-gray-300'
            } ${mode === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder="Ex: 2024"
          />
          {errors.annee && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size="sm" />
              {errors.annee}
            </p>
          )}
          {mode === 'edit' && (
            <p className="mt-1 text-xs text-gray-500">
              L'année ne peut pas être modifiée
            </p>
          )}
        </div>

        {/* Culture */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Culture <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={cultureOptions}
            value={formData.culture}
            onChange={(value) => handleChange('culture', value)}
            placeholder="Sélectionner une culture"
            displayKey="label"
            valueKey="value"
            disabled={mode === 'edit'}
            className={errors.culture ? 'border-red-500' : ''}
          />
          {errors.culture && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size="sm" />
              {errors.culture}
            </p>
          )}
          {mode === 'edit' && (
            <p className="mt-1 text-xs text-gray-500">
              La culture ne peut pas être modifiée
            </p>
          )}
        </div>

        {/* Quantité */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Quantité (kg) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.quantite_kg}
            onChange={(e) => handleChange('quantite_kg', e.target.value)}
            min="0"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow ${
              errors.quantite_kg ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ex: 150.50"
          />
          {errors.quantite_kg && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size="sm" />
              {errors.quantite_kg}
            </p>
          )}
        </div>

        {/* Prix de vente */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Prix de vente (Ar/kg)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.prix_vente_kg}
            onChange={(e) => handleChange('prix_vente_kg', e.target.value)}
            min="0"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow ${
              errors.prix_vente_kg ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ex: 50000"
          />
          {errors.prix_vente_kg && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size="sm" />
              {errors.prix_vente_kg}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Optionnel - Prix unitaire de vente
          </p>
        </div>

        {/* Revenu total calculé */}
        {revenuTotal && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="CurrencyDollarIcon" size="md" className="text-green-600" />
              <span className="text-sm font-semibold text-green-900">Revenu total calculé</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {parseFloat(revenuTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} Ar
            </p>
            <p className="text-xs text-green-700 mt-1">
              {formData.quantite_kg} kg × {formData.prix_vente_kg} Ar/kg
            </p>
          </div>
        )}

        {/* Boutons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            icon={loading ? null : 'CheckIcon'}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Enregistrement...</span>
              </div>
            ) : (
              mode === 'create' ? 'Enregistrer' : 'Mettre à jour'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProductionHistoryForm;
