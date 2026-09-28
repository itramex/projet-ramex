import { memo } from 'react';
import Card from '../common/Card';
import AGRStats from './AGRStats';
import AGRHistoryTable from '../history/AGRHistoryTable';
import TrendAnalysisDashboard from '../history/TrendAnalysisDashboard';

/**
 * Onglet AGR du dashboard — regroupe tout ce qui concerne les AGR au même endroit :
 *  - Statistiques : cartes de revenus ventilées par type, répartition, top 10
 *    (utilise les filtres village/commune du dashboard).
 *  - Historique & bilans : saisie et tableau des AGR par année, totaux et cumul.
 *  - Analyse & tendances : évolution des revenus AGR (graphiques multi-critères).
 *
 * Les 2e et 3e vues gèrent leurs propres filtres (année, producteur, type…),
 * elles sont donc montées sans props.
 */
const SUB_TABS = [
  { id: 'stats', label: 'Statistiques' },
  { id: 'historique', label: 'Historique & bilans' },
  { id: 'analyse', label: 'Analyse & tendances' },
];

const AGRDashboard = memo(({ filters, subTab, onSubTabChange }) => {
  return (
    <>
      {/* Sous-onglets */}
      <Card padding="none" className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {SUB_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${subTab === tab.id
                    ? 'border-chick-yellow text-chick-yellow'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </Card>

      {subTab === 'stats' && <AGRStats filters={filters} />}
      {subTab === 'historique' && <AGRHistoryTable />}
      {subTab === 'analyse' && <TrendAnalysisDashboard />}
    </>
  );
});

AGRDashboard.displayName = 'AGRDashboard';

export default AGRDashboard;
