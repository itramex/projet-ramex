import { useState, useEffect, useMemo } from 'react';
import SearchableSelect from './SearchableSelect';
import { dashboardService } from '../../services/api';

/**
 * Composant de sélection de village avec auto-complétion des informations
 * Charge les villages depuis VillageReference et remplit automatiquement
 * les champs commune, fokontany et région
 */
function VillageSelector({
  value,
  onChange,
  onVillageDataChange,
  className = '',
  disabled = false,
  error = null
}) {
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVillages();
  }, []);

  const loadVillages = async () => {
    try {
      const response = await dashboardService.getVillageReferences();
      setVillages(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des villages:', error);
      setVillages([]);
    } finally {
      setLoading(false);
    }
  };

  // Préparer les options pour SearchableSelect
  const villageOptions = useMemo(() => {
    return villages.map(village => ({
      value: village.name,
      label: village.display_name,
      data: village // Stocker toutes les données du village
    }));
  }, [villages]);

  const handleVillageChange = (selectedValue) => {
    onChange(selectedValue);
    
    // Trouver le village sélectionné et notifier le parent avec toutes les données
    if (selectedValue && onVillageDataChange) {
      const selectedVillage = villages.find(v => v.name === selectedValue);
      if (selectedVillage) {
        onVillageDataChange({
          village: selectedVillage.name,
          commune: selectedVillage.commune || '',
          fokontany: selectedVillage.fokontany || '',
          region: selectedVillage.region || ''
        });
      }
    } else if (!selectedValue && onVillageDataChange) {
      // Si on efface la sélection, vider les champs
      onVillageDataChange({
        village: '',
        commune: '',
        fokontany: '',
        region: ''
      });
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
          Chargement des villages...
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <SearchableSelect
        options={villageOptions}
        value={value}
        onChange={handleVillageChange}
        placeholder="Sélectionner un village"
        displayKey="label"
        valueKey="value"
        multiple={false}
        disabled={disabled}
      />
      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}
      {!loading && villages.length === 0 && (
        <p className="text-orange-600 text-xs mt-1">
          Aucun village de référence disponible. Contactez l'administrateur.
        </p>
      )}
    </div>
  );
}

export default VillageSelector;
