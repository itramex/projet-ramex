import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tracabiliteService } from '../../services/api';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

function CommandeExportList() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const response = await tracabiliteService.getCommandesExport();
      setCommandes(response.data.results || response.data);
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
            <Icon name={iconMap.commandeExport} size="xl" />
            Commandes d'Export
          </h1>
          <p className="text-gray-600">Gestion des commandes d'export</p>
        </div>
        <Link to="/tracabilite/commandes-export/create">
          <Button variant="primary" icon="PlusIcon">
            Nouvelle Commande
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">N° Commande</th>
              <th className="px-6 py-3 text-left">Client</th>
              <th className="px-6 py-3 text-left">Destination</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Poids</th>
              <th className="px-6 py-3 text-left">Statut</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {commandes.map((cmd) => (
              <tr key={cmd.id} className="border-t hover:bg-gray-50 hover:bg-gray-700">
                <td className="px-6 py-4 font-medium">{cmd.numero_commande}</td>
                <td className="px-6 py-4">{cmd.nom_client}</td>
                <td className="px-6 py-4">{cmd.pays_destination}</td>
                <td className="px-6 py-4">
                  {new Date(cmd.date_commande).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4">{cmd.poids_total_net} kg</td>
                <td className="px-6 py-4">
                  <Badge 
                    variant={
                      cmd.statut === 'livre' ? 'success' :
                      cmd.statut === 'expedie' ? 'info' :
                      'warning'
                    }
                    size="sm"
                  >
                    {cmd.statut_display || cmd.statut}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  <Link
                    to={`/tracabilite/commandes-export/${cmd.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Icon name="EyeIcon" size="md" />
                  </Link>
                  <Link
                    to={`/tracabilite/commandes-export/${cmd.id}/edit`}
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

export default CommandeExportList;
