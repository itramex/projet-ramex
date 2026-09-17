import { useEffect, useMemo, useState } from 'react';
import { dotationService, producteurService } from '../../services/api';
import Icon from '../common/Icon';

const TYPE_DOTATIONS = [
  { value: 'kit_scolaire', label: 'Kit scolaire', color: 'bg-blue-100 text-blue-800' },
  { value: 'poisson', label: 'Poisson', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'volaille', label: 'Volaille', color: 'bg-green-100 text-green-800' },
  { value: 'autre', label: 'Autre', color: 'bg-gray-100 text-gray-800' },
];

const DEFAULT_FORM = { producteur: '', type_dotation: 'kit_scolaire', annee: new Date().getFullYear(), quantite: 1, details: '' };

/**
 * Gestion centrale des dotations (kit scolaire, poisson, volaille…)
 * historisées par année avec agrégats cumulés par type.
 */
function Dotations() {
  const [dotations, setDotations] = useState([]);
  const [cumulParType, setCumulParType] = useState({});
  const [cumulTotal, setCumulTotal] = useState(0);
  const [producteurs, setProducteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtres
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [anneeFilter, setAnneeFilter] = useState('');

  // Modale
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Suppression
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Bénéficiaires (liste des producteurs ayant reçu une rubrique)
  const [beneficiairesModal, setBeneficiairesModal] = useState(null); // { type, label }
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [beneficiairesLoading, setBeneficiairesLoading] = useState(false);

  const openBeneficiaires = async (type, label) => {
    setBeneficiairesModal({ type, label });
    setBeneficiairesLoading(true);
    try {
      const params = { type_dotation: type };
      if (anneeFilter) params.annee = anneeFilter;
      const res = await dotationService.getAll(params);
      const rows = res.data.results || res.data || [];
      // Regrouper par producteur (une ligne par bénéficiaire, quantités cumulées + détail par année #27)
      const map = new Map();
      rows.forEach((d) => {
        const key = d.producteur;
        const prev = map.get(key) || {
          producteur: key,
          nom: d.producteur_nom || d.producteur_code || '-',
          code: d.producteur_code || '',
          total: 0,
          annees: new Set(),
          par_annee: {},
        };
        prev.total += d.quantite || 0;
        if (d.annee) {
          prev.annees.add(d.annee);
          prev.par_annee[d.annee] = (prev.par_annee[d.annee] || 0) + (d.quantite || 0);
        }
        map.set(key, prev);
      });
      setBeneficiaires(
        [...map.values()].sort((a, b) => b.total - a.total)
      );
    } catch (err) {
      console.error('Erreur chargement bénéficiaires:', err);
      setBeneficiaires([]);
    } finally {
      setBeneficiairesLoading(false);
    }
  };

  const loadDotations = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.type_dotation = typeFilter;
      if (anneeFilter) params.annee = anneeFilter;
      const res = await dotationService.getAll(params);
      const data = res.data;
      setDotations(data.results || data || []);
      setCumulParType(data.cumul_par_type || {});
      setCumulTotal(data.cumul_total || 0);
    } catch (err) {
      console.error('Erreur chargement dotations:', err);
      setError('Erreur lors du chargement des dotations.');
    } finally {
      setLoading(false);
    }
  };

  const loadProducteurs = async () => {
    try {
      const res = await producteurService.getAllForDropdown({ actif: 'true', page_size: 500 });
      setProducteurs(res.data || []);
    } catch (err) {
      console.error('Erreur chargement producteurs:', err);
    }
  };

  useEffect(() => {
    loadDotations();
    loadProducteurs();
    // Chargement initial uniquement : le rechargement filtré est déjà géré
    // par l'effet debouncé ci-dessous (search/typeFilter/anneeFilter).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(loadDotations, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, anneeFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      producteur: d.producteur,
      type_dotation: d.type_dotation,
      annee: d.annee,
      quantite: d.quantite,
      details: d.details || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.producteur) {
      setFormError('Veuillez sélectionner un producteur.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        producteur: Number(form.producteur),
        type_dotation: form.type_dotation,
        annee: Number(form.annee),
        quantite: Number(form.quantite),
        details: form.details,
      };
      if (editing) {
        await dotationService.update(editing.id, payload);
      } else {
        await dotationService.create(payload);
      }
      setShowForm(false);
      await loadDotations();
    } catch (err) {
      console.error('Erreur enregistrement:', err);
      setFormError(
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Erreur lors de l\u2019enregistrement.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await dotationService.delete(confirmDelete.id);
      setConfirmDelete(null);
      await loadDotations();
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
    }
  };

  const typeLabel = (t) => TYPE_DOTATIONS.find((x) => x.value === t)?.label || t;
  const typeColor = (t) => TYPE_DOTATIONS.find((x) => x.value === t)?.color || 'bg-gray-100 text-gray-800';

  const repartition = useMemo(
    () => Object.entries(cumulParType).map(([type, qte]) => ({ type, label: typeLabel(type), qte })),
    [cumulParType]
  );
  const maxRepartition = Math.max(...repartition.map((r) => r.qte), 1);

  const anneesDispo = useMemo(() => {
    const set = new Set(dotations.map((d) => d.annee));
    return [...set].sort((a, b) => b - a);
  }, [dotations]);
return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Icon name="dotations" size="lg" className="text-primary-yellow" />
            Dotations
          </h1>
          <p className="text-gray-600 mt-1">
            Gestion centrale des dotations (kit scolaire, poisson, volaille…) historisées par année
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary-yellow text-dark rounded-lg font-medium hover:bg-yellow-500 transition-colors"
        >
          ＋ Nouvelle dotation
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500 uppercase">Total dotations</p>
          <p className="text-2xl font-bold text-dark">{dotations.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500 uppercase">Quantité cumulée</p>
          <p className="text-2xl font-bold text-blue-600">{cumulTotal.toLocaleString('fr-FR')}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500 uppercase">Répartition par type</p>
          <div className="space-y-1 mt-1">
            {repartition.length === 0 && <p className="text-sm text-gray-400 italic">Aucune donnée</p>}
            {repartition.map((r) => (
              <div key={r.type} className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 text-gray-600 truncate">{r.label}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-primary-yellow"
                    style={{ width: `${Math.round((r.qte / maxRepartition) * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right font-medium text-dark">{r.qte}</span>
                <button
                  type="button"
                  onClick={() => openBeneficiaires(r.type, r.label)}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                  title={`Voir les bénéficiaires — ${r.label}`}
                >
                  Bénéficiaires
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Icon name="search" size="sm" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (code, nom, détails)…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-yellow"
        >
          <option value="">Tous les types</option>
          {TYPE_DOTATIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={anneeFilter}
          onChange={(e) => setAnneeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-yellow"
        >
          <option value="">Toutes les années</option>
          {anneesDispo.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producteur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Année</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-10 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow" />
                </td>
              </tr>
            ) : dotations.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-10 text-center text-gray-500">
                  Aucune dotation enregistrée.
                </td>
              </tr>
            ) : (
              dotations.map((d) => (
                <tr key={d.id} className="hover:bg-amber-50 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium text-dark">{d.producteur_nom || d.producteur_code || '-'}</span>
                    {d.producteur_code && d.producteur_nom && (
                      <span className="text-gray-400 text-xs"> ({d.producteur_code})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(d.type_dotation)}`}>
                      {typeLabel(d.type_dotation)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{d.annee}</td>
                  <td className="px-4 py-3 text-sm font-medium text-dark">{d.quantite}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{d.details || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(d)} className="text-yellow-600 hover:text-yellow-900 font-medium text-sm mr-3">
                      Modifier
                    </button>
                    <button onClick={() => setConfirmDelete(d)} className="text-red-600 hover:text-red-900 font-medium text-sm">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


      {/* Modale formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-primary-yellow p-5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-dark">
                {editing ? `Modifier la dotation (${editing.producteur_code})` : 'Nouvelle dotation'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-dark hover:text-gray-700 text-3xl leading-none">×</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producteur *</label>
                <select
                  value={form.producteur}
                  onChange={(e) => setForm({ ...form, producteur: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                  required
                >
                  <option value="">Sélectionner un producteur</option>
                  {producteurs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.nom} {p.prenom || ''} {p.village ? `(${p.village})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de dotation *</label>
                  <select
                    value={form.type_dotation}
                    onChange={(e) => setForm({ ...form, type_dotation: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                  >
                    {TYPE_DOTATIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année *</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={form.annee}
                    onChange={(e) => setForm({ ...form, annee: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
                <input
                  type="number"
                  min="0"
                  value={form.quantite}
                  onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Détails complémentaires</label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                  placeholder="Ex : remis au foyer, kit complet…"
                />
              </div>
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary-yellow text-dark px-4 py-2 rounded-lg hover:bg-yellow-500 font-semibold disabled:opacity-50"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-dark mb-2">Supprimer cette dotation ?</h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmDelete.producteur_nom || confirmDelete.producteur_code} — {typeLabel(confirmDelete.type_dotation)} ({confirmDelete.annee})
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Bénéficiaires */}
      {beneficiairesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-dark">
                  Bénéficiaires — {beneficiairesModal.label}
                </h3>
                {anneeFilter && (
                  <p className="text-xs text-gray-500">Année {anneeFilter}</p>
                )}
              </div>
              <button
                onClick={() => setBeneficiairesModal(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <Icon name="XMarkIcon" size="md" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3">
              {beneficiairesLoading ? (
                <div className="py-10 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow" />
                </div>
              ) : beneficiaires.length === 0 ? (
                <p className="py-10 text-center text-gray-500">
                  Aucun bénéficiaire pour cette rubrique.
                </p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="py-2">Producteur</th>
                      <th className="py-2">Code</th>
                      <th className="py-2 text-right">Quantité totale</th>
                      <th className="py-2 text-right">Détail par année</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {beneficiaires.map((b) => (
                      <tr key={b.producteur} className="hover:bg-amber-50">
                        <td className="py-2 font-medium text-dark">{b.nom}</td>
                        <td className="py-2 text-gray-500">{b.code}</td>
                        <td className="py-2 text-right font-semibold text-blue-600">
                          {b.total.toLocaleString('fr-FR')}
                        </td>
                        <td className="py-2 text-right text-gray-500">
                          {[...b.annees].sort((x, y) => x - y).map((a) => `${a} : ${b.par_annee[a]}`).join(' · ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 text-xs text-gray-500">
              {beneficiaires.length} bénéficiaire{beneficiaires.length > 1 ? 's' : ''}
              {' '}— quantités cumulées par producteur (pas de total global cumulé).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dotations;

