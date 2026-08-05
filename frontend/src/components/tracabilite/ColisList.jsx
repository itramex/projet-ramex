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
    </div>
  );
}

export default ColisList;
