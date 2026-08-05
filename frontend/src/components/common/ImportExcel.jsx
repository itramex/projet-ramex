import { useState, useRef } from 'react';
import { producteurService } from '../../services/api';

function ImportExcel({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // ✅ États pour le déplacement de la fenêtre
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);

  // ✅ Gestion du drag de fichier
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      alert('Format de fichier invalide. Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      return;
    }

    setFile(selectedFile);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    setResult(null);

    try {

      const formData = new FormData();
      formData.append('file', file);

      const response = await producteurService.importMultiSheet(formData);
      setResult(response.data);

      if (response.data.producteurs_created > 0 || response.data.parcelles_created > 0 || 
          response.data.formations_created > 0 || response.data.certifications_created > 0) {
        setTimeout(() => {
          onSuccess();
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      console.error('❌ Détails:', error.response?.data);
      alert('Erreur lors de l\'import: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Gestion du déplacement de la fenêtre
  const handleMouseDownHeader = (e) => {
    if (e.target.closest('button')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 0);

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4"
        style={{
          position: 'relative',
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* ✅ Header draggable avec curseur grab */}
        <div 
          className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDownHeader}
        >
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            📊 Import Excel
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none hover:bg-gray-100 dark:hover:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ✅ Contenu avec scroll si nécessaire */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Importez des producteurs avec leurs parcelles en masse depuis un fichier Excel
          </p>

          {/* Zone de drop */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
              dragActive
                ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="text-green-600 dark:text-green-400">
                <div className="text-6xl mb-4">📄</div>
                <p className="font-semibold mb-2">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="mt-3 text-sm text-red-600 hover:text-red-800"
                >
                  ✕ Supprimer
                </button>
              </div>
            ) : (
              <>
                <div className="text-6xl mb-4">📁</div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Glissez-déposez votre fichier Excel ici
                </p>
                <p className="text-sm text-gray-500 mb-4">ou</p>
                <label className="cursor-pointer inline-block bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg hover:bg-yellow-500 transition-colors font-semibold">
                  Parcourir les fichiers
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-4">
                  Formats acceptés: .xlsx, .xls
                </p>
              </>
            )}
          </div>

          {/* Résultat */}
          {result && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center">
                ✅ Import réussi !
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white dark:bg-gray-800 p-3 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Producteurs créés</p>
                  <p className="text-2xl font-bold text-green-600">{result.producteurs_created}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Producteurs mis à jour</p>
                  <p className="text-2xl font-bold text-blue-600">{result.producteurs_updated}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Parcelles créées</p>
                  <p className="text-2xl font-bold text-green-600">{result.parcelles_created}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Parcelles mises à jour</p>
                  <p className="text-2xl font-bold text-blue-600">{result.parcelles_updated}</p>
                </div>
                {result.formations_created !== undefined && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded">
                    <p className="text-gray-600 dark:text-gray-400">Formations créées</p>
                    <p className="text-2xl font-bold text-green-600">{result.formations_created}</p>
                  </div>
                )}
                {result.certifications_created !== undefined && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded">
                    <p className="text-gray-600 dark:text-gray-400">Certifications créées</p>
                    <p className="text-2xl font-bold text-green-600">{result.certifications_created}</p>
                  </div>
                )}
              </div>
              {result.errors_count > 0 && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <p className="text-orange-800 dark:text-orange-200 font-semibold mb-2">
                    ⚠️ {result.errors_count} erreur(s) détectée(s)
                  </p>
                  <div className="max-h-32 overflow-y-auto text-xs">
                    {result.errors?.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="mb-1 text-gray-700 dark:text-gray-300">
                        Ligne {err.ligne}: {err.erreur}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ Footer avec boutons toujours visibles */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 rounded-b-lg">
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                !file || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Import en cours...
                </span>
              ) : (
                '🚀 Lancer l\'import'
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportExcel;
