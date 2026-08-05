import React, { useState } from 'react';
import { Download, X, FileSpreadsheet } from 'lucide-react';
import api from '../../services/api';

/**
 * ExportHistoryButton Component
 * 
 * Provides a button to export history data to Excel with configurable options.
 * Opens a modal for selecting export parameters.
 * 
 * Requirements: 8.1, 8.3, 8.4
 */
const ExportHistoryButton = ({ 
  defaultDataType = 'all',
  defaultFilters = {},
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [dataType, setDataType] = useState(defaultDataType);
  const [anneeDebut, setAnneeDebut] = useState(new Date().getFullYear() - 5);
  const [anneeFin, setAnneeFin] = useState(new Date().getFullYear());
  const [includeCharts, setIncludeCharts] = useState(false);
  
  // Filters
  const [cooperative, setCooperative] = useState(defaultFilters.cooperative || '');
  const [village, setVillage] = useState(defaultFilters.village || '');
  const [producteur, setProducteur] = useState(defaultFilters.producteur || '');
  const [parcelle, setParcelle] = useState(defaultFilters.parcelle || '');
  const [culture, setCulture] = useState(defaultFilters.culture || '');
  const [typeAgr, setTypeAgr] = useState(defaultFilters.type_agr || '');
  const [typeIndicateur, setTypeIndicateur] = useState(defaultFilters.type_indicateur || '');
  
  const handleExport = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        data_type: dataType,
        annee_debut: anneeDebut,
        annee_fin: anneeFin,
        include_charts: includeCharts
      });
      
      // Add filters if provided
      if (cooperative) params.append('cooperative', cooperative);
      if (village) params.append('village', village);
      if (producteur) params.append('producteur', producteur);
      if (parcelle) params.append('parcelle', parcelle);
      if (culture) params.append('culture', culture);
      if (typeAgr) params.append('type_agr', typeAgr);
      if (typeIndicateur) params.append('type_indicateur', typeIndicateur);
      
      // Call API
      const response = await api.get(`/api/history/export/export/?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historique_${dataType}_${anneeDebut}_${anneeFin}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Close modal on success
      setIsModalOpen(false);
      
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      {/* Export Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${className}`}
        aria-label="Exporter les données"
      >
        <FileSpreadsheet className="w-5 h-5 mr-2" />
        Exporter
      </button>
      
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                Exporter les données historiques
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              
              {/* Data Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de données
                </label>
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Toutes les données</option>
                  <option value="production">Productions uniquement</option>
                  <option value="agr">AGR uniquement</option>
                  <option value="social">Indicateurs sociaux uniquement</option>
                </select>
              </div>
              
              {/* Period Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Année de début
                  </label>
                  <input
                    type="number"
                    value={anneeDebut}
                    onChange={(e) => setAnneeDebut(parseInt(e.target.value))}
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Année de fin
                  </label>
                  <input
                    type="number"
                    value={anneeFin}
                    onChange={(e) => setAnneeFin(parseInt(e.target.value))}
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Filters Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Filtres (optionnels)
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coopérative
                    </label>
                    <input
                      type="text"
                      value={cooperative}
                      onChange={(e) => setCooperative(e.target.value)}
                      placeholder="ID de la coopérative"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Village
                    </label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="Nom du village"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Producteur
                    </label>
                    <input
                      type="text"
                      value={producteur}
                      onChange={(e) => setProducteur(e.target.value)}
                      placeholder="ID du producteur"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parcelle
                    </label>
                    <input
                      type="text"
                      value={parcelle}
                      onChange={(e) => setParcelle(e.target.value)}
                      placeholder="ID de la parcelle"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {(dataType === 'production' || dataType === 'all') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Culture
                      </label>
                      <input
                        type="text"
                        value={culture}
                        onChange={(e) => setCulture(e.target.value)}
                        placeholder="Type de culture"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                  
                  {(dataType === 'agr' || dataType === 'all') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type AGR
                      </label>
                      <input
                        type="text"
                        value={typeAgr}
                        onChange={(e) => setTypeAgr(e.target.value)}
                        placeholder="Type d'AGR"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                  
                  {(dataType === 'social' || dataType === 'all') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type d'indicateur
                      </label>
                      <select
                        value={typeIndicateur}
                        onChange={(e) => setTypeIndicateur(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Tous</option>
                        <option value="scolarisation">Scolarisation</option>
                        <option value="eau_potable">Eau potable</option>
                        <option value="sante">Santé</option>
                        <option value="habitat">Habitat</option>
                        <option value="energie">Énergie</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Format Options */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Options de format
                </h3>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeCharts"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="includeCharts" className="ml-2 text-sm text-gray-700">
                    Inclure les graphiques (augmente le temps de génération)
                  </label>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Exporter
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportHistoryButton;
