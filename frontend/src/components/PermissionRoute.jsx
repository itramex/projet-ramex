import { Navigate } from 'react-router-dom';
import { canManageTracabilite, canManageCertificationDD, isSuperviseur } from '../utils/permissions';
import Layout from './layout/Layout';

// Map des vérifications de permission par pilier / rôle
const PERMISSION_CHECKS = {
  tracabilite: canManageTracabilite,
  certificationDD: canManageCertificationDD,
  superviseur: isSuperviseur, // admin + superviseur
};

/**
 * Garde de route basée sur les piliers RBAC.
 * `permission` : 'tracabilite' | 'certificationDD' | 'superviseur'
 * Redirige vers /dashboard si l'utilisateur n'a pas le droit.
 */
function PermissionRoute({ children, permission = 'tracabilite' }) {
  const check = PERMISSION_CHECKS[permission];
  const allowed = check ? check() : false;

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default PermissionRoute;