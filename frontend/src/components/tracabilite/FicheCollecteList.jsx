import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tracabiliteService } from '../../services/api';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

function FicheCollecteList() {
  const [fichesCollecte, setFichesCollecte] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFichesCollecte();
  }, []);

  const fetchFichesCollecte = async () => {
    setLoading(true);
    try {
      const response = await tracabiliteService.getFichesCollecte();
      setFichesCollecte(response.data.results || response.data);
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
            <Icon name={iconMap.ficheCollecte} size="xl" />
            Fiches de Collecte (FC)
          </h1>
          <p className="text-gray-600">Gestion des fiches de collecte</p>
        </div>
        <Link to="/tracabilite/fiches-collecte/create">
          <Button variant="primary" icon="PlusIcon">
            Nouvelle FC
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° FC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fokontany</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producteurs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poids</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {fichesCollecte.map((fiche) => (
              <tr key={fiche.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-dark">{fiche.numero_fc}</td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {new Date(fiche.date_marche).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{fiche.fokontany}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{fiche.nombre_producteurs}</td>
                <td className="px-6 py-4 text-sm font-semibold text-dark">{fiche.poids_total_net} kg</td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  <Link
                    to={`/tracabilite/fiches-collecte/${fiche.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Icon name="EyeIcon" size="md" />
                  </Link>
                  <Link
                    to={`/tracabilite/fiches-collecte/${fiche.id}/edit`}
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

export default FicheCollecteList;
