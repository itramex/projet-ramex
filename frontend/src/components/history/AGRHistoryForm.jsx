import { useState, useEffect } from 'react';
import { historyService } from '../../services/api';
import SearchableSelect from '../common/SearchableSelect';
import Button from '../common/Button';
import Icon from '../common/Icon';

function AGRHistoryForm({ mode = 'create', initialData = null, onSuccess, onCancel }) {
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState({
    producteur: initialData?.producteur || '',
    annee: initialData?.annee || currentYear,
    type_agr: initialData?.type_agr || '',
    ordre: initialData?.ordre || 1,
    quantite_produite: initialData?.quantite_produite || '',
    quantite_vendue: initialData?.quantite_vendue || '',
    quantite_consommee: initialData?.quantite_consommee || '',
    prix_vente_unitaire: initialData?.prix_vente_unitaire || '',
    revenu_annuel: initialData?.revenu_annuel || '',
  });

  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [loading, setLoading] = useState(false);
  const [producteurs, setProducteurs] = useState([]);
  const [loadingProducteurs, setLoadingProducteurs] = useState(true);

  // Types d'AGR disponibles
  const agrTypeOptions = [
    { value: 'pisciculture', label: 'Pisciculture' },
    { value: 'aviculture', label: 'Aviculture' },
    { value: 'apiculture', label: 'Apiculture' },
    { value: 'elevage_bovin', label: 'Élevage bovin' },
    { value: 'elevage_porcin', label: 'Élevage porcin' },
    { value: 'maraichage', label: 'Maraîchage' },
    { value: 'artisanat', label: 'Artisanat' },
    { value: 'commerce', label: 'Commerce' },
    { value: 'autre', label: 'Autre' },
  ];

  // Options pour l'ordre (AGR1, AGR2, AGR3)
  const ordreOptions = [
    { value: 1, label: 'AGR 1' },
    { value: 2, label: 'AGR 2' },
    { value: 3, label: 'AGR 3' },
  ];

  useEffect(() => {
    loadProducteurs();
  }, []);

  // Calcul automatique du revenu si quantité vendue et prix fournis
  useEffect(() => {
    if (formData.quantite_vendue && formData.prix_vente_unitaire) {
      const calculatedRevenu = (
        parseFloat(formData.quantite_vendue) * parseFloat(formData.prix_vente_unitaire)
      ).toFixed(2);
      
      // Si le revenu n'est pas encore défini ou est différent, le mettre à jour
      if (!formData.revenu_annuel || Math.abs(parseFloat(formData.revenu_annuel) - parseFloat(calculatedRevenu)) > 0.01) {
        setFormData(prev => ({ ...prev, revenu_annuel: calculatedRevenu }));
      }
    }
  }, [formData.quantite_vendue, formData.prix_vente_unitaire]);

  // Vérification de la cohérence revenu = quantité × prix
  useEffect(() => {
    if (formData.quantite_vendue && formData.prix_vente_unitaire && formData.revenu_annuel) {
      const expectedRevenu = parseFloat(formData.quantite_vendue) * parseFloat(formData.prix_vente_unitaire);
      const actualRevenu = parseFloat(formData.revenu_annuel);
      const difference = Math.abs(expectedRevenu - actualRevenu);
      
      if (difference > 0.01) {
        setWarnings({
          revenu_annuel: `Incohérence détectée: ${formData.quantite_vendue} × ${formData.prix_vente_unitaire} = ${expectedRevenu.toFixed(2)} Ar (différence: ${difference.toFixed(2)} Ar)`
        });
      } else {
        setWarnings({});
      }
    } else {
      setWarnings({});
    }
  }, [formData.quantite_vendue, formData.prix_vente_unitaire, formData.revenu_annuel]);

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

    // Validation type AGR
    if (!formData.type_agr) {
      newErrors.type_agr = 'Le type d\'AGR est obligatoire';
    }

    // Validation ordre
    if (!formData.ordre) {
      newErrors.ordre = 'L\'ordre est obligatoire';
    } else {
      const ordre = parseInt(formData.ordre);
      if (ordre < 1 || ordre > 3) {
        newErrors.ordre = 'L\'ordre doit être entre 1 et 3';
      }
    }

    // Validation quantités (optionnelles mais doivent être positives si fournies)
    ['quantite_produite', 'quantite_vendue', 'quantite_consommee'].forEach(field => {
      if (formData[field]) {
        const value = parseFloat(formData[field]);
        if (isNaN(value) || value < 0) {
          newErrors[field] = 'La quantité doit être un nombre positif ou zéro';
        }
      }
    });

    // Validation prix (optionnel mais doit être positif si fourni)
    if (formData.prix_vente_unitaire) {
      const prix = parseFloat(formData.prix_vente_unitaire);
      if (isNaN(prix) || prix < 0) {
        newErrors.prix_vente_unitaire = 'Le prix doit être un nombre positif ou zéro';
      }
    }

    // Validation revenu annuel
    if (!formData.revenu_annuel) {
      newErrors.revenu_annuel = 'Le revenu annuel est obligatoire';
    } else {
      const revenu = parseFloat(formData.revenu_annuel);
      if (isNaN(revenu) || revenu < 0) {
        newErrors.revenu_annuel = 'Le revenu doit être un nombre positif ou zéro';
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
        type_agr: formData.type_agr,
        ordre: parseInt(formData.ordre),
        quantite_produite: formData.quantite_produite ? parseFloat(formData.quantite_produite) : null,
        quantite_vendue: formData.quantite_vendue ? parseFloat(formData.quantite_vendue) : null,
        quantite_consommee: formData.quantite_consommee ? parseFloat(formData.quantite_consommee) : null,
        prix_vente_unitaire: formData.prix_vente_unitaire ? parseFloat(formData.prix_vente_unitaire) : null,
        revenu_annuel: parseFloat(formData.revenu_annuel),
      };

      if (mode === 'create') {
        await historyService.createAGRHistory(dataToSend);
      } else {
        await historyService.updateAGRHistory(initialData.id, dataToSend);
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
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-dark flex items-center gap-2">
          <Icon name="CurrencyDollarIcon" size="lg" className="text-primary-yellow" />
          {mode === 'create' ? 'Ajouter un revenu AGR' : 'Modifier le revenu AGR'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Producteur */}
          <div className="md:col-span-2">
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

          {/* Ordre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ordre <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={ordreOptions}
              value={formData.ordre}
              onChange={(value) => handleChange('ordre', value)}
              placeholder="Sélectionner l'ordre"
              displayKey="label"
              valueKey="value"
              disabled={mode === 'edit'}
              className={errors.ordre ? 'border-red-500' : ''}
            />
            {errors.ordre && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.ordre}
              </p>
            )}
            {mode === 'edit' && (
              <p className="mt-1 text-xs text-gray-500">
                L'ordre ne peut pas être modifié
              </p>
            )}
          </div>

          {/* Type AGR */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type d'AGR <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={agrTypeOptions}
              value={formData.type_agr}
              onChange={(value) => handleChange('type_agr', value)}
              placeholder="Sélectionner un type d'AGR"
              displayKey="label"
              valueKey="value"
              disabled={mode === 'edit'}
              className={errors.type_agr ? 'border-red-500' : ''}
            />
            {errors.type_agr && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size="sm" />
                {errors.type_agr}
              </p>
            )}
            {mode === 'edit' && (
              <p className="mt-1 text-xs text-gray-500">
                Le type d'AGR ne peut pas être modifié
              </p>
            )}
          </div>
        </div>

        {/* Section Quantités */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Icon name="ScaleIcon" size="md" className="text-gray-600" />
            Quantités (optionnelles)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quantité produite */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quantité produite
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.quantite_produite}
                onChange={(e) => handleChange('quantite_produite', e.target.value)}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow ${
                  errors.quantite_produite ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: 500"
              />
              {errors.quantite_produite && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <Icon name="ExclamationCircleIcon" size="sm" />
                  {errors.quantite_produite}
                </p>
              )}
            </div>

            {/* Quantité vendue */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quantité vendue
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.quantite_vendue}
                onChange={(e) => handleChange('quantite_vendue', e.target.value)}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow ${
                  errors.quantite_vendue ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: 400"
              />
              {errors.quantite_vendue && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <Icon name="ExclamationCircleIcon" size="sm" />
                  {errors.quantite_vendue}
                </p>
              )}
            </div>

            {/* Quantité consommée */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quantité consommée
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.quantite_consommee}
                onChange={(e) => handleChange('quantite_consommee', e.target.value)}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow ${
                  errors.quantite_consommee ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: 100"
              />
              {errors.quantite_consommee && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <Icon name="ExclamationCircleIcon" size="sm" />
                  {errors.quantite_consommee}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section Revenus */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Icon name="BanknotesIcon" size="md" className="text-gray-600" />
            Revenus
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prix unitaire */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Prix de vente unitaire (Ar)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.prix_vente_unitaire}
                onChange={(e) => handleChange('prix_vente_unitaire', e.target.value)}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow ${
                  errors.prix_vente_unitaire ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: 5000"
              />
              {errors.prix_vente_unitaire && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <Icon name="ExclamationCircleIcon" size="sm" />
                  {errors.prix_vente_unitaire}
                </p>
              )}
            </div>

            {/* Revenu annuel */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Revenu annuel (Ar) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.revenu_annuel}
                onChange={(e) => handleChange('revenu_annuel', e.target.value)}
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow ${
                  errors.revenu_annuel ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: 2000000"
              />
              {errors.revenu_annuel && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <Icon name="ExclamationCircleIcon" size="sm" />
                  {errors.revenu_annuel}
                </p>
              )}
              {warnings.revenu_annuel && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-start gap-2">
                    <Icon name="ExclamationTriangleIcon" size="sm" className="flex-shrink-0 mt-0.5" />
                    <span>{warnings.revenu_annuel}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
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

export default AGRHistoryForm;
