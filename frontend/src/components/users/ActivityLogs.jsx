import { useState, useEffect, useCallback } from 'react';
import { activityLogService } from '../../services/api';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';

const ACTION_META = {
  login: { label: 'Connexion', color: 'success', name: 'LogInIcon' },
  logout: { label: 'Déconnexion', color: 'neutral', name: 'LogoutIcon' },
  create: { label: 'Création', color: 'info', name: 'PlusIcon' },
  update: { label: 'Modification', color: 'warning', name: 'PencilIcon' },
  delete: { label: 'Suppression', color: 'error', name: 'TrashIcon' },
  view: { label: 'Consultation', color: 'neutral', name: 'EyeIcon' },
  export: { label: 'Export', color: 'info', name: 'ArrowDownTrayIcon' },
  import: { label: 'Import', color: 'warning', name: 'ArrowUpTrayIcon' },
  token_blacklist: { label: 'Session close', color: 'neutral', name: 'ShieldCheckIcon' },
  other: { label: 'Autre', color: 'neutral', name: 'ClipboardDocumentListIcon' },
};

const FILTRE_ACTIONS = Object.keys(ACTION_META);

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    module: '',
    days: '7',
    search: '',
  });

  const buildParams = useCallback((f) => {
    const p = {};
    if (f.action) p.action = f.action;
    if (f.module) p.module = f.module;
    if (f.days) p.days = f.days;
    if (f.search) p.search = f.search;
    return p;
  }, []);

  const loadAll = useCallback(async (override = null) => {
    const f = override !== null ? override : filters;
    setLoading(true);
    setError('');
    try {
      const [logsRes, statsRes] = await Promise.all([
        activityLogService.getLogs(buildParams(f)),
        activityLogService.getStatistics(),
      ]);
      setLogs(logsRes.data.results || logsRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.status === 403
        ? 'Accès refusé : permission d\'administrateur requise.'
        : 'Erreur lors du chargement du journal.');
    } finally {
      setLoading(false);
    }
  }, [filters, buildParams]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await activityLogService.getUserSessions();
      setSessions(res.data || []);
    } catch (e) {
      console.error('Erreur sessions:', e);
    }
  }, []);

  useEffect(() => {
    loadAll();
    loadSessions();
  }, [loadAll, loadSessions]);

  const handleFilterChange = (name, value) => {
    const next = { ...filters, [name]: value };
    setFilters(next);
    loadAll(next);
  };

  const formatDateTime = (ts) =>
    new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  const metaFor = (action) => ACTION_META[action] || ACTION_META.other;

  // Barre de répartition par action (top 5)
  const actionBreakdown = stats?.by_action || {};
  const actionEntries = Object.entries(actionBreakdown).sort((a, b) => b[1] - a[1]);
  const maxAction = actionEntries.length ? actionEntries[0][1] : 1;

  const statCards = [
    { label: "Aujourd'hui", value: stats?.today_count ?? 0, border: 'border-blue-500', color: 'text-dark' },
    { label: 'Cette semaine', value: stats?.week_count ?? 0, border: 'border-green-500', color: 'text-green-600' },
    { label: 'Ce mois', value: stats?.month_count ?? 0, border: 'border-purple-500', color: 'text-purple-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-dark flex items-center gap-2">
            <Icon name="ClipboardDocumentListIcon" size="xl" />
            Journal d'activité
          </h1>
          <p className="text-gray-600 mt-1">
            Audit des actions effectuées par les utilisateurs et historique des sessions
          </p>
        </div>
        <Button variant="primary" icon="ArrowPathIcon" onClick={() => { loadAll(); loadSessions(); }} disabled={loading}>
          Actualiser
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((c) => (
          <Card key={c.label} className={`border-l-4 ${c.border}`}>
            <p className="text-gray-600 text-sm font-medium">{c.label}</p>
            <p className={`text-3xl font-bold mt-2 ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">activités</p>
          </Card>
        ))}
      </div>

      {/* Répartition par action + utilisateurs les plus actifs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-dark mb-3 flex items-center gap-2">
            <Icon name="ChartBarIcon" size="md" /> Répartition des actions (7 jours)
          </h3>
          {actionEntries.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune activité cette semaine.</p>
          ) : (
            <div className="space-y-2">
              {actionEntries.slice(0, 5).map(([action, count]) => {
                const meta = metaFor(action);
                return (
                  <div key={action} className="flex items-center gap-3">
                    <div className="w-40 flex-shrink-0 text-sm text-gray-600">{meta.label}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-chick-yellow h-3 rounded-full" style={{ width: `${(count / maxAction) * 100}%` }}></div>
                    </div>
                    <div className="w-8 text-right text-sm font-semibold text-dark">{count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-dark mb-3 flex items-center gap-2">
            <Icon name="UsersIcon" size="md" /> Utilisateurs les plus actifs (7 jours)
          </h3>
          {(!stats?.most_active_users || stats.most_active_users.length === 0) ? (
            <p className="text-sm text-gray-500">Aucune activité.</p>
          ) : (
            <ol className="space-y-2">
              {stats.most_active_users.map((u, idx) => (
                <li key={u.user__username} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-dark text-white text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                  <span className="font-medium text-dark">{u.user__username}</span>
                  <span className="ml-auto text-sm text-gray-500">{u.count} actions</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
            <input
              type="text"
              placeholder="Description, utilisateur, module..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">Toutes</option>
              {FILTRE_ACTIONS.map((a) => (
                <option key={a} value={a}>{metaFor(a).label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <input
              type="text"
              placeholder="ex. Traçabilité"
              value={filters.module}
              onChange={(e) => handleFilterChange('module', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
            <select
              value={filters.days}
              onChange={(e) => handleFilterChange('days', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="1">Dernières 24h</option>
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">3 derniers mois</option>
              <option value="">Tout</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Journal */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-dark flex items-center gap-2">
            <Icon name="ClockIcon" size="md" /> Dernières activités
          </h3>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-chick-yellow mx-auto"></div>
            <p className="text-gray-600 mt-4">Chargement du journal...</p>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Aucune activité enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & heure</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {logs.map((log) => {
                  const meta = metaFor(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{formatDateTime(log.timestamp)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                            {log.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{log.user_nom_complet}</div>
                            <div className="text-xs text-gray-500">@{log.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <Badge variant={meta.color} size="sm">{meta.label}</Badge>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">{log.module || '-'}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">{log.description}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{log.ip_address || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Sessions utilisateurs */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-dark flex items-center gap-2">
            <Icon name="ShieldCheckIcon" size="md" /> Sessions récentes (connexions / déconnexions)
          </h3>
        </div>
        {sessions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucune session enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody>
                {sessions.map((s) => {
                  const meta = metaFor(s.action);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 border-t">
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{formatDateTime(s.timestamp)}</td>
                      <td className="px-6 py-3 text-sm font-medium text-dark">{s.user_nom_complet || s.username}</td>
                      <td className="px-6 py-3">
                        <Badge variant={meta.color} size="sm">{meta.label}</Badge>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{s.ip_address || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ActivityLogs;