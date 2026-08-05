import { useState, useEffect } from 'react';

const ExportPersonnalise = ({ isOpen, onClose, service, entityName, colorScheme = 'green' }) => {
  const [fieldGroups, setFieldGroups] = useState({});
  const [selectedFields, setSelectedFields] = useState([]);
  const [exportFormat, setExportFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectAllGroups, setSelectAllGroups] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadAvailableFields();
    }
  }, [isOpen]);

  const loadAvailableFields = async () => {
    try {
      setLoading(true);
      const response = await service.getAvailableFields();
      setFieldGroups(response.data);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement des champs:', err);
      setError('Impossible de charger les champs disponibles');
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (fieldName) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldName)) {
        return prev.filter(f => f !== fieldName);
      } else {
        return [...prev, fieldName];
      }
    });
  };

  const toggleGroupSelection = (groupKey) => {
    const group = fieldGroups[groupKey];
    const groupFields = Object.keys(group.fields);
    const allSelected = groupFields.every(field => selectedFields.includes(field));

    if (allSelected) {
      // Désélectionner tous les champs du groupe
      setSelectedFields(prev => prev.filter(f => !groupFields.includes(f)));
      setSelectAllGroups(prev => ({ ...prev, [groupKey]: false }));
    } else {
      // Sélectionner tous les champs du groupe
      setSelectedFields(prev => {
        const newFields = [...prev];
        groupFields.forEach(field => {
          if (!newFields.includes(field)) {
            newFields.push(field);
          }
        });
        return newFields;
      });
      setSelectAllGroups(prev => ({ ...prev, [groupKey]: true }));
    }
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      setError('Veuillez sélectionner au moins un champ');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await service.exportCustom({
        fields: selectedFields,
        format: exportFormat
      });

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const extension = exportFormat === 'excel' ? 'xlsx' : 'csv';
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `${entityName}_${timestamp}.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Fermer le modal après succès
      onClose();
    } catch (err) {
      console.error('Erreur lors de l\'export:', err);
      setError('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const resetSelection = () => {
    setSelectedFields([]);
    setSelectAllGroups({});
  };

  if (!isOpen) return null;

  const colorClasses = {
    green: {
      header: 'bg-gradient-to-r from-green-600 to-green-700',
      button: 'bg-green-600 hover:bg-green-700',
      groupAll: 'bg-green-600 text-white hover:bg-green-700',
      groupSome: 'bg-green-100 text-green-700 hover:bg-green-200',
      checkbox: 'text-green-600 focus:ring-green-500'
    },
    blue: {
      header: 'bg-gradient-to-r from-blue-600 to-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700',
      groupAll: 'bg-blue-600 text-white hover:bg-blue-700',
      groupSome: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      checkbox: 'text-blue-600 focus:ring-blue-500'
    }
  };

  const colors = colorClasses[colorScheme] || colorClasses.green;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`${colors.header} text-white p-6`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Extraction Personnalisée</h2>
              <p className="text-green-100 mt-1">
                {entityName} - Sélectionnez les champs à exporter ({selectedFields.length} champs sélectionnés)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading && !Object.keys(fieldGroups).length ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              <p className="mt-4 text-gray-600">Chargement des champs...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(fieldGroups).map(([groupKey, group]) => {
                const groupFields = Object.keys(group.fields);
                const allSelected = groupFields.every(field => selectedFields.includes(field));
                const someSelected = groupFields.some(field => selectedFields.includes(field));

                return (
                  <div key={groupKey} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Group Header */}
                    <div className="bg-gray-50 p-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">{group.label}</h3>
                        <button
                          onClick={() => toggleGroupSelection(groupKey)}
                          className={`text-sm px-3 py-1 rounded transition-colors ${
                            allSelected
                              ? colors.groupAll
                              : someSelected
                              ? colors.groupSome
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                      </div>
                    </div>

                    {/* Fields */}
                    <div className="p-3 space-y-2">
                      {Object.entries(group.fields).map(([fieldKey, field]) => (
                        <label
                          key={fieldKey}
                          className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(fieldKey)}
                            onChange={() => toggleField(fieldKey)}
                            className={`mt-1 h-4 w-4 ${colors.checkbox} border-gray-300 rounded`}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{field.label}</div>
                            <div className="text-xs text-gray-500">{field.type}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Format:</span>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                </select>
              </label>

              <button
                onClick={resetSelection}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleExport}
                disabled={loading || selectedFields.length === 0}
                className={`px-6 py-2 text-sm font-medium text-white ${colors.button} rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Export en cours...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exporter
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPersonnalise;
