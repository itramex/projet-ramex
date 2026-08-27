import { useState, useEffect } from 'react';
import { tracabiliteService } from '../../services/api';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

const STATUT_CHOICES = [
  { value: 'preparee', label: 'Préparée' },
  { value: 'en_transit', label: 'En transit' },
  { value: 'livree', label: 'Livrée' },
  { value: 'annulee', label: 'Annulée' },
];

const PRODUIT_CHOICES = [
  { value: 'vanille_verte', label: 'Vanille verte' },
  { value: 'vanille_preparee', label: 'Vanille préparée' },
  { value: 'vanille_vrac', label: 'Vanille vrac' },
];

const defaultForm = () => ({
  numero: '',
  commande_export: '',
  magasin_source: '',
  magasin_destination: '',
  produit: 'vanille_preparee',
  quantite: '',
  date: new Date().toISOString().slice(0, 10),
  transporteur: '',
  observations: '',
  statut: 'preparee',
});

function BonsLivraison() {
  const [bons, setBons] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(defaultForm());

  useEffect(() => {
    fetchBons();
    fetchReferentiels();
  }, []);

  const fetchBons = async () => {
    try {
      const response = await tracabiliteService.getBonsLivraison();
      setBons(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des bons de livraison');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferentiels = async () => {
    try {
      const [magResp, cmdResp] = await Promise.all([
        tracabiliteService.getMagasins(),
        tracabiliteService.getCommandesExport(),
      ]);
      setMagasins(magResp.data.results || magResp.data);
      setCommandes(cmdResp.data.results || cmdResp.data);
    } catch (error) {
      console.error('Erreur référentiels:', error);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      numero: b.numero,
      commande_export: b.commande_export,
      magasin_source: b.magasin_source,
      magasin_destination: b.magasin_destination,
      produit: b.produit,
      quantite: b.quantite,
      date: b.date,
      transporteur: b.transporteur || '',
      observations: b.observations || '',
      statut: b.statut,
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await tracabiliteService.updateBonLivraison(editing.id, form);
      } else {
        await tracabiliteService.createBonLivraison(form);
      }
      setShowModal(false);
      fetchBons();
    } catch (error) {
      console.error('Erreur:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async () => {
    try {
      await tracabiliteService.deleteBonLivraison(confirmDelete.id);
      setConfirmDelete(null);
      fetchBons();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Impossible de supprimer : le bon est peut-être référencé.');
    }
  };

  const badgeVariant = (statut) => {
    switch (statut) {
      case 'livree': return 'success';
      case 'en_transit': return 'info';
      case 'annulee': return 'danger';
      default: return 'warning';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
            <Icon name={iconMap.bonTransport} size="xl" />
            Bons de Livraison
          </h1>
          <p className="text-gray-600">Livraison des transactions vers les magasins</p>
        </div>
        <Button variant="primary" icon="PlusIcon" onClick={openCreate}>
          Nouveau bon de livraison
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
                <th className="px-6 py-3 text-left">N° Bon</th>
                <th className="px-6 py-3 text-left">Transaction</th>
                <th className="px-6 py-3 text-left">Destination</th>
                <th className="px-6 py-3 text-right">Quantité</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Statut</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bons.map((b) => (
                <tr key={b.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{b.numero}</td>
                  <td className="px-6 py-4">{b.commande_export_numero || '—'}</td>
                  <td className="px-6 py-4">{b.magasin_destination_nom}</td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {Number(b.quantite).toLocaleString('fr-FR')} kg
                  </td>
                  <td className="px-6 py-4">{new Date(b.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4">
                    <Badge variant={badgeVariant(b.statut)} size="sm">
                      {b.statut_display || b.statut}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(b)} className="text-yellow-600 hover:text-yellow-900" title="Modifier">
                      <Icon name="PencilIcon" size="md" />
                    </button>
                    <button onClick={() => setConfirmDelete(b)} className="text-red-600 hover:text-red-900" title="Supprimer">
                      <Icon name="TrashIcon" size="md" />
                    </button>
                  </td>
                </tr>
              ))}
              {bons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Aucun bon de livraison enregistré
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
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-dark mb-4">
              {editing ? 'Modifier le bon de livraison' : 'Nouveau bon de livraison'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Bon *</label>
                  <input name="numero" value={form.numero} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction *</label>
                  <select name="commande_export" value={form.commande_export} onChange={handleChange} required className="w-full border rounded px-3 py-2">
                    <option value="">— Sélectionner —</option>
                    {commandes.map((c) => (
                      <option key={c.id} value={c.id}>{c.numero_commande} · {c.nom_client}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Magasin de départ *</label>
                  <select name="magasin_source" value={form.magasin_source} onChange={handleChange} required className="w-full border rounded px-3 py-2">
                    <option value="">— Sélectionner —</option>
                    {magasins.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Magasin destination *</label>
                  <select name="magasin_destination" value={form.magasin_destination} onChange={handleChange} required className="w-full border rounded px-3 py-2">
                    <option value="">— Sélectionner —</option>
                    {magasins.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
                  <select name="produit" value={form.produit} onChange={handleChange} className="w-full border rounded px-3 py-2">
                    {PRODUIT_CHOICES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité (kg) *</label>
                  <input name="quantite" type="number" step="0.001" min="0" value={form.quantite} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input name="date" type="date" value={form.date} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transporteur</label>
                <input name="transporteur" value={form.transporteur} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select name="statut" value={form.statut} onChange={handleChange} className="w-full border rounded px-3 py-2">
                  {STATUT_CHOICES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
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
              Voulez-vous vraiment supprimer le bon de livraison « {confirmDelete.numero} » ?
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

export default BonsLivraison;