import { useState, useEffect } from 'react';
import { tracabiliteService } from '../../services/api';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

const PRODUIT_CHOICES = [
  { value: 'vanille_verte', label: 'Vanille verte' },
  { value: 'vanille_preparee', label: 'Vanille préparée' },
];

const defaultForm = () => ({
  numero_bon: '',
  bon_livraison: '',
  magasin: '',
  produit: 'vanille_preparee',
  quantite_recue: '',
  date: new Date().toISOString().slice(0, 10),
  agent_receptionnaire: '',
  observations: '',
});

function EntreesMagasin() {
  const [entrees, setEntrees] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [bonsLivraison, setBonsLivraison] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(defaultForm());

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [entreesRes, magasinsRes, bonsRes] = await Promise.all([
        tracabiliteService.getEntreesMagasin(),
        tracabiliteService.getMagasins({ actif: true }),
        tracabiliteService.getBonsLivraison(),
      ]);
      setEntrees(entreesRes.data.results || entreesRes.data);
      setMagasins(magasinsRes.data.results || magasinsRes.data);
      setBonsLivraison(bonsRes.data.results || bonsRes.data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des entrées magasin');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (e) => {
    setEditing(e);
    setForm({
      numero_bon: e.numero_bon,
      bon_livraison: e.bon_livraison ?? '',
      magasin: e.magasin ?? '',
      produit: e.produit,
      quantite_recue: e.quantite_recue,
      date: e.date,
      agent_receptionnaire: e.agent_receptionnaire || '',
      observations: e.observations || '',
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => ({
    ...form,
    bon_livraison: form.bon_livraison ? parseInt(form.bon_livraison, 10) : null,
    magasin: form.magasin ? parseInt(form.magasin, 10) : null,
    quantite_recue: parseFloat(form.quantite_recue || 0),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await tracabiliteService.updateEntreeMagasin(editing.id, buildPayload());
      } else {
        await tracabiliteService.createEntreeMagasin(buildPayload());
      }
      setShowModal(false);
      fetchAll();
    } catch (error) {
      console.error('Erreur:', error);
      const detail =
        error.response?.data?.numero_bon?.[0] ||
        error.response?.data?.detail ||
        'Erreur lors de la sauvegarde';
      alert(detail);
    }
  };

  const handleDelete = async () => {
    try {
      await tracabiliteService.deleteEntreeMagasin(confirmDelete.id);
      setConfirmDelete(null);
      fetchAll();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Impossible de supprimer cette entrée.');
    }
  };

  const filtered = entrees.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      e.numero_bon.toLowerCase().includes(q) ||
      (e.bon_livraison_numero || '').toLowerCase().includes(q) ||
      (e.magasin_nom || '').toLowerCase().includes(q) ||
      (e.agent_receptionnaire || '').toLowerCase().includes(q)
    );
  });

  const totalRecu = filtered.reduce((sum, e) => sum + parseFloat(e.quantite_recue || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
            <Icon name={iconMap.bonTransport} size="xl" />
            Entrées Magasin
          </h1>
          <p className="text-gray-600">Réceptions physiques des bons de livraison dans les magasins</p>
        </div>
        <Button variant="primary" icon="PlusIcon" onClick={openCreate}>
          Nouvelle Entrée
        </Button>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Entrées enregistrées</p>
          <p className="text-2xl font-bold text-dark">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Quantité totale reçue</p>
          <p className="text-2xl font-bold text-green-600">{totalRecu.toFixed(2)} kg</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Bons de livraison disponibles</p>
          <p className="text-2xl font-bold text-blue-600">{bonsLivraison.length}</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher (n° entrée, n° BL, magasin, agent)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 border rounded px-3 py-2"
        />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chick-yellow"></div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Bon</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bon de livraison</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Magasin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qté reçue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    Aucune entrée magasin enregistrée
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-dark">{e.numero_bon}</td>
                    <td className="px-4 py-3">{e.bon_livraison_numero || '-'}</td>
                    <td className="px-4 py-3">{e.magasin_nom}</td>
                    <td className="px-4 py-3">
                      <Badge variant="info">
                        {PRODUIT_CHOICES.find((p) => p.value === e.produit)?.label || e.produit}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {parseFloat(e.quantite_recue).toFixed(3)} kg
                    </td>
                    <td className="px-4 py-3">{e.date}</td>
                    <td className="px-4 py-3">{e.agent_receptionnaire || '-'}</td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <Button variant="secondary" onClick={() => openEdit(e)}>Modifier</Button>
                      <Button variant="danger" onClick={() => setConfirmDelete(e)}>Supprimer</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal création / édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg my-8">
            <h2 className="text-xl font-bold text-dark mb-4">
              {editing ? "Modifier l'entrée" : 'Nouvelle entrée magasin'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° du bon *</label>
                  <input name="numero_bon" value={form.numero_bon} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de réception *</label>
                  <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bon de livraison *</label>
                <select name="bon_livraison" value={form.bon_livraison} onChange={handleChange} required className="w-full border rounded px-3 py-2">
                  <option value="">— Sélectionner un BL —</option>
                  {bonsLivraison.map((b) => (
                    <option key={b.id} value={b.id}>{b.numero}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Magasin de réception *</label>
                  <select name="magasin" value={form.magasin} onChange={handleChange} required className="w-full border rounded px-3 py-2">
                    <option value="">— Sélectionner —</option>
                    {magasins.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
                  <select name="produit" value={form.produit} onChange={handleChange} className="w-full border rounded px-3 py-2">
                    {PRODUIT_CHOICES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité reçue (kg) *</label>
                  <input type="number" step="0.001" min="0" name="quantite_recue" value={form.quantite_recue} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent réceptionnaire</label>
                  <input name="agent_receptionnaire" value={form.agent_receptionnaire} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea name="observations" value={form.observations} onChange={handleChange} rows="2" className="w-full border rounded px-3 py-2" />
              </div>
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
              Voulez-vous vraiment supprimer l'entrée « {confirmDelete.numero_bon} » ?
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

export default EntreesMagasin;