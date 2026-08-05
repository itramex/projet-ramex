import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tracabiliteService, cooperativeService } from '../../services/api';

function LotTraitementForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campagnes, setCampagnes] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [bonsTransport, setBonsTransport] = useState([]);

  const [formData, setFormData] = useState({
    numero_lot: '',
    campagne: '',
    cooperative: '',
    type_traitement: 'sechage',
    date_debut: '',
    date_fin: '',
    poids_entree: 0,
    poids_sortie: 0,
    qualite: '',
    responsable_traitement: '',
    site_traitement: '',
    statut: 'en_cours',
    temperature_sechage: '',
    humidite_finale: '',
    observations: '',
    bons_transport: []
  });

  useEffect(() => {
    fetchInitialData();
    if (id) {
      fetchLotTraitement();
    }
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const [campagnesRes, cooperativesRes, bonsRes] = await Promise.all([
        tracabiliteService.getCampagnes(),
        cooperativeService.getAll(),
        tracabiliteService.getBonsTransport()
      ]);

      setCampagnes(campagnesRes.data.results || campagnesRes.data);
      setCooperatives(cooperativesRes.data.results || cooperativesRes.data);
      setBonsTransport(bonsRes.data.results || bonsRes.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchLotTraitement = async () => {
    setLoading(true);
    try {
      const response = await tracabiliteService.getLotTraitement(id);
      setFormData(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (id) {
        await tracabiliteService.updateLotTraitement(id, formData);
        alert('Lot de traitement mis à jour');
      } else {
        await tracabiliteService.createLotTraitement(formData);
        alert('Lot de traitement créé');
      }
      navigate('/tracabilite/lots-traitement');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBonTransportChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, bons_transport: selectedOptions }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-dark mb-2">
          {id ? '✏️ Modifier' : '➕ Nouveau'} Lot de Traitement
        </h1>
        <p className="text-gray-600 text-gray-400">
          Gestion du traitement de la vanille
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Numéro lot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de lot *
            </label>
            <input
              type="text"
              name="numero_lot"
              value={formData.numero_lot}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              placeholder="LOT-2024-001"
            />
          </div>

          {/* Campagne */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campagne *
            </label>
            <select
              name="campagne"
              value={formData.campagne}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            >
              <option value="">Sélectionner</option>
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
          </div>

          {/* Coopérative */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coopérative
            </label>
            <select
              name="cooperative"
              value={formData.cooperative || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            >
              <option value="">Aucune</option>
              {cooperatives.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          {/* Type traitement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de traitement *
            </label>
            <select
              name="type_traitement"
              value={formData.type_traitement}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            >
              <option value="sechage">Séchage</option>
              <option value="tri">Tri</option>
              <option value="conditionnement">Conditionnement</option>
            </select>
          </div>

          {/* Date début */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de début *
            </label>
            <input
              type="date"
              name="date_debut"
              value={formData.date_debut}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Date fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de fin
            </label>
            <input
              type="date"
              name="date_fin"
              value={formData.date_fin || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Poids entrée */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Poids d'entrée (kg) *
            </label>
            <input
              type="number"
              step="0.01"
              name="poids_entree"
              value={formData.poids_entree}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Poids sortie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Poids de sortie (kg)
            </label>
            <input
              type="number"
              step="0.01"
              name="poids_sortie"
              value={formData.poids_sortie || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Qualité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qualité
            </label>
            <select
              name="qualite"
              value={formData.qualite}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            >
              <option value="">Sélectionner</option>
              <option value="gourmet">Gourmet</option>
              <option value="tk1">TK1</option>
              <option value="tk2">TK2</option>
              <option value="cuts">Cuts</option>
            </select>
          </div>

          {/* Responsable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsable du traitement *
            </label>
            <input
              type="text"
              name="responsable_traitement"
              value={formData.responsable_traitement}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Site */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site de traitement *
            </label>
            <input
              type="text"
              name="site_traitement"
              value={formData.site_traitement}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut *
            </label>
            <select
              name="statut"
              value={formData.statut}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            >
              <option value="en_attente">En attente</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Terminé</option>
            </select>
          </div>

          {/* Température */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Température de séchage (°C)
            </label>
            <input
              type="number"
              step="0.1"
              name="temperature_sechage"
              value={formData.temperature_sechage || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Humidité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Humidité finale (%)
            </label>
            <input
              type="number"
              step="0.1"
              name="humidite_finale"
              value={formData.humidite_finale || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Bons de transport */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bons de transport associés
            </label>
            <select
              multiple
              onChange={handleBonTransportChange}
              value={formData.bons_transport}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 h-32"
            >
              {bonsTransport.map((bon) => (
                <option key={bon.id} value={bon.id}>
                  {bon.numero_bt} - {bon.lieu_depart} → {bon.lieu_destination}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Maintenez Ctrl (Windows) ou Cmd (Mac) pour sélectionner plusieurs bons
            </p>
          </div>

          {/* Observations */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observations
            </label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={() => navigate('/tracabilite/lots-traitement')}
            className="flex-1 px-6 py-3 bg-gray-200 bg-gray-600 text-dark rounded-lg hover:bg-gray-300 hover:bg-gray-500 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Enregistrement...' : id ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LotTraitementForm;
