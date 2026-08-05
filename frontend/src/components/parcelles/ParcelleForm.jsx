import { useState, useEffect } from 'react';
import SearchableSelect from '../common/SearchableSelect';
import ParcelleDrawTool from './ParcelleDrawTool';
import Button from '../common/Button';
import Icon from '../common/Icon';

function ParcelleForm({ parcelle, producteurs, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    producteur: '',
    numero_parcelle: 1,
    localisation: '',
    latitude: '',
    longitude: '',
    dimension_ha: '',
    nombre_pieds: 0,
    annee_plantation: '',
    type_vanille: 'planifolia',
    culture_principale: 'vanille',
    cultures_pratiquees: [],
    productions_par_culture: {},
    estimation_production_kg: 0,
    cultures_autour: '',
    profil_parcelle: '',
    distance_habitation: '',
    type_propriete: 'terrain_propre',
    certifiee: false,
    type_certification: '',
    active: true,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const producteurOptions = producteurs.map(prod => ({
    value: prod.id,
    label: `${prod.code} - ${prod.nom_complet}`,
  }));
  const [showDrawTool, setShowDrawTool] = useState(false);
  const [polygonData, setPolygonData] = useState(null);


  useEffect(() => {
    if (parcelle) {
      setFormData({
        ...parcelle,
        producteur: parcelle.producteur,
        latitude: parcelle.latitude || '',
        longitude: parcelle.longitude || '',
      });
    }
  }, [parcelle]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleProducteurChange = (value) => {
    setFormData(prev => ({ ...prev, producteur: value }));
    if (errors.producteur) {
      setErrors(prev => ({ ...prev, producteur: '' }));
    }
  };

  const handleCultureToggle = (culture) => {
    setFormData(prev => {
      const cultures = prev.cultures_pratiquees || [];
      const newCultures = cultures.includes(culture)
        ? cultures.filter(c => c !== culture)
        : [...cultures, culture];
      return { ...prev, cultures_pratiquees: newCultures };
    });
  };

  const handlePolygonSave = (data) => {
    setPolygonData(data);
    setFormData(prev => ({
      ...prev,
      dimension_ha: data.area_ha, // Auto-remplir la superficie
      polygon_coordinates: data.coordinates
    }));
    setShowDrawTool(false);
    alert(`Parcelle délimitée : ${data.area_ha} Ha`);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(8),
          longitude: position.coords.longitude.toFixed(8),
        }));
        setGettingLocation(false);
        alert('Position GPS récupérée avec succès !');
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        alert('Impossible de récupérer votre position GPS');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.producteur) newErrors.producteur = 'Producteur requis';
    if (!formData.numero_parcelle) newErrors.numero_parcelle = 'Numéro requis';
    if (!formData.localisation) newErrors.localisation = 'Localisation requise';
    if (!formData.dimension_ha) newErrors.dimension_ha = 'Dimension requise';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {parcelle ? 'Modifier la parcelle' : 'Nouvelle parcelle'}
              </h2>
              {parcelle && <p className="text-green-100 text-sm mt-1">Code: {parcelle.code_parcelle}</p>}
            </div>
            <button 
              onClick={onCancel} 
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              aria-label="Fermer"
            >
              <Icon name="XMarkIcon" size="lg" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1 : Identification */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
              <Icon name="ClipboardDocumentListIcon" size="md" className="text-gray-600" />
              Identification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Producteur <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={producteurOptions}
                  value={formData.producteur}
                  onChange={handleProducteurChange}
                  placeholder="Sélectionner un producteur"
                  displayKey="label"
                  valueKey="value"
                  className={errors.producteur ? 'border-red-500' : ''}
                />
                {errors.producteur && (
                  <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                    <Icon name="ExclamationCircleIcon" size="sm" />
                    {errors.producteur}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Numéro de parcelle <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="numero_parcelle"
                  value={formData.numero_parcelle}
                  onChange={handleChange}
                  min="1"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                    errors.numero_parcelle ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="1"
                />
                {errors.numero_parcelle && (
                  <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                    <Icon name="ExclamationCircleIcon" size="sm" />
                    {errors.numero_parcelle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2 : Localisation GPS */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
              <Icon name="MapPinIcon" size="md" className="text-gray-600" />
              Localisation
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Localisation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="localisation"
                  value={formData.localisation}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                    errors.localisation ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Fokontany / Faritra"
                />
                {errors.localisation && (
                  <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                    <Icon name="ExclamationCircleIcon" size="sm" />
                    {errors.localisation}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Latitude GPS
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                    placeholder="-18.8792"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Longitude GPS
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                    placeholder="47.5079"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                loading={gettingLocation}
                variant="secondary"
                icon="MapPinIcon"
                className="w-full"
              >
                {gettingLocation ? 'Récupération en cours...' : 'Récupérer ma position actuelle'}
              </Button>

              {formData.latitude && formData.longitude && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <Icon name="CheckCircleIcon" size="md" className="text-green-600" />
                  <p className="text-sm text-green-800">
                    Coordonnées GPS enregistrées : {formData.latitude}, {formData.longitude}
                  </p>
                </div>
              )}
            </div>
            <Button
              type="button"
              onClick={() => setShowDrawTool(true)}
              variant="primary"
              icon="MapIcon"
              className="w-full mt-4 bg-green-600 hover:bg-green-700 focus:ring-green-500"
            >
              Délimiter la parcelle sur la carte
            </Button>
      
            {polygonData && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <Icon name="CheckCircleIcon" size="md" className="text-green-600" />
                <p className="text-sm text-green-800">
                  Parcelle délimitée : <strong>{polygonData.area_ha} Ha</strong> ({polygonData.coordinates.length} points)
                </p>
              </div>
            )}
          </div>

          {/* Section 3 : Dimensions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
              <Icon name="Square3Stack3DIcon" size="md" className="text-gray-600" />
              Dimensions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Superficie (Ha) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  name="dimension_ha"
                  value={formData.dimension_ha}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all ${
                    errors.dimension_ha ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="0.5"
                />
                {errors.dimension_ha && (
                  <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                    <Icon name="ExclamationCircleIcon" size="sm" />
                    {errors.dimension_ha}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de pieds</label>
                <input
                  type="number"
                  name="nombre_pieds"
                  value={formData.nombre_pieds}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Année de plantation</label>
                <input
                  type="number"
                  name="annee_plantation"
                  value={formData.annee_plantation}
                  onChange={handleChange}
                  min="1900"
                  max="2100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                  placeholder="2020"
                />
              </div>
            </div>
          </div>

          {/* Section 4 : Culture */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
              <Icon name="SparklesIcon" size="md" className="text-gray-600" />
              Culture
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de vanille</label>
                <select
                  name="type_vanille"
                  value={formData.type_vanille}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                >
                  <option value="planifolia">Planifolia</option>
                  <option value="tahitensis">Tahitensis</option>
                  <option value="pompona">Pompona</option>
                </select>
              </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Culture principale</label>
            <select
              name="culture_principale"
              value={formData.culture_principale}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
            >
              <option value="vanille">Vanille</option>
              <option value="cafe">Café</option>
              <option value="girofle">Girofle</option>
              <option value="autre">Autre</option>
            </select>
          </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cultures pratiquées sur la parcelle</label>
                <div className="flex flex-wrap gap-4">
                  {['vanille', 'cafe', 'girofle', 'autre'].map(culture => (
                    <label key={culture} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={(formData.cultures_pratiquees || []).includes(culture)}
                        onChange={() => handleCultureToggle(culture)}
                        className="w-4 h-4 text-chick-yellow focus:ring-chick-yellow border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {culture === 'vanille' ? 'Vanille' :
                         culture === 'cafe' ? 'Café' :
                         culture === 'girofle' ? 'Girofle' : 'Autre'}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Cochez toutes les cultures présentes sur cette parcelle</p>
              </div>

              {/* Productions par culture */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Icon name="ChartBarIcon" size="sm" className="text-gray-600" />
                  Productions par culture (kg)
                </label>
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                  {formData.cultures_pratiquees && formData.cultures_pratiquees.length > 0 ? (
                    formData.cultures_pratiquees.map(culture => (
                      <div key={culture} className="flex items-center gap-3">
                        <span className="text-lg">
                          {culture === 'vanille' ? '🌿' : 
                           culture === 'cafe' ? '☕' :
                           culture === 'girofle' ? '🌺' : '🌾'}
                        </span>
                        <label className="text-sm font-medium text-gray-700 capitalize w-24">
                          {culture}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.productions_par_culture[culture] || ''}
                          onChange={(e) => {
                            const newProductions = { ...formData.productions_par_culture };
                            if (e.target.value) {
                              newProductions[culture] = parseFloat(e.target.value);
                            } else {
                              delete newProductions[culture];
                            }
                            setFormData({ ...formData, productions_par_culture: newProductions });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                          placeholder="Ex: 150.5"
                        />
                        <span className="text-sm text-gray-600">kg</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Sélectionnez d'abord les cultures pratiquées ci-dessus
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Le total sera calculé automatiquement
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Estimation production totale (kg)
                  <span className="text-xs text-gray-500 ml-2">(calculée automatiquement)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="estimation_production_kg"
                  value={
                    Object.keys(formData.productions_par_culture || {}).length > 0
                      ? Object.values(formData.productions_par_culture).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)
                      : formData.estimation_production_kg
                  }
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all bg-gray-50"
                  placeholder="50"
                  disabled={Object.keys(formData.productions_par_culture || {}).length > 0}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cultures autour</label>
                <textarea
                  name="cultures_autour"
                  value={formData.cultures_autour}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                  placeholder="Café, Girofle, Arbres fruitiers..."
                />
              </div>
            </div>
          </div>

          {/* Section 5 : Certification */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center gap-2">
              <Icon name="CheckBadgeIcon" size="md" className="text-gray-600" />
              Certification
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  name="certifiee"
                  checked={formData.certifiee}
                  onChange={handleChange}
                  className="w-4 h-4 text-chick-yellow focus:ring-chick-yellow border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Parcelle certifiée
                </span>
              </label>

              {formData.certifiee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de certification</label>
                  <select
                    name="type_certification"
                    value={formData.type_certification}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow focus:border-transparent transition-all"
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="g4g">G4G</option>
                    <option value="ra">Rainforest Alliance</option>
                    <option value="uebt">UEBT</option>
                    <option value="ffl">FFL</option>
                    <option value="ft">Fair Trade</option>
                    <option value="bio">BIO</option>
                    <option value="pact">PACT</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 6 : Statut */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
                className="w-4 h-4 text-chick-yellow focus:ring-chick-yellow border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Parcelle active
              </span>
            </label>
          </div>
          {showDrawTool && (
            <ParcelleDrawTool
              initialPolygon={parcelle?.polygon_coordinates || null}
              initialCenter={
              formData.latitude && formData.longitude
              ? [parseFloat(formData.latitude), parseFloat(formData.longitude)]
              : null
              }
              onSave={handlePolygonSave}
              onCancel={() => setShowDrawTool(false)}
            />
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t flex-shrink-0">
          <Button
            type="button"
            onClick={onCancel}
            disabled={loading}
            variant="secondary"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
            variant="primary"
            icon={loading ? undefined : "CheckIcon"}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            {loading ? 'Enregistrement...' : (parcelle ? 'Mettre à jour' : 'Créer')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ParcelleForm;
