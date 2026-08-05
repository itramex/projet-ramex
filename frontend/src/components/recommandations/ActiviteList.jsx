import { useState, useEffect } from 'react';
import { activiteService, producteurService } from '../../services/api';
import ActiviteForm from './ActiviteForm';

function ActiviteList() {
  const [activites, setActivites] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActivite, setEditingActivite] = useState(null);
  const [selectedProducteur, setSelectedProducteur] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchActivites();
    fetchProducteurs();
  }, [selectedProducteur, selectedType, searchTerm]);

  const fetchActivites = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedProducteur) params.producteur = selectedProducteur;
      if (selectedType) params.type = selectedType;
      if (searchTerm) params.search = searchTerm;

      const response = await activiteService.getAll(params);
      setActivites(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement activités:', error);
      alert('Erreur lors du chargement des activités');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducteurs = async () => {
    try {
      const response = await producteurService.getAllForDropdown();
      setProducteurs(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement producteurs:', error);
    }
  };

  const handleAdd = () => {
    setEditingActivite(null);
    setShowForm(true);
  };

  const handleEdit = (activite) => {
    setEditingActivite(activite);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette activité ?')) return;

    try {
      await activiteService.delete(id);
      fetchActivites();
      alert('✅ Activité supprimée avec succès');
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingActivite(null);
    fetchActivites();
  };

  const getImpactColor = (score) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
    if (score >= 4) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2">
            Activités <span className="text-primary-yellow">Producteurs</span>
          </h1>
          <p className="text-gray-600">
            Historique des activités réalisées par les producteurs
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="bg-primary-yellow hover:bg-yellow-500 text-dark px-6 py-3 rounded-lg transition-colors flex items-center gap-2 font-semibold"
        >
          <span>➕</span>
          <span>Nouvelle activité</span>
        </button>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type, description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent"
            />
          </div>

          {/* Filtre producteur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Producteur
            </label>
            <select
              value={selectedProducteur}
              onChange={(e) => setSelectedProducteur(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent"
            >
              <option value="">Tous les producteurs</option>
              {producteurs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} {p.prenom}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'activité
            </label>
            <input
              type="text"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              placeholder="Formation, Traitement..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-yellow focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Liste des activités */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-yellow mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Chargement...</p>
          </div>
        </div>
      ) : activites.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-xl text-yellow-800 font-medium mb-4">
            Aucune activité trouvée
          </p>
          <button
            onClick={handleAdd}
            className="bg-primary-yellow hover:bg-yellow-500 text-dark px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2 font-semibold"
          >
            <span>➕</span>
            <span>Créer la première activité</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producteur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coût
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activites.map((activite) => (
                  <tr 
                    key={activite.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Producteur */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-dark">
                        {activite.producteur_info?.nom_complet || `#${activite.producteur}`}
                      </div>
                      {activite.producteur_info?.code && (
                        <div className="text-xs text-gray-500">
                          {activite.producteur_info.code}
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {activite.type}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 line-clamp-2 max-w-xs">
                        {activite.description}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-dark">
                        {new Date(activite.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </td>

                    {/* Impact */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getImpactColor(activite.impact_score)}`}>
                        <span>⭐</span>
                        <span>{activite.impact_score}/10</span>
                      </span>
                    </td>

                    {/* Coût */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activite.cout ? (
                        <div className="text-sm text-dark">
                          {new Intl.NumberFormat('fr-FR').format(activite.cout)} Ar
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(activite)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(activite.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination (si nécessaire) */}
          {activites.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                Total : <span className="font-medium">{activites.length}</span> activité{activites.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <ActiviteForm
          activite={editingActivite}
          onClose={() => {
            setShowForm(false);
            setEditingActivite(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

export default ActiviteList;
