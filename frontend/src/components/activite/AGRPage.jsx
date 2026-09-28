import { useState } from 'react';
import AGRStats from '../dashboard/AGRStats';
import AGRHistoryTable from '../history/AGRHistoryTable';

const TABS = [
  { id: 'stats', label: 'Statistiques' },
  { id: 'historique', label: 'Historique & bilans' },
];

/**
 * Espace AGR consolidé : statistiques (revenus par type, top 10),
 * historique par année (filtres producteur/année/type/village) et analyse
 * des évolutions réunis dans une seule page.
 *
 * Note : <AGRStats /> est monté sans prop `filters` — la référence reste
 * stable, pas de rechargement en boucle.
 */
function AGRPage() {
  const [tab, setTab] = useState('stats');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">
          Activités Génératrices de <span className="text-primary-yellow">Revenus</span>
        </h1>
        <p className="text-gray-600">Statistiques, historique et analyse des AGR</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-primary-yellow text-dark'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' ? <AGRStats /> : <AGRHistoryTable />}
    </div>
  );
}

export default AGRPage;
