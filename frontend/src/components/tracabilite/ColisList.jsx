import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tracabiliteService } from '../../services/api';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

function ColisList() {
  const [colis, setColis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchColis();
  }, []);

  // QR Code serveur
  const [qrModal, setQrModal] = useState(null);
  const [qrLoadingId, setQrLoadingId] = useState(null);

  const showQr = async (c) => {
    setQrLoadingId(c.id);
    try {
      const res = await tracabiliteService.generateQR(c.id);
      setQrModal(res.data);
    } catch (error) {
      console.error('Erreur QR:', error);
      alert('Erreur lors de la génération du QR code');
    } finally {
      setQrLoadingId(null);
    }
  };

  const fetchColis = async () => {
    setLoading(true);
    try {
      const response = await tracabiliteService.getColis();
      setColis(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2 flex items-center gap-2">
            <Icon name={iconMap.colis} size="xl" />
            Colis
          </h1>
          <p className="text-gray-600">Gestion des colis</p>
        </div>
        <Link to="/tracabilite/colis/create">
          <Button variant="primary" icon="PlusIcon">
            Nouveau Colis
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">N° Colis</th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Poids net</th>
              <th className="px-6 py-3 text-left">Qualité</th>
              <th className="px-6 py-3 text-left">QR Code</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {colis.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50 hover:bg-gray-700">
                <td className="px-6 py-4 font-medium">{c.numero_colis}</td>
                <td className="px-6 py-4">{c.type_colis_display || c.type_colis}</td>
                <td className="px-6 py-4">
                  {new Date(c.date_conditionnement).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4">{c.poids_net} kg</td>
                <td className="px-6 py-4">
                  <Badge variant="info" size="sm">
                    {c.qualite}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  {c.qr_code ? (
                    <Icon name="CheckCircleIcon" size="md" className="text-green-500" />
                  ) : (
                    <Icon name="XCircleIcon" size="md" className="text-red-500" />
                  )}
                </td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  <button
                    onClick={() => showQr(c)}
                    disabled={qrLoadingId === c.id}
                    title="QR Code serveur"
                    className="text-green-600 hover:text-green-900 disabled:opacity-50"
                  >
                    <Icon name="QrCodeIcon" size="md" />
                  </button>
                  <Link
                    to={`/tracabilite/colis/${c.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Icon name="EyeIcon" size="md" />
                  </Link>
                  <Link
                    to={`/tracabilite/colis/${c.id}/edit`}
                    className="text-yellow-600 hover:text-yellow-900"
                  >
                    <Icon name="PencilIcon" size="md" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modale QR Code */}
      {qrModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-dark">QR Code — {qrModal.numero_colis}</h3>
              <button onClick={() => setQrModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            {qrModal.qr_png_base64 ? (
              <img
                src={qrModal.qr_png_base64}
                alt={`QR ${qrModal.numero_colis}`}
                className="mx-auto border border-gray-200 rounded-lg"
                style={{ width: 256, height: 256 }}
              />
            ) : (
              <p className="text-red-600 text-sm py-8">Image QR indisponible.</p>
            )}
            <p className="mt-4 text-xs text-gray-500 uppercase">Contenu scanné</p>
            <p className="font-mono text-sm text-dark break-all bg-gray-50 rounded-lg p-2 mt-1">
              {qrModal.payload}
            </p>
            <button
              onClick={() => setQrModal(null)}
              className="mt-4 w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ColisList;
