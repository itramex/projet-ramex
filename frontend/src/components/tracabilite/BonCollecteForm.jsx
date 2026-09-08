import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tracabiliteService, producteurService, cooperativeService } from '../../services/api';
import Button from '../common/Button';
import Icon from '../common/Icon';
import VillageSelector from '../common/VillageSelector';
import { iconMap } from '../../styles/icons';

function BonCollecteForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campagnes, setCampagnes] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [, setCooperatives] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    numero_fabc: '',
    campagne: '',
    producteur: '',
    cooperative: '',
    est_vente_groupee: false,
    producteurs_groupes: [],
    date_marche: '',
    village_marche: '',
    commune: '',
    fokontany: '',
    type_produit: 'vanille_verte',
    certification: ['g4g'],
    poids_total_livre: '',
    poids_accepte: '',
    poids_retour: 0,
    prix_unitaire_marche: '',
    montant_premium: 0,
    mode_paiement: 'especes',
    montant_avances_anterieures: 0,
    remboursement_par_vanille: 0,
    remboursement_especes: 0
  });

  const [sacs, setSacs] = useState([
    { numero_sac: 1, poids_brut: '', tare: '', poids_net: '' }
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [campagnesRes, producteursRes, cooperativesRes] = await Promise.all([
        tracabiliteService.getCampagnes(),
        producteurService.getAllForDropdown(),
        cooperativeService.getAll()
      ]);

      setCampagnes(campagnesRes.data.results || campagnesRes.data);
      setProducteurs(producteursRes.data.results || producteursRes.data);
      setCooperatives(cooperativesRes.data.results || cooperativesRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked, options, multiple } = e.target;
    let nextValue = type === 'checkbox' ? checked : value;
    if (multiple && options) {
      nextValue = Array.from(options).filter(option => option.selected).map(option => option.value);
    }

    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: nextValue
      };
      if (name === 'producteur') {
        const selectedProducteur = producteurs.find((p) => String(p.id) === String(nextValue));
        if (selectedProducteur) {
          updated.village_marche = selectedProducteur.village || updated.village_marche;
          updated.commune = selectedProducteur.commune || updated.commune;
          updated.fokontany = selectedProducteur.fokontany || updated.fokontany;
        }
      }
      return updated;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleVillageDataChange = (villageData) => {
    setFormData(prev => ({
      ...prev,
      village_marche: villageData.village,
      commune: villageData.commune,
      fokontany: villageData.fokontany
    }));
    // Clear errors for location fields
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.village_marche;
      delete newErrors.commune;
      delete newErrors.fokontany;
      return newErrors;
    });
  };

  const handleSacChange = (index, field, value) => {
    const newSacs = [...sacs];
    newSacs[index][field] = value;

    // Calcul automatique du poids net
    if (field === 'poids_brut' || field === 'tare') {
      const brut = parseFloat(newSacs[index].poids_brut) || 0;
      const tare = parseFloat(newSacs[index].tare) || 0;
      newSacs[index].poids_net = (brut - tare).toFixed(3);
    }

    setSacs(newSacs);
  };

  const addSac = () => {
    setSacs([...sacs, {
      numero_sac: sacs.length + 1,
      poids_brut: '',
      tare: '',
      poids_net: ''
    }]);
  };

  const removeSac = (index) => {
    if (sacs.length > 1) {
      setSacs(sacs.filter((_, i) => i !== index));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.numero_fabc) newErrors.numero_fabc = 'N° FABC requis';
    if (!formData.campagne) newErrors.campagne = 'Campagne requise';
    if (!formData.producteur) newErrors.producteur = 'Producteur requis';
    if (!formData.date_marche) newErrors.date_marche = 'Date requise';
    if (!formData.poids_accepte) newErrors.poids_accepte = 'Poids accepté requis';
    if (!formData.prix_unitaire_marche) newErrors.prix_unitaire_marche = 'Prix requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      // Calculer le montant total d'achat
      const montantTotal = (parseFloat(formData.poids_accepte) || 0) * (parseFloat(formData.prix_unitaire_marche) || 0);

      // Préparer les données
      const data = {
        ...formData,
        montant_total_achat: montantTotal,
        details_sacs: sacs.map(sac => ({
          numero_sac: sac.numero_sac,
          poids_brut: parseFloat(sac.poids_brut) || 0,
          tare: parseFloat(sac.tare) || 0,
          poids_net: parseFloat(sac.poids_net) || 0
        }))
      };

      await tracabiliteService.createBonCollecte(data);
      alert('✅ Bon de collecte créé avec succès !');
      navigate('/tracabilite/bons-collecte');
    } catch (error) {
      console.error('Erreur création:', error);
      console.error('Error response data:', error.response?.data);

      if (error.response?.data) {
        setErrors(error.response.data);
        // Show detailed error message
        const errorMessages = Object.entries(error.response.data)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        alert(`❌ Erreur de validation:\n\n${errorMessages}`);
      } else {
        alert('❌ Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
            <Icon name={iconMap.bonCollecte} size="xl" />
            Nouveau Bon de Collecte (FABC)
          </h1>
          <p className="text-gray-600">
            Facture Producteur / Bon de Collecte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identification */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-dark mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Icon name="IdentificationIcon" size="lg" />
              Identification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  N° FABC *
                </label>
                <input
                  type="text"
                  name="numero_fabc"
                  value={formData.numero_fabc}
                  onChange={handleChange}
                  placeholder="5001"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow ${errors.numero_fabc ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-800`}
                />
                {errors.numero_fabc && (
                  <p className="text-red-500 text-sm mt-1">{errors.numero_fabc}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campagne *
                </label>
                <select
                  name="campagne"
                  value={formData.campagne}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow ${errors.campagne ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-800`}
                >
                  <option value="">Sélectionner</option>
                  {campagnes.map((c) => (
                    <option key={c.id} value={c.id}>{c.code}</option>
                  ))}
                </select>
                {errors.campagne && (
                  <p className="text-red-500 text-sm mt-1">{errors.campagne}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date du marché *
                </label>
                <input
                  type="date"
                  name="date_marche"
                  value={formData.date_marche}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow ${errors.date_marche ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-800`}
                />
                {errors.date_marche && (
                  <p className="text-red-500 text-sm mt-1">{errors.date_marche}</p>
                )}
              </div>
            </div>
          </div>

          {/* Producteur */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-dark mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Icon name="UserIcon" size="lg" />
              Producteur
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Producteur *
                </label>
                <select
                  name="producteur"
                  value={formData.producteur}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow ${errors.producteur ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-800`}
                >
                  <option value="">Sélectionner un producteur</option>
                  {producteurs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.nom} {p.prenom}
                    </option>
                  ))}
                </select>
                {errors.producteur && (
                  <p className="text-red-500 text-sm mt-1">{errors.producteur}</p>
                )}
              </div>

            </div>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="est_vente_groupee"
                name="est_vente_groupee"
                checked={formData.est_vente_groupee}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <label htmlFor="est_vente_groupee" className="text-sm text-gray-700">
                Vente groupée (plusieurs producteurs)
              </label>
            </div>
          </div>

          {/* Localisation */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-dark mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Icon name="MapPinIcon" size="lg" />
              Localisation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Village du marché
                </label>
                <VillageSelector
                  value={formData.village_marche}
                  onChange={(value) => handleChange({ target: { name: 'village_marche', value } })}
                  onVillageDataChange={handleVillageDataChange}
                  error={errors.village_marche}
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Sélectionnez le village pour remplir automatiquement commune et fokontany
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commune
                </label>
                <input
                  type="text"
                  name="commune"
                  value={formData.commune}
                  onChange={handleChange}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-800"
                  placeholder="Auto-rempli depuis le village"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fokontany
                </label>
                <input
                  type="text"
                  name="fokontany"
                  value={formData.fokontany}
                  onChange={handleChange}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-800"
                  placeholder="Auto-rempli depuis le village"
                />
              </div>
            </div>
          </div>

          {/* Produit */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-dark mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Icon name="CubeIcon" size="lg" />
              Produit
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de produit
                </label>
                <select
                  name="type_produit"
                  value={formData.type_produit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                >
                  <option value="vanille_verte">Vanille Verte</option>
                  <option value="vanille_vrac">Vanille Vrac</option>
                  <option value="cafe">Café</option>
                  <option value="girofle">Girofle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certification
                </label>
                <select
                  name="certification"
                  multiple
                  value={formData.certification}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 min-h-[110px]"
                >
                  <option value="g4g">G4G (Good 4 Good)</option>
                  <option value="bio">BIO</option>
                  <option value="ra">RA (Rainforest Alliance)</option>
                  <option value="ffl">FFL (Fair for Life)</option>
                  <option value="rauet">RAUET</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Ctrl/Cmd + clic pour sélection multiple.</p>
              </div>
            </div>
          </div>

          {/* Poids et sacs */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
              <Icon name="ScaleIcon" size="lg" />
              Détail des sacs
            </h2>

            <div className="mb-4">
              <Button
                type="button"
                variant="secondary"
                icon="PlusIcon"
                onClick={addSac}
              >
                Ajouter un sac
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 text-gray-300">N° Sac</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 text-gray-300">Poids brut (kg)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 text-gray-300">Tare (kg)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 text-gray-300">Poids net (kg)</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sacs.map((sac, index) => (
                    <tr key={index} className="border-t border-gray-200 border-gray-700">
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={sac.numero_sac}
                          onChange={(e) => handleSacChange(index, 'numero_sac', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded bg-white text-gray-800"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.001"
                          value={sac.poids_brut}
                          onChange={(e) => handleSacChange(index, 'poids_brut', e.target.value)}
                          className="w-32 px-2 py-1 border border-gray-300 rounded bg-white text-gray-800"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.001"
                          value={sac.tare}
                          onChange={(e) => handleSacChange(index, 'tare', e.target.value)}
                          className="w-32 px-2 py-1 border border-gray-300 rounded bg-white text-gray-800"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.001"
                          value={sac.poids_net}
                          readOnly
                          className="w-32 px-2 py-1 border border-gray-300 rounded bg-gray-100 bg-gray-600 text-dark"
                        />
                      </td>
                      <td className="px-4 py-2">
                        {sacs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSac(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Icon name="TrashIcon" size="md" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poids total livré (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  name="poids_total_livre"
                  value={formData.poids_total_livre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poids accepté (kg) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  name="poids_accepte"
                  value={formData.poids_accepte}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${errors.poids_accepte ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-800`}
                />
                {errors.poids_accepte && (
                  <p className="text-red-500 text-sm mt-1">{errors.poids_accepte}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poids retour (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  name="poids_retour"
                  value={formData.poids_retour}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Finances */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
              <Icon name="CurrencyDollarIcon" size="lg" />
              Informations financières
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix unitaire marché (Ar/kg) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="prix_unitaire_marche"
                  value={formData.prix_unitaire_marche}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${errors.prix_unitaire_marche ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-800`}
                />
                {errors.prix_unitaire_marche && (
                  <p className="text-red-500 text-sm mt-1">{errors.prix_unitaire_marche}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant premium (Ar)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="montant_premium"
                  value={formData.montant_premium}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode de paiement
                </label>
                <select
                  name="mode_paiement"
                  value={formData.mode_paiement}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                >
                  <option value="especes">Espèces</option>
                  <option value="cheque">Chèque</option>
                  <option value="mobile">Mobile Banking</option>
                </select>
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-4">
            <Button
              type="submit"
              variant="secondary"
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              icon={loading ? "ArrowPathIcon" : "CheckIcon"}
            >
              {loading ? 'Création...' : 'Créer le FABC'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/tracabilite/bons-collecte')}
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BonCollecteForm;
