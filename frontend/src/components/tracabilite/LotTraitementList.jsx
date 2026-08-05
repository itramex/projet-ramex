import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tracabiliteService } from '../../services/api';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

function LotTraitementList() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    setLoading(true);
    try {
      const response = await tracabiliteService.getLotsTraitement();
      setLots(response.data.results || response.data);
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
            <Icon name={iconMap.lotTraitement} size="xl" />
            Lots de Traitement
          </h1>
          <p className="text-gray-600">Gestion des lots de traitement</p>
        </div>
        <Link to="/tracabilite/lots-traitement/create">
          <Button variant="primary" icon="PlusIcon">
            Nouveau Lot
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">N° Lot</th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Date début</th>
              <th className="px-6 py-3 text-left">Poids entrée</th>
              <th className="px-6 py-3 text-left">Poids sortie</th>
              <th className="px-6 py-3 text-left">Qualité</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id} className="border-t hover:bg-gray-50 hover:bg-gray-700">
                <td className="px-6 py-4 font-medium">{lot.numero_lot}</td>
                <td className="px-6 py-4">{lot.type_traitement_display || lot.type_traitement}</td>
                <td className="px-6 py-4">
                  {new Date(lot.date_debut).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4">{lot.poids_entree} kg</td>
                <td className="px-6 py-4">{lot.poids_sortie || 'En cours'} kg</td>
                <td className="px-6 py-4">
                  <Badge variant="warning" size="sm">
                    {lot.qualite || 'N/A'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  <Link
                    to={`/tracabilite/lots-traitement/${lot.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Icon name="EyeIcon" size="md" />
                  </Link>
                  <Link
                    to={`/tracabilite/lots-traitement/${lot.id}/edit`}
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

export default LotTraitementList;
