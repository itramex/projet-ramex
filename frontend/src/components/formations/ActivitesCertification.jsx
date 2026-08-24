import { useState, useEffect, useCallback } from 'react';
import { formationService, cooperativeService, producteurService } from '../../services/api';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';

const TYPE_ACTIVITE_OPTIONS = [
  { value: 'sensibilisation', label: 'Sensibilisation', color: 'blue' },
  { value: 'formation', label: 'Formation', color: 'green' },
  { value: 'audit_interne', label: 'Audit interne', color: 'purple' },
  { value: 'audit_externe', label: 'Audit externe', color: 'red' },
];

function ActivitesCertification() {
  const [activites, setActivites] = useState([]);
  const [stats, setStats] = useState(null);
  const [typesCertifs, setTypesCertifs] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    type_activite: '',
    type_certification: '',
    cooperative: '',
    search: '',
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const loadReferences = useCallback(() => {
    Promise.all([
      formationService.getAllTypesCertifications(),
      cooperativeService.getAll(),
      producteurService.getAllForDropdown(),
    ])
      .then(([typesRes, coopRes, prodRes]) => {
        setTypesCertifs(typesRes.data.results || typesRes.data || []);
        setCooperatives(coopRes.data.results || coopRes.data || []);
        setProducteurs(prodRes.data.results || prodRes.data || []);
      })
      .catch(() => {
        setTypesCertifs([]);
        setCooperatives([]);
        setProducteurs([]);
      });
  }, []);

  const loadData = useCallback(async (override = null) => {
    setLoading(true);
    setError(null);
    const f = override !== null ? override : filters;
    const params = {};
    if (f.type_activite) params.type_activite = f.type_activite;
    if (f.type_certification) params.type_certification = f.type_certification;
    if (f.cooperative) params.cooperative = f.cooperative;
    if (f.search) params.search = f.search;

    try {
      const [listRes, statsRes] = await Promise.all([
        formationService.getAllActivitesCertification(params),
        formationService.getActivitesCertificationStats(),
      ]);
      setActivites(listRes.data.results || listRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Erreur chargement activités certification:', err);
      setError(err.response?.data?.detail || 'Erreur lors du chargement des activités de certification');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (name, value) => {
    const next = { ...filters, [name]: value };
    setFilters(next);
    loadData(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const getTypeBadgeVariant = (type) => {
    const opt = TYPE_ACTIVITE_OPTIONS.find((o) => o.value === type);
    if (!opt) return 'default';
    return {
      blue: 'info',
      green: 'success',
      purple: 'neutral',
      red: 'error',
    }[opt.color] || 'default';
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <Icon name="ExclamationTriangleIcon" size="xl" className="text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => loadData()} variant="primary" icon="ArrowPathIcon">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Activités totales", value: stats?.total ?? 0, icon: 'ClipboardCheckIcon', color: 'bg-blue-500' },
    { label: 'Participants cumulés', value: stats?.total_participants ?? 0, icon: 'UsersIcon', color: 'bg-purple-500' },
  ];

  const activiteParType = stats?.par_type || [];

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Icon name="academicCap" className="text-chick-yellow" />
            Activités de certification
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sensibilisations, formations, audits internes et externes — pilier Certification
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setShowForm(true); }}
          variant="primary"
          icon="PlusIcon"
        >
          Nouvelle activité
        </Button>
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center text-white flex-shrink-0`}>
              <Icon name={card.icon} size="lg" />
            </div>
            <div>
              <p className="text-3xl font-bold text-dark">{card.value}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Répartition par type */}
      {activiteParType.length > 0 && (
        <Card>
          <h3 className="font-semibold text-dark mb-3">Répartition par type d'activité</h3>
          <div className="flex flex-wrap gap-2">
            {activiteParType.map((item) => {
              const opt = TYPE_ACTIVITE_OPTIONS.find((o) => o.value === item.type_activite);
              return (
                <span key={item.type_activite} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                  {opt ? opt.label : item.type_activite}
                  <span className="bg-dark text-white rounded-full px-2 text-xs">{item.count}</span>
                </span>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filtres */}
      <Card>
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'activité</label>
            <select
              value={filters.type_activite}
              onChange={(e) => handleFilterChange('type_activite', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">Toutes</option>
              {TYPE_ACTIVITE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certification</label>
            <select
              value={filters.type_certification}
              onChange={(e) => handleFilterChange('type_certification', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">Toutes</option>
              {typesCertifs.map((tc) => (
                <option key={tc.id} value={tc.id}>{tc.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coopérative</label>
            <select
              value={filters.cooperative}
              onChange={(e) => handleFilterChange('cooperative', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">Toutes</option>
              {cooperatives.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Description, coopérative, producteur..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
              <Button type="submit" variant="primary" icon="MagnifyingGlassIcon" size="sm">
                OK
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Tableau */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-chick-yellow"></div>
          </div>
        ) : activites.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Icon name="CalendarIcon" size="xl" className="mx-auto mb-3 text-gray-300" />
            <p>Aucune activité de certification enregistrée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certification</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cible</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {activites.map((act) => (
                  <tr key={act.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{act.date || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getTypeBadgeVariant(act.type_activite)} size="sm">
                        {act.type_activite_display || act.type_activite}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{act.type_certification_nom || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {act.cooperative_nom || (act.producteur_nom || '-')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{act.nombre_participants ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{act.responsable_nom || '-'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="PencilIcon"
                        title="Modifier"
                        onClick={() => { setEditing(act); setShowForm(true); }}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon="TrashIcon"
                        title="Supprimer"
                        onClick={() => setShowDeleteConfirm(act)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-dark mb-3">Confirmer la suppression</h2>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment supprimer cette activité du{' '}
              <strong>{showDeleteConfirm.date}</strong> (
              {showDeleteConfirm.type_activite_display || showDeleteConfirm.type_activite}) ?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await formationService.deleteActiviteCertification(showDeleteConfirm.id);
                    setShowDeleteConfirm(null);
                    loadData();
                  } catch (err) {
                    alert("Erreur lors de la suppression.");
                  }
                }}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ouverture du formulaire */}
      {showForm && (
        <ActiviteCertificationForm
          activite={editing}
          typesCertifs={typesCertifs}
          cooperatives={cooperatives}
          producteurs={producteurs}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

// ==================== FORMULAIRE (création / édition) ====================
function ActiviteCertificationForm({ activite, typesCertifs, cooperatives, producteurs, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    type_activite: activite?.type_activite || 'sensibilisation',
    date: activite?.date || new Date().toISOString().slice(0, 10),
    type_certification: activite?.type_certification || '',
    cooperative: activite?.cooperative || '',
    producteur: activite?.producteur || '',
    description: activite?.description || '',
    resultat: activite?.resultat || '',
    nombre_participants: activite?.nombre_participants ?? 0,
    notes: activite?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      type_certification: formData.type_certification || null,
      cooperative: formData.cooperative || null,
      producteur: formData.producteur || null,
      nombre_participants: parseInt(formData.nombre_participants || 0, 10),
    };

    try {
      if (activite) {
        await formationService.updateActiviteCertification(activite.id, payload);
      } else {
        await formationService.createActiviteCertification(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'enregistrement de l\'activité');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-dark">
            {activite ? "Modifier l'activité" : "Nouvelle activité de certification"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'activité *</label>
              <select
                value={formData.type_activite}
                onChange={(e) => setFormData({ ...formData, type_activite: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
                required
              >
                {TYPE_ACTIVITE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certification concernée</label>
              <select
                value={formData.type_certification}
                onChange={(e) => setFormData({ ...formData, type_certification: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              >
                <option value="">— Aucune —</option>
                {typesCertifs.map((tc) => (
                  <option key={tc.id} value={tc.id}>{tc.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coopérative concernée</label>
              <select
                value={formData.cooperative}
                onChange={(e) => setFormData({ ...formData, cooperative: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              >
                <option value="">— Aucune —</option>
                {cooperatives.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Producteur concerné</label>
              <select
                value={formData.producteur}
                onChange={(e) => setFormData({ ...formData, producteur: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              >
                <option value="">— Aucun —</option>
                {producteurs.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom_complet || `${p.nom} ${p.prenom || ''}`} ({p.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de participants</label>
              <input
                type="number"
                min="0"
                value={formData.nombre_participants}
                onChange={(e) => setFormData({ ...formData, nombre_participants: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description / thèmes abordés</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Résultat obtenu</label>
            <textarea
              value={formData.resultat}
              onChange={(e) => setFormData({ ...formData, resultat: e.target.value })}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes complémentaires</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Enregistrement...' : (activite ? 'Mettre à jour' : 'Créer')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ActivitesCertification;