import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tracabiliteService, cooperativeService } from '../../services/api';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

function BonTransportForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campagnes, setCampagnes] = useState([]);
  const [fichesCollecte, setFichesCollecte] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);

  const [formData, setFormData] = useState({
    numero_bt: '',
    campagne: '',
    fiche_collecte: '',
    cooperative: '',
    lieu_depart: '',
    fokontany_depart: '',
    lieu_destination: '',
    type_logistique: 'dos_homme',
    date_chargement: '',
    date_arrivee: '',
    poids_total_depart: 0,
    poids_total_arrivee: 0,
    chauffeur: '',
    matricule_vehicule: '',
    agent_convoyeur: '',
    agent_expediteur: '',
    agent_receptionnaire: '',
    statut: 'en_transit',
    observations: ''
  });

  useEffect(() => {
    fetchInitialData();
    if (id) {
      fetchBonTransport();
    }
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const [campagnesRes, fichesRes, cooperativesRes] = await Promise.all([
        tracabiliteService.getCampagnes(),
        tracabiliteService.getFichesCollecte(),
        cooperativeService.getAll()
      ]);

      setCampagnes(campagnesRes.data.results || campagnesRes.data);
      setFichesCollecte(fichesRes.data.results || fichesRes.data);
      setCooperatives(cooperativesRes.data.results || cooperativesRes.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchBonTransport = async () => {
    setLoading(true);
    try {
      const response = await tracabiliteService.getBonTransport(id);
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
        await tracabiliteService.updateBonTransport(id, formData);
        alert('Bon de transport mis à jour');
      } else {
        await tracabiliteService.createBonTransport(formData);
        alert('Bon de transport créé');
      }
      navigate('/tracabilite/bons-transport');
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
          <Icon name={iconMap.bonTransport} size="xl" />
          {id ? 'Modifier' : 'Nouveau'} Bon de Transport (BT)
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Numéro BT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro BT *
            </label>
            <input
              type="text"
              name="numero_bt"
              value={formData.numero_bt}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              placeholder="BT-2024-001"
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

          {/* Fiche de collecte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fiche de collecte
            </label>
            <select
              name="fiche_collecte"
              value={formData.fiche_collecte || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            >
              <option value="">Aucune</option>
              {fichesCollecte.map((f) => (
                <option key={f.id} value={f.id}>{f.numero_fc}</option>
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

          {/* Lieu départ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lieu de départ *
            </label>
            <input
              type="text"
              name="lieu_depart"
              value={formData.lieu_depart}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Fokontany départ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fokontany départ
            </label>
            <input
              type="text"
              name="fokontany_depart"
              value={formData.fokontany_depart}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Lieu destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lieu de destination *
            </label>
            <input
              type="text"
              name="lieu_destination"
              value={formData.lieu_destination}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Type logistique */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de logistique *
            </label>
            <select
              name="type_logistique"
              value={formData.type_logistique}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            >
              <option value="dos_homme">Dos d'homme</option>
              <option value="moto">Moto</option>
              <option value="vehicule">Véhicule</option>
            </select>
          </div>

          {/* Date chargement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de chargement *
            </label>
            <input
              type="date"
              name="date_chargement"
              value={formData.date_chargement}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Date arrivée */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date d'arrivée
            </label>
            <input
              type="date"
              name="date_arrivee"
              value={formData.date_arrivee || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Poids départ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Poids total départ (kg) *
            </label>
            <input
              type="number"
              step="0.01"
              name="poids_total_depart"
              value={formData.poids_total_depart}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Poids arrivée */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Poids total arrivée (kg)
            </label>
            <input
              type="number"
              step="0.01"
              name="poids_total_arrivee"
              value={formData.poids_total_arrivee || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Chauffeur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chauffeur
            </label>
            <input
              type="text"
              name="chauffeur"
              value={formData.chauffeur}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Matricule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Matricule véhicule
            </label>
            <input
              type="text"
              name="matricule_vehicule"
              value={formData.matricule_vehicule}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Agent convoyeur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent convoyeur *
            </label>
            <input
              type="text"
              name="agent_convoyeur"
              value={formData.agent_convoyeur}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Agent expéditeur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent expéditeur
            </label>
            <input
              type="text"
              name="agent_expediteur"
              value={formData.agent_expediteur}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Agent réceptionnaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent réceptionnaire
            </label>
            <input
              type="text"
              name="agent_receptionnaire"
              value={formData.agent_receptionnaire}
              onChange={handleChange}
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
              <option value="en_preparation">En préparation</option>
              <option value="en_transit">En transit</option>
              <option value="recu">Reçu</option>
            </select>
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/tracabilite/bons-transport')}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="secondary"
            disabled={loading}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? 'Enregistrement...' : id ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default BonTransportForm;
