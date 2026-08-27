import { useState, useEffect } from 'react';
import { cycleAnnuelService, tracabiliteService } from '../../services/api';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const PILIER_DISPLAY = {
  tracabilite: 'Traçabilité',
  certification: 'Certification',
  developpement_durable: 'DD',
};

const PILIER_COLOR = {
  tracabilite: 'bg-blue-100 text-blue-800 border-blue-200',
  certification: 'bg-amber-100 text-amber-800 border-amber-200',
  developpement_durable: 'bg-green-100 text-green-800 border-green-200',
};

function CycleAnnuel() {
  const [mois, setMois] = useState([]);
  const [phases, setPhases] = useState([]);
  const [campagnes, setCampagnes] = useState([]);
  const [campagneId, setCampagneId] = useState('');
  const [rapport, setRapport] = useState(null);
  const [phasesCampagne, setPhasesCampagne] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadRapport, setLoadRapport] = useState(false);
  // Modal CRUD phase agricole
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(defaultForm());

  function defaultForm() {
    return {
      code: '', nom: '', pilier: 'tracabilite', type_phase: 'floraison',
      mois_debut: 1, mois_fin: 12, cycle_croise: false, toute_annee: false,
      couleur: '#2563eb', ordre: 0, description: '', actif: true,
    };
  }

  useEffect(() => {
    fetchCalendrier();
    fetchCampagnes();
  }, []);

  const fetchCalendrier = async () => {
    setLoading(true);
    try {
      const [calResp, phResp] = await Promise.all([
        cycleAnnuelService.getCalendrier(),
        cycleAnnuelService.getPhasesAgricoles(),
      ]);
      setMois(calResp.data.mois || []);
      setPhases(phResp.data.results || phResp.data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement du calendrier');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampagnes = async () => {
    try {
      const resp = await tracabiliteService.getCampagnes();
      const list = resp.data.results || resp.data;
      setCampagnes(list || []);
      if (list && list.length > 0 && !campagneId) {
        setCampagneId(String(list[0].id));
        loadRapportFor(String(list[0].id));
      }
    } catch (error) {
      console.error('Erreur campagnes:', error);
    }
  };

  useEffect(() => {
    if (campagneId) loadRapportFor(campagneId);
  }, [campagneId]);

  const loadRapportFor = async (id) => {
    setLoadRapport(true);
    try {
      const [rResp, pcResp] = await Promise.all([
        cycleAnnuelService.getRapportCampagne(id),
        cycleAnnuelService.getPhasesCampagne({ campagne: id }),
      ]);
      setRapport(rResp.data);
      setPhasesCampagne(pcResp.data.results || pcResp.data || []);
    } catch (error) {
      console.error('Erreur rapport:', error);
      setRapport(null);
    } finally {
      setLoadRapport(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      code: p.code, nom: p.nom, pilier: p.pilier, type_phase: p.type_phase,
      mois_debut: p.mois_debut, mois_fin: p.mois_fin,
      cycle_croise: !!p.cycle_croise, toute_annee: !!p.toute_annee,
      couleur: p.couleur || '#2563eb', ordre: p.ordre || 0,
      description: p.description || '', actif: p.actif,
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'ordre' || name === 'mois_debut' || name === 'mois_fin' ? Number(value) : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await cycleAnnuelService.updatePhaseAgricole(editing.id, form);
      else await cycleAnnuelService.createPhaseAgricole(form);
      setShowModal(false);
      await fetchCalendrier();
    } catch (error) {
      console.error('Erreur:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async () => {
    try {
      await cycleAnnuelService.deletePhaseAgricole(confirmDelete.id);
      setConfirmDelete(null);
      await fetchCalendrier();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Impossible de supprimer : la phase est peut-être référencée.');
    }
  };

  return (
<div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
            <Icon name={iconMap.calendar} size="xl" />
            Cycle annuel & Calendrier agricole
          </h1>
          <p className="text-gray-600">Planification des campagnes par saison et rapports annuels</p>
        </div>
        <Button variant="primary" icon="PlusIcon" onClick={openCreate}>
          Nouvelle phase
        </Button>
      </div>

      {/* Sélecteur de campagne */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-8 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Campagne</label>
          <select
            value={campagneId}
            onChange={(e) => setCampagneId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">— Sélectionner une campagne —</option>
            {campagnes.map((c) => (
              <option key={c.id} value={c.id}>{c.code} ({c.annee_debut}-{c.annee_fin})</option>
            ))}
          </select>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Traçabilité</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500"></span> Certification</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> DD</span>
        </div>
      </div>

      {/* Calendrier annuel */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-yellow border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {mois.map((m) => (
            <div key={m.numero} className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-dark mb-2">{m.numero}. {m.nom}</h3>
              <div className="space-y-1.5">
                {m.phases.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Aucune phase</p>
                )}
                {m.phases.map((p) => (
                  <div
                    key={`${m.numero}-${p.id}`}
                    className={`text-xs px-2 py-1 rounded border ${PILIER_COLOR[p.pilier] || 'bg-gray-100'}`}
                    style={p.couleur ? { borderLeft: `3px solid ${p.couleur}` } : undefined}
                  >
                    <span className="font-medium">{p.nom}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
{/* Rapport par campagne */}
      {campagneId && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-dark mb-3 flex items-center gap-2">
            <Icon name={iconMap.chiffresClés} size="lg" />
            Rapport de campagne
          </h2>
          {loadRapport ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-yellow border-t-transparent"></div>
              <p className="mt-3 text-gray-500">Calcul du rapport...</p>
            </div>
          ) : rapport ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg shadow-md p-4">
                  <p className="text-xs text-gray-500">Bons de collecte</p>
                  <p className="text-2xl font-bold text-dark">{rapport.tracabilite?.bons_collecte || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <p className="text-xs text-gray-500">Poids total (kg)</p>
                  <p className="text-2xl font-bold text-dark">{Number(rapport.tracabilite?.poids_total_kg || 0).toLocaleString('fr-FR')}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <p className="text-xs text-gray-500">Estimation (kg)</p>
                  <p className="text-2xl font-bold text-dark">{Number(rapport.tracabilite?.estimation_kg || 0).toLocaleString('fr-FR')}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <p className="text-xs text-gray-500">Export (kg)</p>
                  <p className="text-2xl font-bold text-dark">{Number(rapport.tracabilite?.poids_export_kg || 0).toLocaleString('fr-FR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg shadow-md p-4">
                  <p className="text-xs text-gray-500">Objectifs Certification</p>
                  <ProgressRow cible={rapport.certification?.cible_objectif} real={rapport.certification?.realise_objectif} />
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <p className="text-xs text-gray-500">Objectifs DD</p>
                  <ProgressRow cible={rapport.developpement_durable?.cible_objectif} real={rapport.developpement_durable?.realise_objectif} />
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                  <p className="text-xs text-gray-500">Montant total (Ar)</p>
                  <p className="text-2xl font-bold text-dark">{Number(rapport.tracabilite?.montant_total_ar || 0).toLocaleString('fr-FR')}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500">Rapport indisponible pour cette campagne.</p>
          )}
        </div>
      )}
{/* Phases planifiées de la campagne */}
      {campagneId && rapport && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-dark mb-3 flex items-center gap-2">
            <Icon name={iconMap.lotTraitement} size="lg" />
            Phases planifiées de la campagne
          </h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">Phase</th>
                  <th className="px-6 py-3 text-left">Pilier</th>
                  <th className="px-6 py-3 text-left">Début</th>
                  <th className="px-6 py-3 text-left">Fin</th>
                  <th className="px-6 py-3 text-right">Réalisation</th>
                  <th className="px-6 py-3 text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {(rapport.phases?.liste || []).map((pc) => (
                  <tr key={pc.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{pc.phase_nom}</td>
                    <td className="px-6 py-3"><Badge size="sm">{PILIER_DISPLAY[pc.phase_pilier] || pc.phase_pilier}</Badge></td>
                    <td className="px-6 py-3">{new Date(pc.date_debut).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-3">{new Date(pc.date_fin).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-3 text-right">{pc.taux_realisation != null ? `${pc.taux_realisation}%` : '—'}</td>
                    <td className="px-6 py-3">
                      <Badge variant={pc.statut === 'terminee' ? 'success' : pc.statut === 'en_cours' ? 'info' : 'warning'} size="sm">
                        {pc.statut_display || pc.statut}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!rapport.phases?.liste || rapport.phases.liste.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-gray-500">Aucune phase planifiée</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
{/* Modal CRUD phase agricole */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-dark mb-4">
              {editing ? 'Modifier la phase' : 'Nouvelle phase'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input name="code" value={form.code} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input name="nom" value={form.nom} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pilier</label>
                  <select name="pilier" value={form.pilier} onChange={handleChange} className="w-full border rounded px-3 py-2">
                    <option value="tracabilite">Traçabilité</option>
                    <option value="certification">Certification</option>
                    <option value="developpement_durable">DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de phase</label>
                  <select name="type_phase" value={form.type_phase} onChange={handleChange} className="w-full border rounded px-3 py-2">
                    <option value="floraison">Floraison</option>
                    <option value="recolte_verte">Récolte vanille verte</option>
                    <option value="recolte_preparee">Récolte vanille préparée</option>
                    <option value="georeferencement">Géoréférencement GPS</option>
                    <option value="formation">Formation</option>
                    <option value="controle_interne">Contrôle interne</option>
                    <option value="audit_interne">Audit interne</option>
                    <option value="expedition">Expédition</option>
                    <option value="reboisement">Reboisement</option>
                    <option value="convention">Convention / partenariat</option>
                    <option value="pepiniere">Pépinière</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mois début (1-12)</label>
                  <input name="mois_debut" type="number" min="1" max="12" value={form.mois_debut} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mois fin (1-12)</label>
                  <input name="mois_fin" type="number" min="1" max="12" value={form.mois_fin} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="cycle_croise" checked={form.cycle_croise} onChange={handleChange} />
                  <span className="text-sm">Cycle chevauchant l'année</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="toute_annee" checked={form.toute_annee} onChange={handleChange} />
                  <span className="text-sm">Toute l'année</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="actif" checked={form.actif} onChange={handleChange} />
                  <span className="text-sm">Actif</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows="2" className="w-full border rounded px-3 py-2" />
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
            <p className="text-gray-600 mb-4">Supprimer la phase « {confirmDelete.nom} » ?</p>
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

function ProgressRow({ cible, real }) {
  const pct = cible ? Math.min(100, Math.round(((real || 0) / cible) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-dark font-semibold">{Number(real || 0).toLocaleString('fr-FR')} / {Number(cible || 0).toLocaleString('fr-FR')}</span>
        <span className="text-gray-500">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
        <div className="bg-primary-yellow h-2 rounded-full" style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
}

export default CycleAnnuel;