import { useState } from 'react';
import TrendAnalysisDashboard from './TrendAnalysisDashboard';
import AdhesionsHistoryView from './AdhesionsHistoryView';
import Card from '../common/Card';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

function HistoryAnalysisPage() {
  const [activeView, setActiveView] = useState('trends');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark mb-2">
          Analyse <span className="text-primary-yellow">Historique</span>
        </h1>
        <p className="text-gray-600">
          Évolution des productions, revenus AGR, indicateurs sociaux et adhésions
        </p>
      </div>

      {/* Navigation Tabs */}
      <Card padding="none" className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveView('trends')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeView === 'trends'
                  ? 'border-chick-yellow text-chick-yellow'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon name={iconMap.chiffresClés} size="sm" />
              Analyse des Tendances
            </button>
            
            <button
              onClick={() => setActiveView('adhesions')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeView === 'adhesions'
                  ? 'border-chick-yellow text-chick-yellow'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon name={iconMap.producteur} size="sm" />
              Historique des Adhésions
            </button>
          </nav>
        </div>
      </Card>

      {/* Content */}
      {activeView === 'trends' && <TrendAnalysisDashboard />}
      {activeView === 'adhesions' && <AdhesionsHistoryView />}
    </div>
  );
}

export default HistoryAnalysisPage;
