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

const TYPE_MOUVEMENT_CHOICES = [
  { value: 'entree_bl', label: 'Entrée sur BL' },
  { value: 'entree_directe', label: 'Entrée directe' },
  { value: 'sortie_export', label: 'Sortie pour export' },
  { value: 'ajustement', label: 'Ajustement' },
];

const MOUVEMENT_VARIANT = {
  entree_bl: 'success',
  entree_directe: 'success',
  sortie_export: 'danger',
  ajustement: 'warning',
};

const defaultForm = () => ({
  magasin: '',
  produit: 'vanille_preparee',
  date: new Date().toISOString().slice(0, 10),
  type_mouvement: 'entree_directe',
  reference: '',
  quantite_entree: '',
  quantite_sortie: '',
  observations: '',
});

function FichesStock() {
  const [fiches, setFiches] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreMagasin, setFiltreMagasin] = useState('');
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
      const [fichesRes, magasinsRes] = await Promise.all([
        tracabiliteService.getFichesStock(filtreMagasin ? { magasin: filtreMagasin } : {}),
        tracabiliteService.getMagasins(),
      ]);
      setFiches(fichesRes.data.results || fichesRes.data);
      setMagasins(magasinsRes.data.results || magasinsRes.data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des fiches de stock');
    } finally {
      setLoading(false);
    }
  };

  // Recharger les fiches quand le filtre magasin change
  useEffect(() => {
    if (!loading) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtreMagasin]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({
      magasin: f.magasin ?? '',
      produit: f.produit,
      date: f.date,
      type_mouvement: f.type_mouvement,
      reference: f.reference || '',
      quantite_entree: f.quantite_entree,
      quantite_sortie: f.quantite_sortie,
      observations: f.observations || '',
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      magasin: form.magasin ? parseInt(form.magasin, 10) : null,
      quantite_entree: parseFloat(form.quantite_entree || 0),
      quantite_sortie: parseFloat(form.quantite_sortie || 0),
    };
    try {
      if (editing) {
        await tracabiliteService.updateFicheStock(editing.id, payload);
      } else {
        await tracabiliteService.createFicheStock(payload);
      }
      setShowModal(false);
      fetchAll();
    } catch (error) {
      console.error('Erreur:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async () => {
    try {
      await tracabiliteService.deleteFicheStock(confirmDelete.id);
      setConfirmDelete(null);
      fetchAll();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Impossible de supprimer cette fiche.');
    }
  };

  const totalEntrees = fiches.reduce((sum, f) => sum + parseFloat(f.quantite_entree || 0), 0);
  const totalSorties = fiches.reduce((sum, f) => sum + parseFloat(f.quantite_sortie || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
            <Icon name={iconMap.estimation} size="xl" />
            Fiches de Stock
          </h1>
          <p className="text-gray-600">
            Mouvements des magasins — solde cumulé calculé automatiquement
          </p>
        </div>
        <Button variant="primary" icon="PlusIcon" onClick={openCreate}>
          Nouveau Mouvement
        </Button>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Mouvements affichés</p>
          <p className="text-2xl font-bold text-dark">{fiches.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total entrées</p>
          <p className="text-2xl font-bold text-green-600">+{totalEntrees.toFixed(2)} kg</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total sorties</p>
          <p className="text-2xl font-bold text-red-600">-{totalSorties.toFixed(2)} kg</p>
        </div>
      </div>

      {/* Filtre par magasin */}
      <div className="mb-4">
        <select
          value={filtreMagasin}
          onChange={(e) => setFiltreMagasin(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">Tous les magasins</option>
          {magasins.map((m) => (
            <option key={m.id} value={m.id}>{m.nom}</option>
          ))}
        </select>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Magasin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entrée</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sortie</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fiches.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    Aucun mouvement de stock enregistré
                  </td>
                </tr>
              ) : (
                fiches.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{f.date}</td>
                    <td className="px-4 py-3 font-medium text-dark">{f.magasin_nom}</td>
                    <td className="px-4 py-3">
                      {PRODUIT_CHOICES.find((p) => p.value === f.produit)?.label || f.produit}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={MOUVEMENT_VARIANT[f.type_mouvement] || 'info'}>
                        {f.type_mouvement_display ||
                          TYPE_MOUVEMENT_CHOICES.find((t) => t.value === f.type_mouvement)?.label ||
                          f.type_mouvement}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{f.reference || '-'}</td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {parseFloat(f.quantite_entree) > 0 ? `+${parseFloat(f.quantite_entree).toFixed(3)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {parseFloat(f.quantite_sortie) > 0 ? `-${parseFloat(f.quantite_sortie).toFixed(3)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-dark">
                      {parseFloat(f.solde).toFixed(3)} kg
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <Button variant="secondary" onClick={() => openEdit(f)}>Modifier</Button>
                      <Button variant="danger" onClick={() => setConfirmDelete(f)}>Supprimer</Button>
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
              {editing ? 'Modifier le mouvement' : 'Nouveau mouvement de stock'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Magasin *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de mouvement *</label>
                  <select name="type_mouvement" value={form.type_mouvement} onChange={handleChange} required className="w-full border rounded px-3 py-2">
                    {TYPE_MOUVEMENT_CHOICES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence document</label>
                <input name="reference" value={form.reference} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité entrée (kg)</label>
                  <input type="number" step="0.001" min="0" name="quantite_entree" value={form.quantite_entree} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité sortie (kg)</label>
                  <input type="number" step="0.001" min="0" name="quantite_sortie" value={form.quantite_sortie} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              {editing && (
                <div className="bg-gray-50 border rounded px-3 py-2 text-sm text-gray-600">
                  Solde actuel de cette ligne : <strong>{parseFloat(editing.solde).toFixed(3)} kg</strong>{' '}
                  (recalculé automatiquement après modification)
                </div>
              )}
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
              Voulez-vous vraiment supprimer ce mouvement du {confirmDelete.date} ({confirmDelete.magasin_nom}) ?
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

export default FichesStock;