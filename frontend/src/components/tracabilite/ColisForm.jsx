import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tracabiliteService } from '../../services/api';

function ColisForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lotsTraitement, setLotsTraitement] = useState([]);

  const [formData, setFormData] = useState({
    numero_colis: '',
    lot_traitement: '',
    type_colis: 'carton',
    poids_net: 0,
    poids_brut: 0,
    qualite: '',
    grade: '',
    date_conditionnement: '',
    qr_code: '',
    code_barres: '',
    nombre_gousses: 0,
    longueur_moyenne: '',
    observations: ''
  });

  useEffect(() => {
    fetchLotsTraitement();
    if (id) {
      fetchColis();
    }
  }, [id]);

  const fetchLotsTraitement = async () => {
    try {
      const response = await tracabiliteService.getLotsTraitement();
      setLotsTraitement(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchColis = async () => {
    setLoading(true);
    try {
      const response = await tracabiliteService.getColis(id);
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
        await tracabiliteService.updateColis(id, formData);
        alert('Colis mis à jour');
      } else {
        await tracabiliteService.createColis(formData);
        alert('Colis créé');
      }
      navigate('/tracabilite/colis');
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

  const generateQRCode = () => {
    // Format normalisé et déterministe (identique au QR serveur) :
    // reproductible — pas d'horodatage aléatoire.
    const qr = `RMX|COLIS|${formData.numero_colis || 'A-DEFINIR'}`;
    setFormData(prev => ({ ...prev, qr_code: qr }));
  };

  const generateBarcode = () => {
    // Générer un code-barres unique
    const barcode = `BC-${formData.numero_colis}-${Date.now()}`;
    setFormData(prev => ({ ...prev, code_barres: barcode }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-dark mb-2">
          {id ? '✏️ Modifier' : '➕ Nouveau'} Colis
        </h1>
        <p className="text-gray-600 text-gray-400">
          Conditionnement et traçabilité des colis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Numéro colis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de colis *
            </label>
            <input
              type="text"
              name="numero_colis"
              value={formData.numero_colis}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              placeholder="COL-2024-001"
            />
          </div>

          {/* Lot de traitement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lot de traitement *
            </label>
            <select
              name="lot_traitement"
              value={formData.lot_traitement}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            >
              <option value="">Sélectionner</option>
              {lotsTraitement.map((lot) => (
                <option key={lot.id} value={lot.id}>{lot.numero_lot}</option>
              ))}
            </select>
          </div>

          {/* Type colis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de colis *
            </label>
            <select
              name="type_colis"
              value={formData.type_colis}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            >
              <option value="carton">Carton</option>
              <option value="sac">Sac</option>
              <option value="caisse">Caisse</option>
              <option value="palette">Palette</option>
            </select>
          </div>

          {/* Date conditionnement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de conditionnement *
            </label>
            <input
              type="date"
              name="date_conditionnement"
              value={formData.date_conditionnement}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Poids net */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Poids net (kg) *
            </label>
            <input
              type="number"
              step="0.01"
              name="poids_net"
              value={formData.poids_net}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Poids brut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Poids brut (kg)
            </label>
            <input
              type="number"
              step="0.01"
              name="poids_brut"
              value={formData.poids_brut}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Qualité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qualité *
            </label>
            <input
              type="text"
              name="qualite"
              value={formData.qualite}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              placeholder="Ex: Premium, Standard, TK..."
            />
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade
            </label>
            <input
              type="text"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              placeholder="Ex: A, B, C..."
            />
          </div>

          {/* Nombre gousses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de gousses
            </label>
            <input
              type="number"
              name="nombre_gousses"
              value={formData.nombre_gousses}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
            />
          </div>

          {/* Longueur moyenne */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Longueur moyenne (cm)
            </label>
            <input
              type="text"
              name="longueur_moyenne"
              value={formData.longueur_moyenne}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              placeholder="Ex: 14-16 cm"
            />
          </div>

          {/* QR Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QR Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="qr_code"
                value={formData.qr_code}
                onChange={handleChange}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                placeholder="QR-..."
              />
              <button
                type="button"
                onClick={generateQRCode}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Générer
              </button>
            </div>
          </div>

          {/* Code-barres */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code-barres
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="code_barres"
                value={formData.code_barres}
                onChange={handleChange}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                placeholder="BC-..."
              />
              <button
                type="button"
                onClick={generateBarcode}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                Générer
              </button>
            </div>
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
            onClick={() => navigate('/tracabilite/colis')}
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

export default ColisForm;
