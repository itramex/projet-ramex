import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import Login from './components/common/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { sessionManager } from './services/sessionManager';
import { tokenStorage } from './services/tokenStorage';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const ProducteurList = lazy(() => import('./components/producteurs/ProducteurList'));
const CooperativeList = lazy(() => import('./components/cooperatives/CooperativeList'));
const ParcelleList = lazy(() => import('./components/parcelles/ParcelleList'));
const TracabilityDashboard = lazy(() => import('./components/tracabilite/TracabilityDashboard'));
const BonCollecteList = lazy(() => import('./components/tracabilite/BonCollecteList'));
const BonCollecteForm = lazy(() => import('./components/tracabilite/BonCollecteForm'));
const FicheCollecteList = lazy(() => import('./components/tracabilite/FicheCollecteList'));
const FicheCollecteForm = lazy(() => import('./components/tracabilite/FicheCollecteForm'));
const BonTransportList = lazy(() => import('./components/tracabilite/BonTransportList'));
const BonTransportForm = lazy(() => import('./components/tracabilite/BonTransportForm'));
const LotTraitementList = lazy(() => import('./components/tracabilite/LotTraitementList'));
const LotTraitementForm = lazy(() => import('./components/tracabilite/LotTraitementForm'));
const ColisList = lazy(() => import('./components/tracabilite/ColisList'));
const ColisForm = lazy(() => import('./components/tracabilite/ColisForm'));
const CommandeExportList = lazy(() => import('./components/tracabilite/CommandeExportList'));
const CommandeExportForm = lazy(() => import('./components/tracabilite/CommandeExportForm'));
const Menage = lazy(() => import('./components/menages/Menage'));
const Activite = lazy(() => import('./components/activite/Activite'));
const FormationsCertifications = lazy(() => import('./components/formations/FormationsCertifications'));
const UserManagement = lazy(() => import('./components/users/UserManagement'));
const Chatbot = lazy(() => import('./components/common/Chatbot'));
const ActiviteList = lazy(() => import('./components/recommandations/ActiviteList'));
const RecommendationList = lazy(() => import('./components/recommandations/RecommendationList'));
const RecommendationDashboard = lazy(() => import('./components/recommandations/RecommendationDashboard'));
const ComponentsDemo = lazy(() => import('./components/common/ComponentsDemo'));
const HistoryAnalysisPage = lazy(() => import('./components/history/HistoryAnalysisPage'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-chick-yellow"></div>
      <p className="mt-4 text-gray-600">Chargement...</p>
    </div>
  </div>
);

function App() {
  const [isChatbotOpen, setChatbotOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Initialiser la session au chargement
    const initSession = async () => {
      const result = await sessionManager.initializeSession();
      setIsAuthenticated(result.authenticated);
      setIsInitialized(true);
    };

    initSession();

    // Écouter les événements de session
    const unsubscribe = sessionManager.addListener((event) => {
      if (event === 'session_expired' || event === 'session_cleared') {
        setIsAuthenticated(false);
      } else if (event === 'token_refreshed') {
        setIsAuthenticated(true);
      }
    });

    // Gérer la visibilité de la page (écran éteint/rallumé)
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // Page redevient visible, vérifier la session
        const isValid = await sessionManager.checkSession();
        if (!isValid) {
          setIsAuthenticated(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Afficher un loader pendant l'initialisation
  if (!isInitialized) {
    return <LoadingFallback />;
  }

  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Route publique */}
          <Route path="/" element={<Login />} />
          
          {/* Demo des composants de base */}
          <Route path="/components-demo" element={<ComponentsDemo />} />

          {/* Routes protégées */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/producteurs" element={<ProtectedRoute><ProducteurList /></ProtectedRoute>} />
          <Route path="/cooperatives" element={<ProtectedRoute><CooperativeList /></ProtectedRoute>} />
          <Route path="/menage" element={<ProtectedRoute><Menage /></ProtectedRoute>} />
          <Route path="/activite" element={<ProtectedRoute><Activite /></ProtectedRoute>} />
          <Route path="/parcelles" element={<ProtectedRoute><ParcelleList /></ProtectedRoute>} />
          <Route path="/formations" element={<ProtectedRoute><FormationsCertifications /></ProtectedRoute>} />

          {/* Recommandations */}
          <Route path="/recommandations" element={<ProtectedRoute><RecommendationDashboard /></ProtectedRoute>} />
          <Route path="/recommandations/activites" element={<ProtectedRoute><ActiviteList /></ProtectedRoute>} />
          <Route path="/recommandations/liste" element={<ProtectedRoute><RecommendationList /></ProtectedRoute>} />

          {/* Historique */}
          <Route path="/historique" element={<ProtectedRoute><HistoryAnalysisPage /></ProtectedRoute>} />
          <Route path="/historique/analyse" element={<ProtectedRoute><HistoryAnalysisPage /></ProtectedRoute>} />

          {/* ==================== MODULE TRAÇABILITÉ ==================== */}

          {/* Dashboard */}
          <Route path="/tracabilite" element={<ProtectedRoute><TracabilityDashboard /></ProtectedRoute>} />
          <Route path="/tracabilite/dashboard" element={<ProtectedRoute><TracabilityDashboard /></ProtectedRoute>} />

          {/* Bons de Collecte */}
          <Route path="/tracabilite/bons-collecte" element={<ProtectedRoute><BonCollecteList /></ProtectedRoute>} />
          <Route path="/tracabilite/bons-collecte/create" element={<ProtectedRoute><BonCollecteForm /></ProtectedRoute>} />
          <Route path="/tracabilite/bons-collecte/:id" element={<ProtectedRoute><BonCollecteForm /></ProtectedRoute>} />
          <Route path="/tracabilite/bons-collecte/:id/edit" element={<ProtectedRoute><BonCollecteForm /></ProtectedRoute>} />

          {/* Fiches de Collecte */}
          <Route path="/tracabilite/fiches-collecte" element={<ProtectedRoute><FicheCollecteList /></ProtectedRoute>} />
          <Route path="/tracabilite/fiches-collecte/create" element={<ProtectedRoute><FicheCollecteForm /></ProtectedRoute>} />
          <Route path="/tracabilite/fiches-collecte/:id" element={<ProtectedRoute><FicheCollecteForm /></ProtectedRoute>} />
          <Route path="/tracabilite/fiches-collecte/:id/edit" element={<ProtectedRoute><FicheCollecteForm /></ProtectedRoute>} />

          {/* Bons de Transport */}
          <Route path="/tracabilite/bons-transport" element={<ProtectedRoute><BonTransportList /></ProtectedRoute>} />
          <Route path="/tracabilite/bons-transport/create" element={<ProtectedRoute><BonTransportForm /></ProtectedRoute>} />
          <Route path="/tracabilite/bons-transport/:id" element={<ProtectedRoute><BonTransportForm /></ProtectedRoute>} />
          <Route path="/tracabilite/bons-transport/:id/edit" element={<ProtectedRoute><BonTransportForm /></ProtectedRoute>} />

          {/* Lots de Traitement */}
          <Route path="/tracabilite/lots-traitement" element={<ProtectedRoute><LotTraitementList /></ProtectedRoute>} />
          <Route path="/tracabilite/lots-traitement/create" element={<ProtectedRoute><LotTraitementForm /></ProtectedRoute>} />
          <Route path="/tracabilite/lots-traitement/:id" element={<ProtectedRoute><LotTraitementForm /></ProtectedRoute>} />
          <Route path="/tracabilite/lots-traitement/:id/edit" element={<ProtectedRoute><LotTraitementForm /></ProtectedRoute>} />

          {/* Colis */}
          <Route path="/tracabilite/colis" element={<ProtectedRoute><ColisList /></ProtectedRoute>} />
          <Route path="/tracabilite/colis/create" element={<ProtectedRoute><ColisForm /></ProtectedRoute>} />
          <Route path="/tracabilite/colis/:id" element={<ProtectedRoute><ColisForm /></ProtectedRoute>} />
          <Route path="/tracabilite/colis/:id/edit" element={<ProtectedRoute><ColisForm /></ProtectedRoute>} />

          {/* Commandes d'Export */}
          <Route path="/tracabilite/commandes-export" element={<ProtectedRoute><CommandeExportList /></ProtectedRoute>} />
          <Route path="/tracabilite/commandes-export/create" element={<ProtectedRoute><CommandeExportForm /></ProtectedRoute>} />
          <Route path="/tracabilite/commandes-export/:id" element={<ProtectedRoute><CommandeExportForm /></ProtectedRoute>} />
          <Route path="/tracabilite/commandes-export/:id/edit" element={<ProtectedRoute><CommandeExportForm /></ProtectedRoute>} />

          {/* ==================== FIN MODULE TRAÇABILITÉ ==================== */}

          {/* Users - Admin only */}
          <Route path="/utilisateurs" element={<AdminRoute><UserManagement /></AdminRoute>} />

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Suspense>

      {/* Bouton et composant Chatbot */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setChatbotOpen(!isChatbotOpen)}
          className="bg-primary-yellow text-dark p-4 rounded-full shadow-lg hover:bg-yellow-500 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        {isChatbotOpen && (
          <Suspense fallback={<div className="text-sm text-gray-500">Chargement...</div>}>
            <Chatbot />
          </Suspense>
        )}
      </div>
    </Router>
  );
}

export default App;
