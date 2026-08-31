import { useEffect, useMemo, useRef, useState } from 'react';
import { dashboardService } from '../../services/api';
import Icon from '../common/Icon';

/**
 * Référentiel des villages de référence (utilisés par les formulaires
 * Producteur / Coopérative / Bon de collecte pour l'auto-complétion
 * commune + fokontany), avec ajout manuel et import Excel en masse.
 */
function VillagesReference() {
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Ajout manuel
  const [nouveau, setNouveau] = useState({ name: '', commune: '', fokontany: '' });
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);

  // Import Excel
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const loadVillages = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardService.getVillageReferences();
      setVillages(res.data || []);
    } catch (err) {
      console.error('Erreur chargement villages:', err);
      setError('Erreur lors du chargement des villages de référence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVillages();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return villages;
    return villages.filter((v) =>
      `${v.name || ''} ${v.commune || ''} ${v.fokontany || ''}`.toLowerCase().includes(term)
    );
  }, [villages, search]);

  const stats = useMemo(() => ({
    total: villages.length,
    avecCommune: villages.filter((v) => v.commune).length,
    avecFokontany: villages.filter((v) => v.fokontany).length,
  }), [villages]);

  const ajouterVillage = async (e) => {
    e.preventDefault();
    if (!nouveau.name.trim()) return;
    setAdding(true);
    setMessage(null);
    try {
      const res = await dashboardService.createVillage(nouveau);
      setMessage({
        type: 'success',
        text: res.data.created
          ? `Village « ${res.data.name} » ajouté.`
          : `Ce village existait déjà (aucun doublon créé).`,
      });
      setNouveau({ name: '', commune: '', fokontany: '' });
      await loadVillages();
    } catch (err) {
      console.error('Erreur ajout village:', err);
      setMessage({ type: 'error', text: err.response?.data?.detail || "Erreur lors de l'ajout." });
    } finally {
      setAdding(false);
    }
  };

  const importerExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await dashboardService.importVillagesExcel(formData);
      setImportResult(res.data);
      await loadVillages();
    } catch (err) {
      console.error('Erreur import:', err);
      setImportResult({ error: err.response?.data?.detail || 'Fichier invalide ou erreur serveur.' });
    } finally {
      setImporting(false);
    }
  };
return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Icon name="villages" size="lg" className="text-primary-yellow" />
            Villages de référence
          </h1>
          <p className="text-gray-600 mt-1">
            Référentiel utilisé pour l'auto-complétion commune/fokontany des formulaires
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={importerExcel}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            title="Colonnes attendues : village (ou name), commune, fokontany"
          >
            {importing ? 'Import en cours…' : '📥 Importer Excel'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Résultat de l'import */}
      {importResult && (
        <div className={`mb-4 p-4 rounded-lg border text-sm ${importResult.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800'}`}>
          {importResult.error ? (
            <p><strong>Échec de l'import :</strong> {importResult.error}</p>
          ) : (
            <p>
              ✅ Import terminé : <strong>{importResult.created}</strong> village(s) créé(s),
              {' '}<strong>{importResult.skipped}</strong> ignoré(s) (doublons ou lignes vides)
              sur <strong>{importResult.total_rows}</strong> ligne(s) lues.
            </p>
          )}
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500 uppercase">Total villages</p>
          <p className="text-2xl font-bold text-dark">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500 uppercase">Avec commune</p>
          <p className="text-2xl font-bold text-blue-600">{stats.avecCommune}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500 uppercase">Avec fokontany</p>
          <p className="text-2xl font-bold text-green-600">{stats.avecFokontany}</p>
        </div>
      </div>
{/* Ajout manuel + recherche */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <form onSubmit={ajouterVillage} className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-44">
            <label className="block text-xs text-gray-500 mb-1">Village *</label>
            <input
              type="text"
              value={nouveau.name}
              onChange={(e) => setNouveau({ ...nouveau, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
              required
            />
          </div>
          <div className="flex-1 min-w-44">
            <label className="block text-xs text-gray-500 mb-1">Commune</label>
            <input
              type="text"
              value={nouveau.commune}
              onChange={(e) => setNouveau({ ...nouveau, commune: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            />
          </div>
          <div className="flex-1 min-w-44">
            <label className="block text-xs text-gray-500 mb-1">Fokontany</label>
            <input
              type="text"
              value={nouveau.fokontany}
              onChange={(e) => setNouveau({ ...nouveau, fokontany: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 bg-primary-yellow text-dark rounded-lg font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {adding ? 'Ajout…' : '＋ Ajouter'}
          </button>
        </form>

        <div className="relative">
          <Icon name="search" size="sm" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un village, une commune, un fokontany…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Village</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commune</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fokontany</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="3" className="px-4 py-10 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-4 py-10 text-center text-gray-500">
                  {villages.length === 0
                    ? 'Aucun village de référence. Ajoutez-en ou importez un fichier Excel.'
                    : 'Aucun résultat pour cette recherche.'}
                </td>
              </tr>
            ) : (
              filtered.slice(0, 200).map((v, idx) => (
                <tr key={v.id ?? idx} className="hover:bg-amber-50 transition-colors">
                  <td className="px-4 py-2.5 text-sm font-medium text-dark">{v.name}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{v.commune || '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{v.fokontany || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <p className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100">
            200 premiers affichés sur {filtered.length} — affinez la recherche.
          </p>
        )}
      </div>
    </div>
  );
}

export default VillagesReference;