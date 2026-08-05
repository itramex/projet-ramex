import { Navigate } from 'react-router-dom';
import Layout from './layout/Layout';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default ProtectedRoute;
