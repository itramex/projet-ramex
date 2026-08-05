import { useState, useEffect } from 'react';
import { recommendationService } from '../../services/api';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';

function RecommendationDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await recommendationService.statistics();
      setStats(response.data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      alert('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    if (!confirm('Régénérer toutes les recommandations ? Cette opération peut prendre plusieurs minutes.')) {
      return;
    }

    setRefreshing(true);
    try {
      const response = await recommendationService.refreshAll();
      alert(`✅ ${response.data.success_count} producteurs traités avec succès !`);
      fetchStatistics();
    } catch (error) {
      console.error('Erreur refresh:', error);
      if (error.response?.status === 403) {
        alert('❌ Permission refusée. Vous devez être administrateur.');
      } else {
        alert('❌ Erreur lors de la régénération');
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-500 dark:text-gray-400">Erreur de chargement</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2">
            Tableau de bord <span className="text-primary-yellow">IA</span>
          </h1>
          <p className="text-gray-600">
            Vue d'ensemble des recommandations générées
          </p>
        </div>

        <Button
          onClick={handleRefreshAll}
          disabled={refreshing}
          variant="primary"
          icon={refreshing ? "ArrowPathIcon" : "ArrowPathIcon"}
          loading={refreshing}
        >
          {refreshing ? 'Refresh en cours...' : 'Refresh Global'}
        </Button>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total */}
        <Card padding="md" className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Total</h3>
            <Icon name="ClipboardDocumentListIcon" size="lg" className="text-white" />
          </div>
          <p className="text-4xl font-bold">{stats.total_recommendations}</p>
          <p className="text-sm opacity-90 mt-1">recommandations</p>
        </Card>

        {/* En attente */}
        <Card padding="md" className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">En attente</h3>
            <Icon name="ClockIcon" size="lg" className="text-white" />
          </div>
          <p className="text-4xl font-bold">{stats.pending_count}</p>
          <p className="text-sm opacity-90 mt-1">à traiter</p>
        </Card>

        {/* Exécutées */}
        <Card padding="md" className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Exécutées</h3>
            <Icon name="CheckCircleIcon" size="lg" className="text-white" />
          </div>
          <p className="text-4xl font-bold">{stats.executed_count}</p>
          <p className="text-sm opacity-90 mt-1">complétées</p>
        </Card>

        {/* Score moyen */}
        <Card padding="md" className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Score moyen</h3>
            <Icon name="StarIcon" size="lg" className="text-white" />
          </div>
          <p className="text-4xl font-bold">{stats.avg_score}</p>
          <p className="text-sm opacity-90 mt-1">sur 1.0</p>
        </Card>
      </div>

      {/* Top activités */}
      <Card padding="md" className="mb-8">
        <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
          <Icon name="TrophyIcon" size="md" className="text-yellow-600" />
          <span>Top 5 des activités recommandées</span>
        </h2>

        {stats.top_activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Aucune donnée disponible
          </p>
        ) : (
          <div className="space-y-3">
            {stats.top_activities.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary-yellow text-dark w-10 h-10 rounded-full flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-dark">
                      {activity.type_activite}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.count} recommandation{activity.count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="info" size="md">
                    {((activity.count / stats.total_recommendations) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recommandations récentes */}
      <Card padding="md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-dark flex items-center gap-2">
            <Icon name="ClockIcon" size="md" className="text-gray-600" />
            <span>Recommandations récentes</span>
          </h2>
          <Link
            to="/recommandations/liste"
            className="text-primary-yellow hover:text-yellow-600 font-medium flex items-center gap-1"
          >
            Voir tout
            <Icon name="ChevronRightIcon" size="sm" />
          </Link>
        </div>

        {stats.recent_recommendations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Aucune recommandation récente
          </p>
        ) : (
          <div className="space-y-3">
            {stats.recent_recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-dark mb-1">
                      {rec.type_activite}
                    </h3>
                    {rec.producteur_info && (
                      <p className="text-sm text-gray-600 mb-2">
                        Pour: {rec.producteur_info.nom_complet}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {new Date(rec.date_generation).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" size="sm" icon="StarIcon">
                      {rec.score_display}/10
                    </Badge>
                    <Badge 
                      variant={
                        rec.statut === 'pending' ? 'warning' :
                        rec.statut === 'executed' ? 'success' : 'error'
                      }
                      size="sm"
                    >
                      {rec.status_display}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default RecommendationDashboard;
