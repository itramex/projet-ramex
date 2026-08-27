import { useState, useEffect } from 'react';
import { tracabiliteService } from '../../services/api';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

const TYPE_MAGASIN_CHOICES = [
  { value: 'entrepot', label: 'Entrepôt' },
  { value: 'depot_transit', label: 'Dépôt de transit' },
  { value: 'site_exportateur', label: "Site exportateur" },
  { value: 'cooperative', label: 'Coopérative' },
];

const defaultForm = () => ({
  nom: '',
  code: '',
  type: 'entrepot',
  localisation: '',
  responsable: '',
  telephone: '',
  actif: true,
});

function Magasins() {
  const [magasins, setMagasins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(defaultForm());

  useEffect(() => {
    fetchMagasins();
  }, []);

  const fetchMagasins = async () => {
    setLoading(true);
    try {
      const response = await tracabiliteService.getMagasins();
      setMagasins(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des magasins');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      nom: m.nom,
      code: m.code || '',
      type: m.type,
      localisation: m.localisation || '',
      responsable: m.responsable || '',
      telephone: m.telephone || '',
      actif: m.actif,
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await tracabiliteService.updateMagasin(editing.id, form);
      } else {
        await tracabiliteService.createMagasin(form);
      }
      setShowModal(false);
      fetchMagasins();
    } catch (error) {
      console.error('Erreur:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async () => {
    try {
      await tracabiliteService.deleteMagasin(confirmDelete.id);
      setConfirmDelete(null);
      fetchMagasins();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Impossible de supprimer : le magasin est peut-être référencé.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
            <Icon name={iconMap.magasin} size="xl" />
            Magasins
          </h1>
          <p className="text-gray-600">Gestion des entrepôts et magasins de stockage</p>
        </div>
        <Button variant="primary" icon="PlusIcon" onClick={openCreate}>
          Nouveau Magasin
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-yellow border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Nom</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Localisation</th>
                <th className="px-6 py-3 text-right">Stock actuel</th>
                <th className="px-6 py-3 text-left">Statut</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {magasins.map((m) => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{m.nom}</td>
                  <td className="px-6 py-4">{m.type_display || m.type}</td>
                  <td className="px-6 py-4">{m.localisation || '—'}</td>
                  <td className="px-6 py-4 text-right font-semibold">{Number(m.stock_actuel || 0).toLocaleString('fr-FR')} kg</td>
                  <td className="px-6 py-4">
                    <Badge variant={m.actif ? 'success' : 'warning'} size="sm">
                      {m.actif ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(m)} className="text-yellow-600 hover:text-yellow-900" title="Modifier">
                      <Icon name="PencilIcon" size="md" />
                    </button>
                    <button onClick={() => setConfirmDelete(m)} className="text-red-600 hover:text-red-900" title="Supprimer">
                      <Icon name="TrashIcon" size="md" />
                    </button>
                  </td>
                </tr>
              ))}
              {magasins.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Aucun magasin enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création / édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-dark mb-4">
              {editing ? 'Modifier le magasin' : 'Nouveau magasin'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input name="nom" value={form.nom} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input name="code" value={form.code} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded px-3 py-2">
                    {TYPE_MAGASIN_CHOICES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                <input name="localisation" value={form.localisation} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                  <input name="responsable" value={form.responsable} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input name="telephone" value={form.telephone} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="actif" checked={form.actif} onChange={handleChange} />
                <span className="text-sm text-gray-700">Magasin actif</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button variant="primary" type="submit">{editing ? 'Enregistrer' : 'Créer'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-dark mb-3">Confirmer la suppression</h2>
            <p className="text-gray-600 mb-4">
              Voulez-vous vraiment supprimer le magasin « {confirmDelete.nom} » ?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Annuler</Button>
              <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Magasins;