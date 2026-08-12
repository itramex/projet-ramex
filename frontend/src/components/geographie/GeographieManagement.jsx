import { useState, useEffect, useCallback } from 'react';
import { geographieService, cooperativeService } from '../../services/api';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';

// ==================== COMPOSANT FORMULAIRE GÉNÉRIQUE ====================
function EntityForm({ fields, initialData, onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState(initialData || {});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.type === 'select' ? (
            <select
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleChange}
              required={field.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">-- Sélectionner --</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            />
          ) : field.type === 'checkbox' ? (
            <div className="flex items-center">
              <input
                type="checkbox"
                name={field.name}
                checked={formData[field.name] || false}
                onChange={handleChange}
                className="h-4 w-4 text-chick-yellow focus:ring-chick-yellow border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">Actif</span>
            </div>
          ) : (
            <input
              type={field.type || 'text'}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleChange}
              required={field.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            />
          )}
        </div>
      ))}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}

// ==================== COMPOSANT LISTE GÉNÉRIQUE ====================
function EntityList({ title, items, columns, onEdit, onDelete, onAdd, canAdd = true }) {
  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {canAdd && (
          <Button onClick={onAdd} variant="primary" size="sm">
            <Icon name="plus" className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Aucun élément trouvé</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                      {col.render ? col.render(item) : item[col.key] || '-'}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    <button
                      onClick={() => onEdit(item)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ==================== COMPOSANT PRINCIPAL ====================
function GeographieManagement() {
  const [activeTab, setActiveTab] = useState('regions');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Données
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [fokontanys, setFokontanys] = useState([]);
  const [villages, setVillages] = useState([]);
  const [agences, setAgences] = useState([]);
  const [structures, setStructures] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [regionsRes, districtsRes, communesRes, fokontanysRes, villagesRes, agencesRes, structuresRes, coopRes] =
        await Promise.all([
          geographieService.getRegions(),
          geographieService.getDistricts(),
          geographieService.getCommunes(),
          geographieService.getFokontanys(),
          geographieService.getVillages(),
          geographieService.getAgences(),
          geographieService.getStructuresIntermediaires(),
          cooperativeService.getAll({ page_size: 100 }),
        ]);

      setRegions(regionsRes.data.results || regionsRes.data || []);
      setDistricts(districtsRes.data.results || districtsRes.data || []);
      setCommunes(communesRes.data.results || communesRes.data || []);
      setFokontanys(fokontanysRes.data.results || fokontanysRes.data || []);
      setVillages(villagesRes.data.results || villagesRes.data || []);
      setAgences(agencesRes.data.results || agencesRes.data || []);
      setStructures(structuresRes.data.results || structuresRes.data || []);
      setCooperatives(coopRes.data.results || coopRes.data || []);
    } catch (error) {
      console.error('Erreur chargement géographie:', error);
      alert('Erreur lors du chargement des données géographiques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ==================== GESTION CRUD ====================
  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      if (editingItem) {
        // Mise à jour
        const serviceMap = {
          regions: geographieService.updateRegion,
          districts: geographieService.updateDistrict,
          communes: geographieService.updateCommune,
          fokontanys: geographieService.updateFokontany,
          villages: geographieService.updateVillage,
          agences: geographieService.updateAgence,
          structures: geographieService.updateStructureIntermediaire,
        };
        await serviceMap[activeTab](editingItem.id, formData);
        alert('Élément mis à jour avec succès !');
      } else {
        // Création
        const serviceMap = {
          regions: geographieService.createRegion,
          districts: geographieService.createDistrict,
          communes: geographieService.createCommune,
          fokontanys: geographieService.createFokontany,
          villages: geographieService.createVillage,
          agences: geographieService.createAgence,
          structures: geographieService.createStructureIntermediaire,
        };
        await serviceMap[activeTab](formData);
        alert('Élément créé avec succès !');
      }
      setShowForm(false);
      setEditingItem(null);
      await loadAll();
    } catch (error) {
      console.error('Erreur enregistrement:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet élément ?')) return;
    setLoading(true);
    try {
      const serviceMap = {
        regions: geographieService.deleteRegion,
        districts: geographieService.deleteDistrict,
        communes: geographieService.deleteCommune,
        fokontanys: geographieService.deleteFokontany,
        villages: geographieService.deleteVillage,
        agences: geographieService.deleteAgence,
        structures: geographieService.deleteStructureIntermediaire,
      };
      await serviceMap[activeTab](item.id);
      alert('Élément supprimé avec succès !');
      await loadAll();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression. Vérifiez qu\'aucune donnée n\'est liée à cet élément.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  // ==================== DÉFINITION DES CHAMPS PAR ENTITÉ ====================
  const getFields = () => {
    switch (activeTab) {
      case 'regions':
        return [
          { name: 'nom', label: 'Nom de la région', required: true },
          { name: 'code', label: 'Code', required: false },
          { name: 'actif', label: 'Actif', type: 'checkbox' },
        ];
      case 'districts':
        return [
          { name: 'nom', label: 'Nom du district', required: true },
          { name: 'region', label: 'Région', type: 'select', required: true, options: regions.map(r => ({ value: r.id, label: r.nom })) },
          { name: 'code', label: 'Code', required: false },
          { name: 'actif', label: 'Actif', type: 'checkbox' },
        ];
      case 'communes':
        return [
          { name: 'nom', label: 'Nom de la commune', required: true },
          { name: 'district', label: 'District', type: 'select', required: true, options: districts.map(d => ({ value: d.id, label: d.nom })) },
          { name: 'code', label: 'Code', required: false },
          { name: 'actif', label: 'Actif', type: 'checkbox' },
        ];
      case 'fokontanys':
        return [
          { name: 'nom', label: 'Nom du fokontany', required: true },
          { name: 'commune', label: 'Commune', type: 'select', required: true, options: communes.map(c => ({ value: c.id, label: c.nom })) },
          { name: 'code', label: 'Code', required: false },
          { name: 'actif', label: 'Actif', type: 'checkbox' },
        ];
      case 'villages':
        return [
          { name: 'nom', label: 'Nom du village', required: true },
          { name: 'fokontany', label: 'Fokontany', type: 'select', required: true, options: fokontanys.map(f => ({ value: f.id, label: f.nom })) },
          { name: 'code', label: 'Code', required: false },
          { name: 'actif', label: 'Actif', type: 'checkbox' },
        ];
      case 'agences':
        return [
          { name: 'nom', label: "Nom de l'agence", required: true },
          { name: 'district', label: 'District', type: 'select', required: true, options: districts.map(d => ({ value: d.id, label: d.nom })) },
          { name: 'code', label: 'Code', required: false },
          { name: 'adresse', label: 'Adresse', required: false },
          { name: 'telephone', label: 'Téléphone', required: false },
          { name: 'email', label: 'Email', type: 'email', required: false },
          { name: 'actif', label: 'Actif', type: 'checkbox' },
        ];
      case 'structures':
        return [
          { name: 'nom', label: 'Nom du représentant', required: true },
          { name: 'fokontany', label: 'Fokontany', type: 'select', required: true, options: fokontanys.map(f => ({ value: f.id, label: f.nom })) },
          { name: 'cooperative', label: 'Coopérative', type: 'select', required: false, options: cooperatives.map(c => ({ value: c.id, label: c.nom })) },
          { name: 'telephone', label: 'Téléphone', required: false },
          { name: 'actif', label: 'Actif', type: 'checkbox' },
        ];
      default:
        return [];
    }
  };

  // ==================== DÉFINITION DES COLONNES PAR ENTITÉ ====================
  const getColumns = () => {
    switch (activeTab) {
      case 'regions':
        return [
          { key: 'nom', label: 'Nom' },
          { key: 'code', label: 'Code' },
          { key: 'actif', label: 'Statut', render: (item) => <Badge color={item.actif ? 'green' : 'red'}>{item.actif ? 'Actif' : 'Inactif'}</Badge> },
        ];
      case 'districts':
        return [
          { key: 'nom', label: 'Nom' },
          { key: 'region_nom', label: 'Région' },
          { key: 'code', label: 'Code' },
          { key: 'actif', label: 'Statut', render: (item) => <Badge color={item.actif ? 'green' : 'red'}>{item.actif ? 'Actif' : 'Inactif'}</Badge> },
        ];
      case 'communes':
        return [
          { key: 'nom', label: 'Nom' },
          { key: 'district_nom', label: 'District' },
          { key: 'code', label: 'Code' },
          { key: 'actif', label: 'Statut', render: (item) => <Badge color={item.actif ? 'green' : 'red'}>{item.actif ? 'Actif' : 'Inactif'}</Badge> },
        ];
      case 'fokontanys':
        return [
          { key: 'nom', label: 'Nom' },
          { key: 'commune_nom', label: 'Commune' },
          { key: 'code', label: 'Code' },
          { key: 'actif', label: 'Statut', render: (item) => <Badge color={item.actif ? 'green' : 'red'}>{item.actif ? 'Actif' : 'Inactif'}</Badge> },
        ];
      case 'villages':
        return [
          { key: 'nom', label: 'Nom' },
          { key: 'fokontany_nom', label: 'Fokontany' },
          { key: 'code', label: 'Code' },
          { key: 'actif', label: 'Statut', render: (item) => <Badge color={item.actif ? 'green' : 'red'}>{item.actif ? 'Actif' : 'Inactif'}</Badge> },
        ];
      case 'agences':
        return [
          { key: 'nom', label: "Nom de l'agence" },
          { key: 'district_nom', label: 'District' },
          { key: 'telephone', label: 'Téléphone' },
          { key: 'actif', label: 'Statut', render: (item) => <Badge color={item.actif ? 'green' : 'red'}>{item.actif ? 'Actif' : 'Inactif'}</Badge> },
        ];
      case 'structures':
        return [
          { key: 'nom', label: 'Représentant' },
          { key: 'fokontany_nom', label: 'Fokontany' },
          { key: 'cooperative_nom', label: 'Coopérative' },
          { key: 'telephone', label: 'Téléphone' },
          { key: 'actif', label: 'Statut', render: (item) => <Badge color={item.actif ? 'green' : 'red'}>{item.actif ? 'Actif' : 'Inactif'}</Badge> },
        ];
      default:
        return [];
    }
  };

  const getItems = () => {
    switch (activeTab) {
      case 'regions': return regions;
      case 'districts': return districts;
      case 'communes': return communes;
      case 'fokontanys': return fokontanys;
      case 'villages': return villages;
      case 'agences': return agences;
      case 'structures': return structures;
      default: return [];
    }
  };

  const getTitle = () => {
    const titles = {
      regions: 'Régions',
      districts: 'Districts',
      communes: 'Communes',
      fokontanys: 'Fokontany',
      villages: 'Villages',
      agences: 'Agences RAMEX',
      structures: 'Structures intermédiaires',
    };
    return titles[activeTab] || '';
  };

  const tabs = [
    { id: 'regions', label: 'Régions', icon: 'map' },
    { id: 'districts', label: 'Districts', icon: 'map' },
    { id: 'communes', label: 'Communes', icon: 'map' },
    { id: 'fokontanys', label: 'Fokontany', icon: 'map' },
    { id: 'villages', label: 'Villages', icon: 'map' },
    { id: 'agences', label: 'Agences', icon: 'building' },
    { id: 'structures', label: 'Structures', icon: 'users' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestion Géographique</h1>
        <p className="text-gray-500 mt-1">
          Structure terrain : Région → District → Commune → Fokontany → Village
        </p>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowForm(false); setEditingItem(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-chick-yellow text-dark'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && !showForm ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chick-yellow"></div>
        </div>
      ) : showForm ? (
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingItem ? `Modifier : ${getTitle()}` : `Ajouter : ${getTitle()}`}
          </h3>
          <EntityForm
            fields={getFields()}
            initialData={editingItem || {}}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
            loading={loading}
          />
        </Card>
      ) : (
        <EntityList
          title={getTitle()}
          items={getItems()}
          columns={getColumns()}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}

export default GeographieManagement;