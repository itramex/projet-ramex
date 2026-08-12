import { useState, useEffect, useCallback } from 'react';
import { ddService, cooperativeService, producteurService } from '../../services/api';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Icon from '../common/Icon';

// ==================== COMPOSANT FORMULAIRE GÉNÉRIQUE ====================
function DDEntityForm({ fields, initialData, onSubmit, onCancel, loading }) {
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
          ) : field.type === 'number' ? (
            <input
              type="number"
              name={field.name}
              value={formData[field.name] || 0}
              onChange={handleChange}
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

// ==================== COMPOSANT LISTE ====================
function DDEntityList({ title, items, columns, onEdit, onDelete, onAdd }) {
  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <Button onClick={onAdd} variant="primary" size="sm">
          <Icon name="plus" className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
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
function DeveloppementDurable() {
  const [activeTab, setActiveTab] = useState('activites');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Données
  const [activites, setActivites] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [producteurs, setProducteurs] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [activitesRes, partenairesRes, coopRes, prodRes] = await Promise.all([
        ddService.getActivites(),
        ddService.getPartenaires(),
        cooperativeService.getAll({ page_size: 100 }),
        producteurService.getAll({ page_size: 100 }),
      ]);

      setActivites(activitesRes.data.results || activitesRes.data || []);
      setPartenaires(partenairesRes.data.results || partenairesRes.data || []);
      setCooperatives(coopRes.data.results || coopRes.data || []);
      setProducteurs(prodRes.data.results || prodRes.data || []);
    } catch (error) {
      console.error('Erreur chargement DD:', error);
      alert('Erreur lors du chargement des données DD');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ==================== CRUD ====================
  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      if (editingItem) {
        if (activeTab === 'activites') {
          await ddService.updateActivite(editingItem.id, formData);
        } else {
          await ddService.updatePartenaire(editingItem.id, formData);
        }
        alert('Élément mis à jour avec succès !');
      } else {
        if (activeTab === 'activites') {
          await ddService.createActivite(formData);
        } else {
          await ddService.createPartenaire(formData);
        }
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
      if (activeTab === 'activites') {
        await ddService.deleteActivite(item.id);
      } else {
        await ddService.deletePartenaire(item.id);
      }
      alert('Élément supprimé avec succès !');
      await loadAll();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
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

  // ==================== CHAMPS FORMULAIRES ====================
  const getFields = () => {
    if (activeTab === 'partenaires') {
      return [
        { name: 'nom', label: 'Nom du partenaire', required: true },
        {
          name: 'type', label: 'Type de partenaire', type: 'select', required: true,
          options: [
            { value: 'autorite_locale', label: 'Autorité locale' },
            { value: 'ong', label: 'ONG' },
            { value: 'partenaire_technique', label: 'Partenaire technique' },
          ],
        },
        { name: 'contact', label: 'Personne de contact' },
        { name: 'telephone', label: 'Téléphone' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'adresse', label: 'Adresse' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'actif', label: 'Actif', type: 'checkbox' },
      ];
    }

    // Activités
    return [
      {
        name: 'type_activite', label: "Type d'activité", type: 'select', required: true,
        options: [
          { value: 'reboisement', label: 'Reboisement' },
          { value: 'convention_partenariat', label: 'Convention de partenariat' },
          { value: 'pepiniere', label: 'Production de jeunes plants / pépinière' },
          { value: 'sensibilisation', label: 'Séance de sensibilisation' },
          { value: 'formation', label: 'Formation' },
          { value: 'audit_interne', label: 'Audit interne' },
          { value: 'audit_externe', label: 'Audit externe' },
        ],
      },
      { name: 'date', label: "Date de l'activité", type: 'date', required: true },
      {
        name: 'cooperative', label: 'Coopérative concernée', type: 'select',
        options: cooperatives.map(c => ({ value: c.id, label: c.nom })),
      },
      {
        name: 'producteur', label: 'Producteur concerné', type: 'select',
        options: producteurs.map(p => ({ value: p.id, label: `${p.code} - ${p.nom} ${p.prenom || ''}`.trim() })),
      },
      {
        name: 'partenaire', label: 'Partenaire impliqué', type: 'select',
        options: partenaires.map(p => ({ value: p.id, label: p.nom })),
      },
      {
        name: 'objectif_client', label: 'Objectif client', type: 'select',
        options: [
          { value: 'resilience', label: 'Résilience des producteurs' },
          { value: 'autonomisation_femmes', label: 'Autonomisation des femmes' },
          { value: 'droits_humains', label: 'Droits humains (lutte contre le travail des enfants)' },
          { value: 'biodiversite', label: 'Préservation de la biodiversité' },
          { value: 'environnement', label: "Protection de l'environnement" },
          { value: 'autre', label: 'Autre' },
        ],
      },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'resultat', label: 'Résultat obtenu', type: 'textarea' },
      { name: 'nombre_participants', label: 'Nombre de participants', type: 'number' },
      { name: 'notes', label: 'Notes complémentaires', type: 'textarea' },
    ];
  };

  // ==================== COLONNES TABLEAUX ====================
  const getColumns = () => {
    if (activeTab === 'partenaires') {
      return [
        { key: 'nom', label: 'Nom' },
        {
          key: 'type', label: 'Type',
          render: (item) => (
            <Badge color={item.type === 'ong' ? 'green' : item.type === 'autorite_locale' ? 'blue' : 'yellow'}>
              {item.type_display || item.type}
            </Badge>
          ),
        },
        { key: 'contact', label: 'Contact' },
        { key: 'telephone', label: 'Téléphone' },
        { key: 'actif', label: 'Statut', render: (item) => <Badge color={item.actif ? 'green' : 'red'}>{item.actif ? 'Actif' : 'Inactif'}</Badge> },
      ];
    }

    // Activités
    return [
      {
        key: 'type_activite', label: "Type d'activité",
        render: (item) => <Badge color="green">{item.type_activite_display || item.type_activite}</Badge>,
      },
      { key: 'date', label: 'Date' },
      { key: 'cooperative_nom', label: 'Coopérative' },
      {
        key: 'objectif_client', label: 'Objectif client',
        render: (item) => <Badge color="blue">{item.objectif_client_display || item.objectif_client}</Badge>,
      },
      { key: 'resultat', label: 'Résultat' },
      {
        key: 'nombre_participants', label: 'Participants',
        render: (item) => item.nombre_participants || '-',
      },
    ];
  };

  const getItems = () => activeTab === 'activites' ? activites : partenaires;

  const getTitle = () => activeTab === 'activites' ? 'Activités Développement Durable' : 'Partenaires Développement Durable';

  const tabs = [
    { id: 'activites', label: 'Activités DD' },
    { id: 'partenaires', label: 'Partenaires DD' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Développement Durable</h1>
        <p className="text-gray-500 mt-1">
          Programmes d'impact social et environnemental — tout au long de l'année
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
          <DDEntityForm
            fields={getFields()}
            initialData={editingItem || {}}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
            loading={loading}
          />
        </Card>
      ) : (
        <DDEntityList
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

export default DeveloppementDurable;