import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tracabiliteService, cooperativeService } from '../../services/api';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

function FicheCollecteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campagnes, setCampagnes] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [bonsCollecte, setBonsCollecte] = useState([]);

  const [formData, setFormData] = useState({
    numero_fc: '',
    campagne: '',
    cooperative: '',
    certification: 'bio',
    date_marche: '',
    fokontany: '',
    nombre_producteurs: 0,
    poids_total_net: 0,
    montant_total: 0,
    agent_re: '',
    bons_collecte: []
  });

  useEffect(() => {
    fetchInitialData();
    if (id) {
      fetchFicheCollecte();
    }
    // Chargement initial / changement d'identifiant uniquement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const [campagnesRes, cooperativesRes, bonsRes] = await Promise.all([
        tracabiliteService.getCampagnes(),
        cooperativeService.getAll(),
        tracabiliteService.getBonsCollecte()
      ]);

      setCampagnes(campagnesRes.data.results || campagnesRes.data);
      setCooperatives(cooperativesRes.data.results || cooperativesRes.data);
      setBonsCollecte(bonsRes.data.results || bonsRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  };

  const fetchFicheCollecte = async () => {
    setLoading(true);
    try {
      const response = await tracabiliteService.getFicheCollecte(id);
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
        await tracabiliteService.updateFicheCollecte(id, formData);
        alert('Fiche de collecte mise à jour avec succès');
      } else {
        await tracabiliteService.createFicheCollecte(formData);
        alert('Fiche de collecte créée avec succès');
      }
      navigate('/tracabilite/fiches-collecte');
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

  const handleBonCollecteChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, bons_collecte: selectedOptions }));
  };

  if (loading && id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-yellow border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
          <Icon name={iconMap.ficheCollecte} size="xl" />
          {id ? 'Modifier' : 'Nouvelle'} Fiche de Collecte (FC)
        </h1>
        <p className="text-gray-600 text-gray-400">
          Regroupement de plusieurs bons de collecte
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Numéro FC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro FC *
            </label>
            <input
              type="text"
              name="numero_fc"
              value={formData.numero_fc}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              placeholder="FC-2024-001"
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
              <option value="">Sélectionner une campagne</option>
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

          {/* Certification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certification *
            </label>
            <select
              name="certification"
              value={formData.certification}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            >
              <option value="bio">Bio</option>
              <option value="fairtrade">Fairtrade</option>
              <option value="bio_fairtrade">Bio + Fairtrade</option>
              <option value="conventionnel">Conventionnel</option>
            </select>
          </div>

          {/* Date marché */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date du marché *
            </label>
            <input
              type="date"
              name="date_marche"
              value={formData.date_marche}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Fokontany */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fokontany *
            </label>
            <input
              type="text"
              name="fokontany"
              value={formData.fokontany}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              placeholder="Nom du fokontany"
            />
          </div>

          {/* Nombre producteurs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de producteurs
            </label>
            <input
              type="number"
              name="nombre_producteurs"
              value={formData.nombre_producteurs}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Poids total */}
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

          {/* Montant total */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant total (Ar)
            </label>
            <input
              type="number"
              step="0.01"
              name="montant_total"
              value={formData.montant_total}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Agent RE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent RE
            </label>
            <input
              type="text"
              name="agent_re"
              value={formData.agent_re}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              placeholder="Nom de l'agent"
            />
          </div>

          {/* Bons de collecte */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bons de collecte associés
            </label>
            <select
              multiple
              onChange={handleBonCollecteChange}
              value={formData.bons_collecte}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 h-32"
            >
              {bonsCollecte.map((bon) => (
                <option key={bon.id} value={bon.id}>
                  {bon.numero_fabc} - {bon.producteur_nom} - {bon.poids_accepte} kg
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Maintenez Ctrl (Windows) ou Cmd (Mac) pour sélectionner plusieurs bons
            </p>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-4 mt-8">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/tracabilite/fiches-collecte')}
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

export default FicheCollecteForm;
