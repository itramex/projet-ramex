import { useState, useEffect } from 'react';
import { tracabiliteService, producteurService } from '../../services/api';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

const TYPE_VANILLE_CHOICES = [
  { value: 'verte', label: 'Vanille verte' },
  { value: 'preparee', label: 'Vanille préparée' },
];

const defaultForm = () => ({
  producteur: '',
  campagne: '',
  quantite_estimee: '',
  type_vanille: 'verte',
  date_estimation: new Date().toISOString().slice(0, 10),
  observations: '',
});

function Estimations() {
  const [estimations, setEstimations] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [campagnes, setCampagnes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(defaultForm());

  useEffect(() => {
    fetchEstimations();
    fetchReferentiels();
  }, []);

  const fetchEstimations = async () => {
    try {
      const [resp, statsResp] = await Promise.all([
        tracabiliteService.getEstimationsProduction(),
        tracabiliteService.statistiquesEstimations(),
      ]);
      setEstimations(resp.data.results || resp.data);
      setStats(statsResp.data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des estimations');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferentiels = async () => {
    try {
      const [prodResp, campResp] = await Promise.all([
        producteurService.getAll({ limit: 100 }),
        tracabiliteService.getCampagnes(),
      ]);
      setProducteurs(prodResp.data.results || prodResp.data);
      setCampagnes(campResp.data.results || campResp.data);
    } catch (error) {
      console.error('Erreur référentiels:', error);
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
      producteur: e.producteur,
      campagne: e.campagne,
      quantite_estimee: e.quantite_estimee,
      type_vanille: e.type_vanille,
      date_estimation: e.date_estimation,
      observations: e.observations || '',
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
        await tracabiliteService.updateEstimationProduction(editing.id, form);
      } else {
        await tracabiliteService.createEstimationProduction(form);
      }
      setShowModal(false);
      fetchEstimations();
    } catch (error) {
      console.error('Erreur:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async () => {
    try {
      await tracabiliteService.deleteEstimationProduction(confirmDelete.id);
      setConfirmDelete(null);
      fetchEstimations();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
            <Icon name={iconMap.estimation} size="xl" />
            Estimations de production
          </h1>
          <p className="text-gray-600">Prévisions de quantité par producteur et campagne</p>
        </div>
        <Button variant="primary" icon="PlusIcon" onClick={openCreate}>
          Nouvelle estimation
        </Button>
      </div>
{stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500">Total estimé (campagnes actives)</p>
            <p className="text-3xl font-bold text-dark mt-1">
              {Number(stats.total_estime || 0).toLocaleString('fr-FR')} kg
            </p>
          </div>
          {(stats.par_type_vanille || []).map((t) => (
            <div key={t.type_vanille} className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-500">
                {t.type_vanille === 'verte' ? 'Vanille verte' : 'Vanille préparée'}
              </p>
              <p className="text-3xl font-bold text-dark mt-1">
                {Number(t.total || 0).toLocaleString('fr-FR')} kg
              </p>
              <p className="text-xs text-gray-400">{t.count} estimation(s)</p>
            </div>
          ))}
        </div>
      )}

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
                <th className="px-6 py-3 text-left">Producteur</th>
                <th className="px-6 py-3 text-left">Campagne</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-right">Quantité estimée</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {estimations.map((e) => (
                <tr key={e.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">
                    {e.producteur_code} — {e.producteur_nom}
                  </td>
                  <td className="px-6 py-4">{e.campagne_code}</td>
                  <td className="px-6 py-4">
                    <Badge variant="info" size="sm">{e.type_vanille_display || e.type_vanille}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {Number(e.quantite_estimee).toLocaleString('fr-FR')} kg
                  </td>
                  <td className="px-6 py-4">{new Date(e.date_estimation).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(e)} className="text-yellow-600 hover:text-yellow-900" title="Modifier">
                      <Icon name="PencilIcon" size="md" />
                    </button>
                    <button onClick={() => setConfirmDelete(e)} className="text-red-600 hover:text-red-900" title="Supprimer">
                      <Icon name="TrashIcon" size="md" />
                    </button>
                  </td>
                </tr>
              ))}
              {estimations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Aucune estimation enregistrée
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
              {editing ? 'Modifier l\'estimation' : 'Nouvelle estimation'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producteur *</label>
                <select name="producteur" value={form.producteur} onChange={handleChange} required className="w-full border rounded px-3 py-2">
                  <option value="">— Sélectionner —</option>
                  {producteurs.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} — {p.nom_complet || p.nom}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campagne *</label>
                  <select name="campagne" value={form.campagne} onChange={handleChange} required className="w-full border rounded px-3 py-2">
                    <option value="">— Sélectionner —</option>
                    {campagnes.map((c) => (
                      <option key={c.id} value={c.id}>{c.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de vanille</label>
                  <select name="type_vanille" value={form.type_vanille} onChange={handleChange} className="w-full border rounded px-3 py-2">
                    {TYPE_VANILLE_CHOICES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité estimée (kg) *</label>
                  <input name="quantite_estimee" type="number" step="0.001" min="0" value={form.quantite_estimee} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input name="date_estimation" type="date" value={form.date_estimation} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea name="observations" value={form.observations} onChange={handleChange} rows="3" className="w-full border rounded px-3 py-2" />
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
              Voulez-vous vraiment supprimer cette estimation ({confirmDelete.producteur_code}) ?
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

export default Estimations;