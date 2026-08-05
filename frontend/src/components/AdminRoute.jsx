import { Navigate } from 'react-router-dom';
import { isAdmin } from '../utils/permissions';
import Layout from './layout/Layout';

function AdminRoute({ children }) {
  const userIsAdmin = isAdmin();

  if (!userIsAdmin) {
    // Redirect non-admin users to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default AdminRoute;
