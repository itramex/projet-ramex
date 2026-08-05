import { useState } from 'react';
import { dashboardService } from '../../services/api';

function VillagesModal({ open, onClose }) {
  const [name, setName] = useState('');
  const [commune, setCommune] = useState('');
  const [fokontany, setFokontany] = useState('');
  const [file, setFile] = useState(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const resetMessages = () => {
    setMessage('');
    setError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!name.trim()) {
      setError('Le nom du village est requis.');
      return;
    }
    setLoadingCreate(true);
    try {
      await dashboardService.createVillage({ name: name.trim(), commune: commune.trim() || null, fokontany: fokontany.trim() || null });
      setMessage('Village ajouté avec succès.');
      setName('');
      setCommune('');
      setFokontany('');
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible d'ajouter le village pour le moment.");
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!file) {
      setError('Veuillez sélectionner un fichier Excel (.xlsx ou .xls).');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setLoadingImport(true);
    try {
      await dashboardService.importVillagesExcel(formData);
      setMessage('Import des villages lancé avec succès.');
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Import non disponible pour le moment.");
    } finally {
      setLoadingImport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-dark">Gestion des Villages</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Fermer">✕</button>
        </div>

        {(message || error) && (
          <div className={`mx-6 mt-4 px-4 py-3 rounded ${message ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message || error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <h4 className="font-semibold text-gray-800">Ajouter un village</h4>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nom du village</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow"
                placeholder="Ex: Ambodimanga"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Commune (optionnel)</label>
              <input
                type="text"
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow"
                placeholder="Ex: Mananara"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fokontany (optionnel)</label>
              <input
                type="text"
                value={fokontany}
                onChange={(e) => setFokontany(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-chick-yellow"
                placeholder="Ex: Ambalavola"
              />
            </div>
            <button
              type="submit"
              disabled={loadingCreate}
              className="px-4 py-2 bg-primary-yellow text-dark rounded-md hover:bg-yellow-500 disabled:opacity-50"
            >
              {loadingCreate ? 'Ajout...' : 'Ajouter'}
            </button>
          </form>

          <form onSubmit={handleImport} className="space-y-4">
            <h4 className="font-semibold text-gray-800">Importer depuis Excel</h4>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fichier Excel (.xlsx ou .xls)</label>
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full"
              />
            </div>
            <button
              type="submit"
              disabled={loadingImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingImport ? 'Import...' : 'Importer'}
            </button>
            <p className="text-xs text-gray-500">Le fichier doit contenir une colonne "village" et optionnellement "commune" et "fokontany".</p>
          </form>
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default VillagesModal;
