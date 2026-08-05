import { useState } from 'react';

function RecommendationCard({ recommendation, onExecute, onReject, onDetailsClick }) {
  const [loading, setLoading] = useState(false);

  const getScoreBadgeColor = (score) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const handleExecute = async () => {
    if (!confirm('Marquer cette recommandation comme exécutée ?')) return;
    
    setLoading(true);
    try {
      await onExecute(recommendation.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Rejeter cette recommandation ?')) return;
    
    setLoading(true);
    try {
      await onReject(recommendation.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Header avec score */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-dark mb-2">
            {recommendation.type_activite}
          </h3>
          
          {recommendation.producteur_info && (
            <p className="text-sm text-gray-600">
              Pour: {recommendation.producteur_info.nom_complet}
            </p>
          )}
        </div>
        
        {/* Badge de score */}
        <div className={`${getScoreBadgeColor(recommendation.score_display)} text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1`}>
          <span>⭐</span>
          <span>{recommendation.score_display}/10</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-700 mb-4 line-clamp-3">
        {recommendation.description}
      </p>

      {/* Explication */}
      {recommendation.explication && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            💡 {recommendation.explication}
          </p>
        </div>
      )}

      {/* Sources */}
      {recommendation.sources && recommendation.sources.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">
            Basé sur {recommendation.sources.length} producteurs similaires
          </p>
          <div className="flex gap-2 flex-wrap">
            {recommendation.sources.map((source, idx) => (
              <span 
                key={idx}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                Similarité: {(source.similarity * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Date */}
      <p className="text-xs text-gray-500 mb-4">
        Généré le {new Date(recommendation.date_generation).toLocaleDateString('fr-FR')}
      </p>

      {/* Actions */}
      {recommendation.statut === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={handleExecute}
            disabled={loading}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>✓</span>
            <span>Exécuter</span>
          </button>
          
          <button
            onClick={() => onDetailsClick(recommendation)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            📋 Détails
          </button>
          
          <button
            onClick={handleReject}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      )}

      {/* Statut si déjà traité */}
      {recommendation.statut === 'executed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span className="text-sm text-green-800">
            Exécutée le {new Date(recommendation.date_execution).toLocaleDateString('fr-FR')}
          </span>
        </div>
      )}

      {recommendation.statut === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <span className="text-red-600">✕</span>
          <span className="text-sm text-red-800">
            Rejetée
          </span>
        </div>
      )}
    </div>
  );
}

export default RecommendationCard;
