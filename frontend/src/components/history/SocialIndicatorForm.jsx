import { useState, useEffect } from 'react';
import { historyService } from '../../services/api';
import SearchableSelect from '../common/SearchableSelect';
import Button from '../common/Button';
import Icon from '../common/Icon';

function SocialIndicatorForm({ mode = 'create', initialData = null, onSuccess, onCancel }) {
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState({
    producteur: initialData?.producteur || '',
    annee: initialData?.annee || currentYear,
    type_indicateur: initialData?.type_indicateur || '',
    valeur_numerique: initialData?.valeur_numerique || '',
    valeur_texte: initialData?.valeur_texte || '',
    valeur_booleen: initialData?.valeur_booleen !== undefined ? initialData.valeur_booleen : null,
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [producteurs, setProducteurs] = useState([]);
  const [loadingProducteurs, setLoadingProducteurs] = useState(true);

  // Types d'indicateurs disponibles
  const indicatorTypeOptions = [
    { value: 'scolarisation', label: 'Taux de scolarisation', type: 'numeric' },
    { value: 'eau_potable', label: 'Accès eau potable', type: 'boolean' },
    { value: 'sante', label: 'Accès aux soins', type: 'boolean' },
    { value: 'habitat', label: 'Type de logement', type: 'text' },
    { value: 'energie', label: 'Accès à l\'énergie', type: 'text' },
  ];

  // Options pour habitat
  const habitatOptions = [
    { value: 'cases', label: 'Cases traditionnelles' },
    { value: 'tole', label: 'Maison en tôle' },
    { value: 'dur', label: 'Maison en dur' },
    { value: 'mixte', label: 'Construction mixte' },
  ];

  // Options pour énergie
  const energieOptions = [
    { value: 'aucune', label: 'Aucune' },
    { value: 'electricite', label: 'Électricité (réseau)' },
    { value: 'solaire', label: 'Énergie solaire' },
    { value: 'groupe_electrogene', label: 'Groupe électrogène' },
    { value: 'autre', label: 'Autre' },
  ];

  useEffect(() => {
    loadProducteurs();
  }, []);

  // Déterminer le type de champ à afficher selon l'indicateur sélectionné
  const selectedIndicatorType = indicatorTypeOptions.find(
    opt => opt.value === formData.type_indicateur
  )?.type || null;

  const loadProducteurs = async () => {
    try {
      setLoadingProducteurs(true);
      const response = await historyService.getProducteurs();
      const producteursData = response.data.results || response.data;
      setProducteurs(producteursData.map(p => ({
        value: p.id,
        label: `${p.code} - ${p.nom} ${p.prenom || ''}`,
        data: p
      })));
    } catch (error) {
      console.error('Erreur chargement producteurs:', error);
      setErrors({ general: 'Erreur lors du chargement des producteurs' });
    } finally {
      setLoadingProducteurs(false);
    }
  };

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

  // Réinitialiser les valeurs quand le type d'indicateur change
  const handleIndicatorTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      type_indicateur: value,
      valeur_numerique: '',
      valeur_texte: '',
      valeur_booleen: null,
    }));
    if (errors.type_indicateur) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.type_indicateur;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validation producteur
    if (!formData.producteur) {
      newErrors.producteur = 'Le producteur est obligatoire';
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

    // Validation type indicateur
    if (!formData.type_indicateur) {
      newErrors.type_indicateur = 'Le type d\'indicateur est obligatoire';
    }

    // Validation selon le type d'indicateur
    if (selectedIndicatorType === 'numeric') {
      if (!formData.valeur_numerique && formData.valeur_numerique !== 0) {
        newErrors.valeur_numerique = 'La valeur est obligatoire';
      } else {
        const value = parseFloat(formData.valeur_numerique);
        if (isNaN(value)) {
          newErrors.valeur_numerique = 'La valeur doit être un nombre';
        } else if (formData.type_indicateur === 'scolarisation' && (value < 0 || value > 100)) {
          newErrors.valeur_numerique = 'Le taux de scolarisation doit être entre 0 et 100%';
        } else if (value < 0) {
          newErrors.valeur_numerique = 'La valeur doit être positive';
        }
      }
    } else if (selectedIndicatorType === 'boolean') {
      if (formData.valeur_booleen === null) {
        newErrors.valeur_booleen = 'Veuillez sélectionner une option';
      }
    } else if (selectedIndicatorType === 'text') {
      if (!formData.valeur_texte) {
        newErrors.valeur_texte = 'La valeur est obligatoire';
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
        producteur: formData.producteur,
        annee: parseInt(formData.annee),
        type_indicateur: formData.type_indicateur,
        valeur_numerique: selectedIndicatorType === 'numeric' ? parseFloat(formData.valeur_numerique) : null,
        valeur_texte: selectedIndicatorType === 'text' ? formData.valeur_texte : '',
        valeur_booleen: selectedIndicatorType === 'boolean' ? formData.valeur_booleen : null,
        notes: formData.notes || '',
      };

      if (mode === 'create') {
        await historyService.createSocialIndicatorHistory(dataToSend);
      } else {
        await historyService.updateSocialIndicatorHistory(initialData.id, dataToSend);
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

  const renderValueInput = () => {
    if (!selectedIndicatorType) {
      return (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
          <Icon name="InformationCircleIcon" size="lg" className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Sélectionnez d'abord un type d'indicateur</p>
        </div>
      );
    }

    switch (selectedIndicatorType) {
      case 'numeric':
        return (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Valeur {formData.type_indicateur === 'scolarisation' ? '(%)' : ''} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valeur_numerique}
              onChange={(e) => handleChange('valeur_numerique', e.target.value)}
              min="0"
              max={formData.type_indicateur === 'scolarisation' ? 100 : undefined}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow ${
                errors.valeur_numerique ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={formData.type_indicateur === 'scolarisation' ? 'Ex: 85.5' : 'Ex: 100'}
            />
            {errors.valeur_numerique && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.valeur_numerique}
              </p>
            )}
            {formData.type_indicateur === 'scolarisation' && (
              <p className="mt-1 text-xs text-gray-500">
                Pourcentage d'enfants scolarisés (0-100%)
              </p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Valeur <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleChange('valeur_booleen', true)}
                className={`flex-1 px-6 py-3 border-2 rounded-lg transition-all ${
                  formData.valeur_booleen === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Icon name="CheckCircleIcon" size="md" className={formData.valeur_booleen === true ? 'text-green-600' : 'text-gray-400'} />
                  <span className="font-semibold">Oui</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleChange('valeur_booleen', false)}
                className={`flex-1 px-6 py-3 border-2 rounded-lg transition-all ${
                  formData.valeur_booleen === false
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Icon name="XCircleIcon" size="md" className={formData.valeur_booleen === false ? 'text-red-600' : 'text-gray-400'} />
                  <span className="font-semibold">Non</span>
                </div>
              </button>
            </div>
            {errors.valeur_booleen && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.valeur_booleen}
              </p>
            )}
          </div>
        );

      case 'text':
        if (formData.type_indicateur === 'habitat') {
          return (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type de logement <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={habitatOptions}
                value={formData.valeur_texte}
                onChange={(value) => handleChange('valeur_texte', value)}
                placeholder="Sélectionner un type de logement"
                displayKey="label"
                valueKey="value"
                className={errors.valeur_texte ? 'border-red-500' : ''}
              />
              {errors.valeur_texte && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <Icon name="ExclamationCircleIcon" size="sm" />
                  {errors.valeur_texte}
                </p>
              )}
            </div>
          );
        } else if (formData.type_indicateur === 'energie') {
          return (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type d'énergie <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={energieOptions}
                value={formData.valeur_texte}
                onChange={(value) => handleChange('valeur_texte', value)}
                placeholder="Sélectionner un type d'énergie"
                displayKey="label"
                valueKey="value"
                className={errors.valeur_texte ? 'border-red-500' : ''}
              />
              {errors.valeur_texte && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <Icon name="ExclamationCircleIcon" size="sm" />
                  {errors.valeur_texte}
                </p>
              )}
            </div>
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-dark flex items-center gap-2">
          <Icon name="UserGroupIcon" size="lg" className="text-primary-yellow" />
          {mode === 'create' ? 'Ajouter un indicateur social' : 'Modifier l\'indicateur social'}
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
        {/* Producteur */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Producteur <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={producteurs}
            value={formData.producteur}
            onChange={(value) => handleChange('producteur', value)}
            placeholder={loadingProducteurs ? "Chargement..." : "Sélectionner un producteur"}
            displayKey="label"
            valueKey="value"
            disabled={loadingProducteurs || mode === 'edit'}
            className={errors.producteur ? 'border-red-500' : ''}
          />
          {errors.producteur && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size="sm" />
              {errors.producteur}
            </p>
          )}
          {mode === 'edit' && (
            <p className="mt-1 text-xs text-gray-500">
              Le producteur ne peut pas être modifié
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Type d'indicateur */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type d'indicateur <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={indicatorTypeOptions}
              value={formData.type_indicateur}
              onChange={handleIndicatorTypeChange}
              placeholder="Sélectionner un indicateur"
              displayKey="label"
              valueKey="value"
              disabled={mode === 'edit'}
              className={errors.type_indicateur ? 'border-red-500' : ''}
            />
            {errors.type_indicateur && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.type_indicateur}
              </p>
            )}
            {mode === 'edit' && (
              <p className="mt-1 text-xs text-gray-500">
                Le type d'indicateur ne peut pas être modifié
              </p>
            )}
          </div>
        </div>

        {/* Champ de valeur dynamique */}
        <div className="border-t pt-6">
          {renderValueInput()}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notes (optionnel)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow resize-none"
            placeholder="Ajouter des notes ou commentaires..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Informations complémentaires sur cet indicateur
          </p>
        </div>

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

export default SocialIndicatorForm;
