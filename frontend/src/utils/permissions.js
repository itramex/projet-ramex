// Permission utilities for role-based access control

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  AGENT: 'agent',
  VIEWER: 'viewer',
};

export const ROLE_LABELS = {
  admin: 'Administrateur',
  manager: 'Gestionnaire',
  agent: 'Agent de terrain',
  viewer: 'Visualiseur',
};

/**
 * Get current user role from localStorage
 */
export const getCurrentUserRole = () => {
  return localStorage.getItem('user_role') || ROLES.VIEWER;
};

/**
 * Get current user data from localStorage
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Check if current user is admin
 */
export const isAdmin = () => {
  const role = getCurrentUserRole();
  const user = getCurrentUser();
  return role === ROLES.ADMIN || user?.is_staff || user?.is_superuser;
};

/**
 * Check if current user is admin or manager
 */
export const isAdminOrManager = () => {
  const role = getCurrentUserRole();
  return role === ROLES.ADMIN || role === ROLES.MANAGER || isAdmin();
};

/**
 * Check if current user is admin, manager, or agent
 */
export const isAdminOrManagerOrAgent = () => {
  const role = getCurrentUserRole();
  return role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.AGENT || isAdmin();
};

/**
 * Check if user has permission to perform CRUD operations
 * Only admins can create, update, delete
 */
export const canCreate = () => isAdmin();
export const canUpdate = () => isAdmin();
export const canDelete = () => isAdmin();

/**
 * Check if user can import data (Excel)
 * Admins, managers, and agents can import
 */
export const canImport = () => isAdminOrManagerOrAgent();

/**
 * Check if user can view data (all authenticated users can view)
 */
export const canView = () => {
  return !!localStorage.getItem('access_token');
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role) => {
  // If no role but user info available, check is_staff/is_superuser
  const user = getCurrentUser();
  if (!role && user) {
    if (user.is_superuser) return 'Super Administrateur';
    if (user.is_staff) return 'Administrateur';
  }
  return ROLE_LABELS[role] || role || 'Utilisateur';
};

/**
 * Check if user has specific role
 */
export const hasRole = (role) => {
  return getCurrentUserRole() === role;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (roles = []) => {
  const currentRole = getCurrentUserRole();
  return roles.includes(currentRole) || isAdmin();
};
