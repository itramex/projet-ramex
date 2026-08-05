function RecommendationDetails({ recommendation, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-dark">
            Détails de la <span className="text-primary-yellow">Recommandation</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Type et score */}
          <div>
            <label className="text-sm font-medium text-gray-500">Type d'activité</label>
            <p className="text-lg font-semibold text-dark mt-1">
              {recommendation.type_activite}
            </p>
            <div className="mt-2">
              <span className="bg-primary-yellow text-dark px-3 py-1 rounded-full text-sm font-bold">
                ⭐ Score: {recommendation.score_display}/10
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-500">Description</label>
            <p className="text-gray-700 mt-1">
              {recommendation.description}
            </p>
          </div>

          {/* Explication */}
          {recommendation.explication && (
            <div>
              <label className="text-sm font-medium text-gray-500">Explication IA</label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-1">
                <p className="text-blue-800">
                  💡 {recommendation.explication}
                </p>
              </div>
            </div>
          )}

          {/* Producteurs sources */}
          {recommendation.sources && recommendation.sources.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">
                Producteurs similaires (sources)
              </label>
              <div className="space-y-2">
                {recommendation.sources.map((source, idx) => (
                  <div 
                    key={idx}
                    className="bg-gray-50 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-dark">
                        Producteur #{source.producteur_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        Impact: {source.impact}/10
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary-yellow">
                        {(source.similarity * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        similarité
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Date de génération</label>
              <p className="text-gray-700 mt-1">
                {new Date(recommendation.date_generation).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>

            {recommendation.date_execution && (
              <div>
                <label className="text-sm font-medium text-gray-500">Date d'exécution</label>
                <p className="text-gray-700 mt-1">
                  {new Date(recommendation.date_execution).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Statut */}
          <div>
            <label className="text-sm font-medium text-gray-500">Statut</label>
            <p className="mt-1">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                recommendation.statut === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                recommendation.statut === 'executed' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {recommendation.status_display}
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-dark px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecommendationDetails;
