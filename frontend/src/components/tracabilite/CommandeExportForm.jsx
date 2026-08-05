// src/components/tracabilite/CommandeExportForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tracabiliteService } from '../../services/api';

function CommandeExportForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campagnes, setCampagnes] = useState([]);
  const [colis, setColis] = useState([]);

  const [formData, setFormData] = useState({
    numero_commande: '',
    campagne: '',
    nom_client: '',
    pays_destination: '',
    ville_destination: '',
    adresse_destination: '',
    type_transport: 'aerien',
    date_commande: '',
    date_expedition: '',
    date_livraison_prevue: '',
    poids_total_net: 0,
    poids_total_brut: 0,
    valeur_commande: 0,
    devise: 'EUR',
    incoterm: 'FOB',
    numero_conteneur: '',
    numero_booking: '',
    numero_bl: '',
    statut: 'en_preparation',
    observations: '',
    colis: []
  });

  useEffect(() => {
    fetchInitialData();
    if (id) {
      fetchCommandeExport();
    }
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const [campagnesRes, colisRes] = await Promise.all([
        tracabiliteService.getCampagnes(),
        tracabiliteService.getColis()
      ]);

      setCampagnes(campagnesRes.data.results || campagnesRes.data);
      setColis(colisRes.data.results || colisRes.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchCommandeExport = async () => {
    setLoading(true);
    try {
      const response = await tracabiliteService.getCommandeExport(id);
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
        await tracabiliteService.updateCommandeExport(id, formData);
        alert('Commande d\'export mise à jour');
      } else {
        await tracabiliteService.createCommandeExport(formData);
        alert('Commande d\'export créée');
      }
      navigate('/tracabilite/commandes-export');
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

  const handleColisChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, colis: selectedOptions }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-dark mb-2">
          {id ? '✏️ Modifier' : '➕ Nouvelle'} Commande d'Export
        </h1>
        <p className="text-gray-600 text-gray-400">
          Gestion des commandes internationales
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
        {/* Section 1: Informations générales */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-dark mb-4 border-b pb-2">
            📋 Informations générales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de commande *
              </label>
              <input
                type="text"
                name="numero_commande"
                value={formData.numero_commande}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                placeholder="CMD-2024-001"
              />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de commande *
              </label>
              <input
                type="date"
                name="date_commande"
                value={formData.date_commande}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>

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
                <option value="expedie">Expédié</option>
                <option value="en_transit">En transit</option>
                <option value="livre">Livré</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Client et destination */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-dark mb-4 border-b pb-2">
            👤 Client et destination
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du client *
              </label>
              <input
                type="text"
                name="nom_client"
                value={formData.nom_client}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays de destination *
              </label>
              <input
                type="text"
                name="pays_destination"
                value={formData.pays_destination}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                placeholder="France, USA, Allemagne..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville de destination
              </label>
              <input
                type="text"
                name="ville_destination"
                value={formData.ville_destination}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse complète
              </label>
              <input
                type="text"
                name="adresse_destination"
                value={formData.adresse_destination}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Transport et logistique */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-dark mb-4 border-b pb-2">
            🚢 Transport et logistique
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de transport *
              </label>
              <select
                name="type_transport"
                value={formData.type_transport}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              >
                <option value="aerien">Aérien</option>
                <option value="maritime">Maritime</option>
                <option value="routier">Routier</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Incoterm *
              </label>
              <select
                name="incoterm"
                value={formData.incoterm}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              >
                <option value="EXW">EXW - Ex Works</option>
                <option value="FOB">FOB - Free On Board</option>
                <option value="CIF">CIF - Cost Insurance Freight</option>
                <option value="DAP">DAP - Delivered At Place</option>
                <option value="DDP">DDP - Delivered Duty Paid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'expédition
              </label>
              <input
                type="date"
                name="date_expedition"
                value={formData.date_expedition || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de livraison prévue
              </label>
              <input
                type="date"
                name="date_livraison_prevue"
                value={formData.date_livraison_prevue || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de conteneur
              </label>
              <input
                type="text"
                name="numero_conteneur"
                value={formData.numero_conteneur}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                placeholder="CONT123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de booking
              </label>
              <input
                type="text"
                name="numero_booking"
                value={formData.numero_booking}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de B/L
              </label>
              <input
                type="text"
                name="numero_bl"
                value={formData.numero_bl}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Poids et valeur */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-dark mb-4 border-b pb-2">
            💰 Poids et valeur
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poids total net (kg)
              </label>
              <input
                type="number"
                step="0.01"
                name="poids_total_net"
                value={formData.poids_total_net}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poids total brut (kg)
              </label>
              <input
                type="number"
                step="0.01"
                name="poids_total_brut"
                value={formData.poids_total_brut}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valeur de la commande
              </label>
              <input
                type="number"
                step="0.01"
                name="valeur_commande"
                value={formData.valeur_commande}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise
              </label>
              <select
                name="devise"
                value={formData.devise}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              >
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - Dollar</option>
                <option value="MGA">MGA - Ariary</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 5: Colis et observations */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-dark mb-4 border-b pb-2">
            📦 Colis associés
          </h2>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionner les colis
              </label>
              <select
                multiple
                onChange={handleColisChange}
                value={formData.colis}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 h-40"
              >
                {colis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero_colis} - {c.poids_net} kg - {c.qualite}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Maintenez Ctrl (Windows) ou Cmd (Mac) pour sélectionner plusieurs colis
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observations
              </label>
              <textarea
                name="observations"
                value={formData.observations}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                placeholder="Notes, instructions spéciales..."
              />
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={() => navigate('/tracabilite/commandes-export')}
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

export default CommandeExportForm;
