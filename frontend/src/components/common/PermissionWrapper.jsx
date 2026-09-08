import { canCreate, canUpdate, canDelete, canImport, isAdmin } from '../../utils/permissions';

/* eslint-disable react-refresh/only-export-components -- Fichier de wrappers :
   withPermission est un HOC (fonction d'ordre supérieur), pas un composant React.
   Son export depuis ce module est volontaire. */

/**
 * Wrapper component that only renders children if user has permission
 */
export const CanCreate = ({ children, fallback = null }) => {
  return canCreate() ? children : fallback;
};

export const CanUpdate = ({ children, fallback = null }) => {
  return canUpdate() ? children : fallback;
};

export const CanDelete = ({ children, fallback = null }) => {
  return canDelete() ? children : fallback;
};

export const CanImport = ({ children, fallback = null }) => {
  return canImport() ? children : fallback;
};

export const AdminOnly = ({ children, fallback = null }) => {
  return isAdmin() ? children : fallback;
};

/**
 * Disable button/input if user doesn't have permission
 */
export const withPermission = (Component, permissionCheck) => {
  return (props) => {
    const hasPermission = permissionCheck();
    return <Component {...props} disabled={!hasPermission || props.disabled} />;
  };
};

export default { CanCreate, CanUpdate, CanDelete, CanImport, AdminOnly, withPermission };
