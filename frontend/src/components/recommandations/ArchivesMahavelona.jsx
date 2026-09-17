import { useEffect, useState } from 'react';
import { recommendationService } from '../../services/api';
import Icon from '../common/Icon';

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function RepartitionList({ items, labelKey = 'label', valueKey = 'total' }) {
  if (!items || items.length === 0) return <p className="text-sm text-gray-400 italic">Aucune donnée</p>;
  const max = Math.max(...items.map((i) => i[valueKey] || 0), 1);
  return (
    <div className="space-y-1.5">
      {items.map((it, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="w-24 shrink-0 text-gray-600 truncate">{it[labelKey] ?? '—'}</span>
          <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
            <div
              className="h-full bg-primary-yellow"
              style={{ width: `${Math.round(((it[valueKey] || 0) / max) * 100)}%` }}
            />
          </div>
          <span className="w-10 text-right font-medium text-dark">{it[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Archives annuelles des critères Mahavelona (mutuelle santé).
 * Chaque archive est un instantané figé de l'état des membres pour une année.
 */
function ArchivesMahavelona() {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anneeFilter, setAnneeFilter] = useState('');
  const [anneeSnapshot, setAnneeSnapshot] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [detail, setDetail] = useState(null);

  const loadArchives = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await recommendationService.getMahavelonaArchives();
      setArchives(res.data.results || res.data || []);
    } catch (err) {
      console.error('Erreur chargement archives:', err);
      setError('Erreur lors du chargement des archives.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchives();
  }, []);

  const genererSnapshot = async () => {
    setGenerating(true);
    setError('');
    try {
      await recommendationService.snapshotMahavelonaArchive({ annee: Number(anneeSnapshot) });
      setAnneeFilter('');
      await loadArchives();
    } catch (err) {
      console.error('Erreur snapshot:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la génération de l\u2019archive.');
    } finally {
      setGenerating(false);
    }
  };

  const aj = detail?.archive_json || {};

  // Sélecteur d'années disponibles (#23) : dérivées des archives chargées
  const anneesDisponibles = [...new Set(archives.map((a) => a.annee_reference))].sort((a, b) => b - a);
  const archivesFiltrees = anneeFilter
    ? archives.filter((a) => String(a.annee_reference) === String(anneeFilter))
    : archives;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Icon name="archive" size="lg" className="text-primary-yellow" />
            Archives Mahavelona
          </h1>
          <p className="text-gray-600 mt-1">
            Instantanés annuels des critères de la mutuelle santé (historique d'audit)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="2000"
            max="2100"
            value={anneeSnapshot}
            onChange={(e) => setAnneeSnapshot(e.target.value)}
            className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            title="Année de référence"
          />
          <button
            onClick={genererSnapshot}
            disabled={generating}
            className="px-4 py-2 bg-primary-yellow text-dark rounded-lg font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {generating ? 'Génération…' : '📸 Générer l\u2019archive'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Filtre */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <label className="text-sm text-gray-600">Filtrer par année :</label>
        <select
          value={anneeFilter}
          onChange={(e) => setAnneeFilter(e.target.value)}
          className="w-40 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow bg-white"
        >
          <option value="">Toutes les années</option>
          {anneesDisponibles.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        {anneeFilter && (
          <button onClick={() => setAnneeFilter('')} className="text-sm text-gray-500 hover:text-gray-700 underline">
            Réinitialiser
          </button>
        )}

      {/* Tableau des archives */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Année</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version critères</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membres</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Femmes leaders</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Générée le</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créée par</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-4 py-10 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow" />
                </td>
              </tr>
            ) : archivesFiltrees.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                  {anneeFilter
                    ? `Aucune archive pour l'année ${anneeFilter}.`
                    : 'Aucune archive pour le moment. Cliquez sur « Générer l\u2019archive » pour figer l\u2019état actuel des membres Mahavelona.'}
                </td>
              </tr>
            ) : (
              archivesFiltrees.map((a) => {
                const aj = a.archive_json || {};
                return (
                  <tr key={a.id} className="hover:bg-amber-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-dark">{a.annee_reference}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.criteres_version}</td>
                    <td className="px-4 py-3 text-sm font-medium text-dark">{aj.total_membres ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{aj.femmes_leaders ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(a.date_creation)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.cree_par || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetail(a)}
                        className="text-primary-yellow hover:text-yellow-600 font-medium text-sm"
                      >
                        Voir le détail
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      </div>

      {/* Modale de détail */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-primary-yellow p-5 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-dark">
                  Archive Mahavelona {detail.annee_reference}
                </h2>
                <p className="text-sm text-dark/80">Version : {detail.criteres_version}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-dark hover:text-gray-700 text-3xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase">Membres</p>
                  <p className="text-xl font-bold text-dark">{aj.total_membres ?? '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase">Femmes leaders</p>
                  <p className="text-xl font-bold text-pink-600">{aj.femmes_leaders ?? '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase">Paysans relais</p>
                  <p className="text-xl font-bold text-green-600">{aj.paysans_relais ?? '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase">Femmes</p>
                  <p className="text-xl font-bold text-dark">
                    {(aj.par_sexe || []).find((s) => s.sexe === 'F')?.total ?? 0}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-dark mb-2">Adhésions par année</h3>
                <RepartitionList
                  items={(aj.par_annee_adhesion || []).map((x) => ({ label: x.mahavelona_annee, total: x.total }))}
                />
              </div>

              <div>
                <h3 className="font-semibold text-dark mb-2">Top villages</h3>
                <RepartitionList
                  items={(aj.par_village || []).slice(0, 8).map((x) => ({ label: x.village, total: x.total }))}
                />
              </div>

              <div>
                <h3 className="font-semibold text-dark mb-2">Par commune</h3>
                <RepartitionList
                  items={(aj.par_commune || []).map((x) => ({ label: x.commune, total: x.total }))}
                />
              </div>

              <details className="bg-gray-50 rounded-lg p-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">JSON brut</summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">{JSON.stringify(aj, null, 2)}</pre>
              </details>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
              <button
                onClick={() => setDetail(null)}
                className="w-full bg-gray-200 text-gray-800 px-6 py-2.5 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchivesMahavelona;

