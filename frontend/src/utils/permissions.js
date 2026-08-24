// Permission utilities for role-based access control (RBAC — Phase 2)
//
// Rôles RAMEX :
//   admin          : accès complet
//   animateur      : Certification + Développement Durable
//   superviseur    : Certification + Développement Durable (+ supervision)
//   agent_collecte : Traçabilité

export const ROLES = {
  ADMIN: 'admin',
  ANIMATEUR: 'animateur',
  SUPERVISEUR: 'superviseur',
  AGENT_COLLECTE: 'agent_collecte',
};

export const ROLE_LABELS = {
  admin: 'Administrateur',
  animateur: 'Animateur terrain',
  superviseur: 'Superviseur',
  agent_collecte: 'Agent de collecte',
};

/**
 * Get current user role from localStorage
 */
export const getCurrentUserRole = () => {
  return localStorage.getItem('user_role') || ROLES.ANIMATEUR;
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
 * Check if current user is a supervisor (admin or superviseur)
 */
export const isSuperviseur = () => {
  const role = getCurrentUserRole();
  return role === ROLES.SUPERVISEUR || isAdmin();
};

/**
 * Pilier TRACABILITÉ → réservé à `admin` et `agent_collecte`
 */
export const canManageTracabilite = () => {
  const role = getCurrentUserRole();
  return role === ROLES.AGENT_COLLECTE || isAdmin();
};

/**
 * Piliers CERTIFICATION & DÉVELOPPEMENT DURABLE →
 * réservés à `admin`, `animateur` et `superviseur`
 */
export const canManageCertificationDD = () => {
  const role = getCurrentUserRole();
  return role === ROLES.ANIMATEUR || role === ROLES.SUPERVISEUR || isAdmin();
};

/**
 * Alias : pilier Développement Durable (mêmes droits que Certification)
 */
export const canManageDD = () => canManageCertificationDD();

/**
 * Check if current user is admin or supervisor (ancien "manager")
 */
export const isAdminOrManager = () => {
  return isAdmin() || getCurrentUserRole() === ROLES.SUPERVISEUR;
};

/**
 * Check if current user is admin, supervisor, or field agent (tous les rôles métier)
 */
export const isAdminOrManagerOrAgent = () => {
  const role = getCurrentUserRole();
  return (
    role === ROLES.ADMIN ||
    role === ROLES.SUPERVISEUR ||
    role === ROLES.ANIMATEUR ||
    role === ROLES.AGENT_COLLECTE ||
    isAdmin()
  );
};

/**
 * Check if user has permission to perform CRUD operations on referential data
 * Only admins can create, update, delete
 */
export const canCreate = () => isAdmin();
export const canUpdate = () => isAdmin();
export const canDelete = () => isAdmin();

/**
 * Check if user can import data (Excel)
 * Tous les utilisateurs authentifiés peuvent importer sur leur pilier
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
