import { useState, useEffect } from 'react';
import axios from 'axios';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Service pour les utilisateurs
export const userService = {
  // Liste des utilisateurs
  getUsers: (params = {}) => {
    return axios.get(`${API_URL}/users/`, {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Détails d'un utilisateur
  getUser: (id) => {
    return axios.get(`${API_URL}/users/${id}/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Créer un utilisateur
  createUser: (data) => {
    return axios.post(`${API_URL}/users/`, data, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Mettre à jour un utilisateur
  updateUser: (id, data) => {
    return axios.put(`${API_URL}/users/${id}/`, data, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Supprimer un utilisateur
  deleteUser: (id) => {
    return axios.delete(`${API_URL}/users/${id}/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Statistiques
  getStatistics: () => {
    return axios.get(`${API_URL}/users/statistics/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Changer mot de passe
  changePassword: (id, data) => {
    return axios.post(`${API_URL}/users/${id}/change_password/`, data, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Réinitialiser mot de passe (admin)
  resetPassword: (id, data) => {
    return axios.post(`${API_URL}/users/${id}/reset_password/`, data, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Activer/Désactiver
  toggleActive: (id) => {
    return axios.post(`${API_URL}/users/${id}/toggle_active/`, {}, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Journaux d'activité
  getActivityLogs: (params = {}) => {
    return axios.get(`${API_URL}/activity-logs/`, {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Statistiques des activités
  getActivityStatistics: () => {
    return axios.get(`${API_URL}/activity-logs/statistics/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },

  // Sessions utilisateurs
  getUserSessions: (params = {}) => {
    return axios.get(`${API_URL}/activity-logs/user_sessions/`, {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    });
  },
};

function UserManagement() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const roles = [
    { value: 'admin', label: 'Administrateur', color: 'red' },
    { value: 'manager', label: 'Gestionnaire', color: 'blue' },
    { value: 'agent', label: 'Agent de terrain', color: 'green' },
    { value: 'viewer', label: 'Visualiseur', color: 'gray' },
  ];

  const tabs = [
    { id: 'users', label: 'Utilisateurs', icon: 'UsersIcon' },
    { id: 'logs', label: 'Journaux d\'activité', icon: 'ClipboardDocumentListIcon' },
  ];

  useEffect(() => {
    if (activeTab === 'users') {
      loadData();
    }
  }, [search, roleFilter, statusFilter, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.is_active = statusFilter;

      const [usersRes, statsRes] = await Promise.all([
        userService.getUsers(params),
        userService.getStatistics()
      ]);

      setUsers(usersRes.data.results || usersRes.data);
      setStatistics(statsRes.data);
      setError('');
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      await userService.deleteUser(id);
      loadData();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await userService.toggleActive(id);
      loadData();
    } catch (err) {
      alert('Erreur lors de la modification du statut');
    }
  };

  const getRoleBadgeColor = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.color : 'gray';
  };

  const getRoleLabel = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark">Gestion des Utilisateurs</h1>
          <p className="text-gray-600 mt-1">Gérez les accès et permissions utilisateurs</p>
        </div>
        {activeTab === 'users' && (
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            icon="PlusIcon"
          >
            Nouvel Utilisateur
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-chick-yellow text-dark'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon name={tab.icon} size="sm" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'users' ? (
        <UsersTab
          users={users}
          statistics={statistics}
          loading={loading}
          error={error}
          search={search}
          setSearch={setSearch}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          roles={roles}
          handleDelete={handleDelete}
          handleToggleActive={handleToggleActive}
          getRoleBadgeColor={getRoleBadgeColor}
          getRoleLabel={getRoleLabel}
          setSelectedUser={setSelectedUser}
          setShowEditModal={setShowEditModal}
          setShowPasswordModal={setShowPasswordModal}
        />
      ) : (
        <ActivityLogsTab users={users} />
      )}

      {/* Modals */}
      {showCreateModal && (
        <UserCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
          roles={roles}
        />
      )}

      {showEditModal && selectedUser && (
        <UserEditModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={loadData}
          roles={roles}
        />
      )}

      {showPasswordModal && selectedUser && (
        <PasswordResetModal
          user={selectedUser}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

// Onglet Utilisateurs
function UsersTab({
  users, statistics, loading, error, search, setSearch,
  roleFilter, setRoleFilter, statusFilter, setStatusFilter, roles,
  handleDelete, handleToggleActive, getRoleBadgeColor, getRoleLabel,
  setSelectedUser, setShowEditModal, setShowPasswordModal
}) {
  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-gray-600 text-sm font-medium">Total Utilisateurs</div>
            <div className="text-3xl font-bold text-dark mt-2">{statistics.total_users}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-gray-600 text-sm font-medium">Actifs</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{statistics.active_users}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="text-gray-600 text-sm font-medium">Inactifs</div>
            <div className="text-3xl font-bold text-red-600 mt-2">{statistics.inactive_users}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-gray-600 text-sm font-medium">Administrateurs</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{statistics.admin_count}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="text-gray-600 text-sm font-medium">Super Users</div>
            <div className="text-3xl font-bold text-chick-yellow mt-2">{statistics.superuser_count}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Icon name="MagnifyingGlassIcon" size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">Tous les rôles</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chick-yellow mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-chick-yellow flex items-center justify-center text-dark font-bold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.nom_complet}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(user.is_superuser || user.is_staff) ? (
                          <Badge variant="error" size="sm">
                            Administrateur
                          </Badge>
                        ) : user.profile && (
                          <Badge 
                            variant={
                              getRoleBadgeColor(user.profile.role) === 'red' ? 'error' :
                              getRoleBadgeColor(user.profile.role) === 'blue' ? 'info' :
                              getRoleBadgeColor(user.profile.role) === 'green' ? 'success' : 'neutral'
                            }
                            size="sm"
                          >
                            {getRoleLabel(user.profile.role)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={user.is_active ? 'success' : 'error'}
                          size="sm"
                        >
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.derniere_connexion 
                          ? new Date(user.derniere_connexion).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Jamais'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordModal(true);
                          }}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Mot de passe
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id)}
                          className={`${user.is_active ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          {user.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Onglet Journaux d'activité
function ActivityLogsTab({ users }) {
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    days: '7',
    search: ''
  });

  const actionTypes = [
    { value: 'login', label: 'Connexion', icon: 'KeyIcon', color: 'green' },
    { value: 'logout', label: 'Déconnexion', icon: 'ArrowRightOnRectangleIcon', color: 'gray' },
    { value: 'create', label: 'Création', icon: 'PlusIcon', color: 'blue' },
    { value: 'update', label: 'Modification', icon: 'PencilIcon', color: 'yellow' },
    { value: 'delete', label: 'Suppression', icon: 'TrashIcon', color: 'red' },
    { value: 'view', label: 'Consultation', icon: 'EyeIcon', color: 'purple' },
    { value: 'export', label: 'Export', icon: 'ArrowDownTrayIcon', color: 'indigo' },
    { value: 'import', label: 'Import', icon: 'ArrowUpTrayIcon', color: 'teal' },
  ];

  useEffect(() => {
    loadLogs();
    loadStatistics();
  }, [filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.user) params.user = filters.user;
      if (filters.action) params.action = filters.action;
      if (filters.days) params.days = filters.days;
      if (filters.search) params.search = filters.search;

      const response = await userService.getActivityLogs(params);
      setLogs(response.data.results || response.data);
      setError('');
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des journaux');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await userService.getActivityStatistics();
      setStatistics(response.data);
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  const getActionIcon = (action) => {
    const actionType = actionTypes.find(a => a.value === action);
    return actionType ? actionType.icon : 'ClipboardDocumentListIcon';
  };

  const getActionColor = (action) => {
    const actionType = actionTypes.find(a => a.value === action);
    return actionType ? actionType.color : 'gray';
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-gray-600 text-sm font-medium">Aujourd'hui</div>
            <div className="text-3xl font-bold text-dark mt-2">{statistics.today_count}</div>
            <div className="text-xs text-gray-500 mt-1">activités</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-gray-600 text-sm font-medium">Cette semaine</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{statistics.week_count}</div>
            <div className="text-xs text-gray-500 mt-1">activités</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-gray-600 text-sm font-medium">Ce mois</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{statistics.month_count}</div>
            <div className="text-xs text-gray-500 mt-1">activités</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="text-gray-600 text-sm font-medium">Connexions récentes</div>
            <div className="text-3xl font-bold text-chick-yellow mt-2">
              {statistics.by_action?.login || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">cette semaine</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Icon name="MagnifyingGlassIcon" size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            />
          </div>
          <div>
            <select
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">Tous les utilisateurs</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.nom_complet || user.username}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="">Toutes les actions</option>
              {actionTypes.map(action => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filters.days}
              onChange={(e) => setFilters({ ...filters, days: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
            >
              <option value="1">Dernières 24h</option>
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">3 derniers mois</option>
              <option value="">Tout</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chick-yellow mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement des journaux...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Aucune activité enregistrée
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                            {log.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{log.user_nom_complet}</div>
                            <div className="text-xs text-gray-500">@{log.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={
                            getActionColor(log.action) === 'green' ? 'success' :
                            getActionColor(log.action) === 'red' ? 'error' :
                            getActionColor(log.action) === 'yellow' ? 'warning' :
                            getActionColor(log.action) === 'blue' ? 'info' : 'neutral'
                          }
                          size="sm"
                          icon={getActionIcon(log.action)}
                        >
                          {log.action_display}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.module || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal de création
function UserCreateModal({ onClose, onSuccess, roles }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    role: 'viewer',
    telephone: '',
    poste: '',
    is_active: true,
    is_staff: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await userService.createUser(formData);
      onSuccess();
      onClose();
    } catch (err) {
      const apiErrors = err.response?.data;
      if (!apiErrors) {
        setError('Erreur lors de la création');
      } else if (typeof apiErrors === 'string') {
        setError(apiErrors);
      } else if (apiErrors.detail) {
        setError(apiErrors.detail);
      } else {
        const firstKey = Object.keys(apiErrors)[0];
        const firstError = apiErrors[firstKey];
        if (Array.isArray(firstError)) {
          setError(firstError[0]);
        } else if (typeof firstError === 'string') {
          setError(firstError);
        } else {
          setError('Erreur lors de la création');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-dark">Nouvel Utilisateur</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer mot de passe *</label>
              <input
                type="password"
                value={formData.password_confirm}
                onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const selectedRole = e.target.value;
                  setFormData({
                    ...formData,
                    role: selectedRole,
                    is_staff: selectedRole === 'admin',
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
                required
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="text"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
              <input
                type="text"
                value={formData.poste}
                onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-dark text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal d'édition
function UserEditModal({ user, onClose, onSuccess, roles }) {
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    is_active: user.is_active,
    profile: {
      role: user.profile?.role || 'viewer',
      telephone: user.profile?.telephone || '',
      poste: user.profile?.poste || '',
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await userService.updateUser(user.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-dark">Modifier l'utilisateur</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <select
                value={formData.profile.role}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  profile: { ...formData.profile, role: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="text"
                value={formData.profile.telephone}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  profile: { ...formData.profile, telephone: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
              <input
                type="text"
                value={formData.profile.poste}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  profile: { ...formData.profile, poste: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-chick-yellow focus:ring-chick-yellow"
                />
                <span className="text-sm font-medium text-gray-700">Compte actif</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-dark text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
            >
              {loading ? 'Modification...' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de réinitialisation du mot de passe
function PasswordResetModal({ user, onClose }) {
  const [formData, setFormData] = useState({
    new_password: '',
    new_password_confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await userService.resetPassword(user.id, formData);
      setSuccess('Mot de passe réinitialisé avec succès');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-dark">Réinitialiser le mot de passe</h2>
          <p className="text-gray-600 mt-1">Utilisateur: {user.username}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={formData.new_password_confirm}
              onChange={(e) => setFormData({ ...formData, new_password_confirm: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chick-yellow"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-dark text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
            >
              {loading ? 'Réinitialisation...' : 'Réinitialiser'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserManagement;
