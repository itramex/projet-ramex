import { useState, useEffect } from 'react';
import { activiteService, producteurService } from '../../services/api';

function ActiviteForm({ activite, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    producteur: '',
    type: '',
    description: '',
    date: '',
    impact_score: '',
    cout: '',
    resultats: ''
  });
  const [producteurs, setProducteurs] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchProducteurs();
    fetchTypes();

    if (activite) {
      setFormData({
        producteur: activite.producteur,
        type: activite.type,
        description: activite.description,
        date: activite.date,
        impact_score: activite.impact_score,
        cout: activite.cout || '',
        resultats: activite.resultats || ''
      });
    }
  }, [activite]);

  const fetchProducteurs = async () => {
    try {
      const response = await producteurService.getAllForDropdown();
      setProducteurs(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement producteurs:', error);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await activiteService.getTypes();
      setTypes(response.data.types || []);
    } catch (error) {
      console.error('Erreur chargement types:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.producteur) newErrors.producteur = 'Producteur requis';
    if (!formData.type.trim()) newErrors.type = 'Type requis';
    if (!formData.description.trim()) newErrors.description = 'Description requise';
    if (!formData.date) newErrors.date = 'Date requise';
    if (!formData.impact_score) {
      newErrors.impact_score = 'Score requis';
    } else {
      const score = parseFloat(formData.impact_score);
      if (isNaN(score) || score < 0 || score > 10) {
        newErrors.impact_score = 'Score entre 0 et 10';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      // Préparer les données
      const data = {
        ...formData,
        impact_score: parseFloat(formData.impact_score),
        cout: formData.cout ? parseFloat(formData.cout) : null
      };

      if (activite) {
        await activiteService.update(activite.id, data);
      } else {
        await activiteService.create(data);
      }

      alert(`✅ Activité ${activite ? 'modifiée' : 'créée'} avec succès !`);
      onSuccess();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        alert('❌ Erreur lors de la sauvegarde');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {activite ? '✏️ Modifier l\'activité' : '➕ Nouvelle activité'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Producteur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Producteur *
            </label>
            <select
              name="producteur"
              value={formData.producteur}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.producteur ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
            >
              <option value="">Sélectionner un producteur</option>
              {producteurs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} {p.prenom} ({p.code})
                </option>
              ))}
            </select>
            {errors.producteur && (
              <p className="text-red-500 text-sm mt-1">{errors.producteur}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type d'activité *
            </label>
            <input
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              list="activity-types"
              placeholder="Ex: Formation taille, Traitement bio..."
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
            />
            <datalist id="activity-types">
              {types.map((type, idx) => (
                <option key={idx} value={type} />
              ))}
            </datalist>
            {errors.type && (
              <p className="text-red-500 text-sm mt-1">{errors.type}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Décrivez l'activité réalisée..."
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Date et Score */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Score d'impact * (0-10)
              </label>
              <input
                type="number"
                name="impact_score"
                value={formData.impact_score}
                onChange={handleChange}
                min="0"
                max="10"
                step="0.1"
                placeholder="8.5"
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.impact_score ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
              />
              {errors.impact_score && (
                <p className="text-red-500 text-sm mt-1">{errors.impact_score}</p>
              )}
            </div>
          </div>

          {/* Coût */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Coût (Ar)
            </label>
            <input
              type="number"
              name="cout"
              value={formData.cout}
              onChange={handleChange}
              placeholder="50000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            />
          </div>

          {/* Résultats */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Résultats obtenus
            </label>
            <textarea
              name="resultats"
              value={formData.resultats}
              onChange={handleChange}
              rows="3"
              placeholder="Résultats et bénéfices observés..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 font-semibold"
            >
              {loading ? 'Sauvegarde...' : activite ? 'Modifier' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ActiviteForm;
