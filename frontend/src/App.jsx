import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import Login from './components/common/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import PermissionRoute from './components/PermissionRoute';
import { sessionManager } from './services/sessionManager';

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
const Magasins = lazy(() => import('./components/tracabilite/Magasins'));
const Estimations = lazy(() => import('./components/tracabilite/Estimations'));
const BonsLivraison = lazy(() => import('./components/tracabilite/BonsLivraison'));
const EntreesMagasin = lazy(() => import('./components/tracabilite/EntreesMagasin'));
const FichesStock = lazy(() => import('./components/tracabilite/FichesStock'));
const ChainsTracabilite = lazy(() => import('./components/tracabilite/ChainsTracabilite'));
const CycleAnnuel = lazy(() => import('./components/cycleannuel/CycleAnnuel'));
const Menage = lazy(() => import('./components/menages/Menage'));
const Activite = lazy(() => import('./components/activite/Activite'));
const FormationsCertifications = lazy(() => import('./components/formations/FormationsCertifications'));
const CertificationSpecifications = lazy(() => import('./components/formations/CertificationSpecifications'));
const CertificationTypesManagement = lazy(() => import('./components/formations/CertificationTypesManagement'));
const ActivitesCertification = lazy(() => import('./components/formations/ActivitesCertification'));
const UserManagement = lazy(() => import('./components/users/UserManagement'));
const ActivityLogs = lazy(() => import('./components/users/ActivityLogs'));
const Chatbot = lazy(() => import('./components/common/Chatbot'));
const ActiviteList = lazy(() => import('./components/recommandations/ActiviteList'));
const RecommendationList = lazy(() => import('./components/recommandations/RecommendationList'));
const RecommendationDashboard = lazy(() => import('./components/recommandations/RecommendationDashboard'));
const ArchivesMahavelona = lazy(() => import('./components/recommandations/ArchivesMahavelona'));
const VillagesReference = lazy(() => import('./components/common/VillagesReference'));
const Dotations = lazy(() => import('./components/producteurs/Dotations'));
const ComponentsDemo = lazy(() => import('./components/common/ComponentsDemo'));
const HistoryAnalysisPage = lazy(() => import('./components/history/HistoryAnalysisPage'));
const GeographieManagement = lazy(() => import('./components/geographie/GeographieManagement'));
const DeveloppementDurable = lazy(() => import('./components/developpementdurable/DeveloppementDurable'));

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
  // L'état d'authentification est maintenu via le sessionManager ; la valeur
  // n'est pas lue directement ici (ProtectedRoute gère la redirection).
  const [, setIsAuthenticated] = useState(false);

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
          <Route path="/formations" element={<PermissionRoute permission="certificationDD"><FormationsCertifications /></PermissionRoute>} />
          <Route path="/formations/certification-types" element={<PermissionRoute permission="certificationDD"><CertificationTypesManagement /></PermissionRoute>} />
          <Route path="/formations/specifications" element={<PermissionRoute permission="certificationDD"><CertificationSpecifications /></PermissionRoute>} />
          <Route path="/formations/activites" element={<PermissionRoute permission="certificationDD"><ActivitesCertification /></PermissionRoute>} />

          {/* Géographie */}
          <Route path="/geographie" element={<ProtectedRoute><GeographieManagement /></ProtectedRoute>} />

          {/* Développement Durable */}
          <Route path="/developpement-durable" element={<PermissionRoute permission="certificationDD"><DeveloppementDurable /></PermissionRoute>} />

          {/* Recommandations */}
          <Route path="/recommandations" element={<ProtectedRoute><RecommendationDashboard /></ProtectedRoute>} />
          <Route path="/recommandations/activites" element={<ProtectedRoute><ActiviteList /></ProtectedRoute>} />
          <Route path="/recommandations/liste" element={<ProtectedRoute><RecommendationList /></ProtectedRoute>} />
          <Route path="/recommandations/archives" element={<ProtectedRoute><ArchivesMahavelona /></ProtectedRoute>} />
          {/* Villages de référence (import Excel inclus) */}
          <Route path="/villages" element={<ProtectedRoute><VillagesReference /></ProtectedRoute>} />
          {/* Dotations (gestion centrale) */}
          <Route path="/dotations" element={<ProtectedRoute><Dotations /></ProtectedRoute>} />

          {/* Historique */}
          <Route path="/historique" element={<ProtectedRoute><HistoryAnalysisPage /></ProtectedRoute>} />
          <Route path="/historique/analyse" element={<ProtectedRoute><HistoryAnalysisPage /></ProtectedRoute>} />

          {/* ==================== MODULE TRAÇABILITÉ ==================== */}

          {/* Dashboard */}
          <Route path="/tracabilite" element={<PermissionRoute permission="tracabilite"><TracabilityDashboard /></PermissionRoute>} />
          <Route path="/tracabilite/dashboard" element={<PermissionRoute permission="tracabilite"><TracabilityDashboard /></PermissionRoute>} />

          {/* Bons de Collecte */}
          <Route path="/tracabilite/bons-collecte" element={<PermissionRoute permission="tracabilite"><BonCollecteList /></PermissionRoute>} />
          <Route path="/tracabilite/bons-collecte/create" element={<PermissionRoute permission="tracabilite"><BonCollecteForm /></PermissionRoute>} />
          <Route path="/tracabilite/bons-collecte/:id" element={<PermissionRoute permission="tracabilite"><BonCollecteForm /></PermissionRoute>} />
          <Route path="/tracabilite/bons-collecte/:id/edit" element={<PermissionRoute permission="tracabilite"><BonCollecteForm /></PermissionRoute>} />

          {/* Fiches de Collecte */}
          <Route path="/tracabilite/fiches-collecte" element={<PermissionRoute permission="tracabilite"><FicheCollecteList /></PermissionRoute>} />
          <Route path="/tracabilite/fiches-collecte/create" element={<PermissionRoute permission="tracabilite"><FicheCollecteForm /></PermissionRoute>} />
          <Route path="/tracabilite/fiches-collecte/:id" element={<PermissionRoute permission="tracabilite"><FicheCollecteForm /></PermissionRoute>} />
          <Route path="/tracabilite/fiches-collecte/:id/edit" element={<PermissionRoute permission="tracabilite"><FicheCollecteForm /></PermissionRoute>} />

          {/* Bons de Transport */}
          <Route path="/tracabilite/bons-transport" element={<PermissionRoute permission="tracabilite"><BonTransportList /></PermissionRoute>} />
          <Route path="/tracabilite/bons-transport/create" element={<PermissionRoute permission="tracabilite"><BonTransportForm /></PermissionRoute>} />
          <Route path="/tracabilite/bons-transport/:id" element={<PermissionRoute permission="tracabilite"><BonTransportForm /></PermissionRoute>} />
          <Route path="/tracabilite/bons-transport/:id/edit" element={<PermissionRoute permission="tracabilite"><BonTransportForm /></PermissionRoute>} />

          {/* Lots de Traitement */}
          <Route path="/tracabilite/lots-traitement" element={<PermissionRoute permission="tracabilite"><LotTraitementList /></PermissionRoute>} />
          <Route path="/tracabilite/lots-traitement/create" element={<PermissionRoute permission="tracabilite"><LotTraitementForm /></PermissionRoute>} />
          <Route path="/tracabilite/lots-traitement/:id" element={<PermissionRoute permission="tracabilite"><LotTraitementForm /></PermissionRoute>} />
          <Route path="/tracabilite/lots-traitement/:id/edit" element={<PermissionRoute permission="tracabilite"><LotTraitementForm /></PermissionRoute>} />

          {/* Colis */}
          <Route path="/tracabilite/colis" element={<PermissionRoute permission="tracabilite"><ColisList /></PermissionRoute>} />
          <Route path="/tracabilite/colis/create" element={<PermissionRoute permission="tracabilite"><ColisForm /></PermissionRoute>} />
          <Route path="/tracabilite/colis/:id" element={<PermissionRoute permission="tracabilite"><ColisForm /></PermissionRoute>} />
          <Route path="/tracabilite/colis/:id/edit" element={<PermissionRoute permission="tracabilite"><ColisForm /></PermissionRoute>} />

          {/* Commandes d'Export */}
          <Route path="/tracabilite/commandes-export" element={<PermissionRoute permission="tracabilite"><CommandeExportList /></PermissionRoute>} />
          <Route path="/tracabilite/commandes-export/create" element={<PermissionRoute permission="tracabilite"><CommandeExportForm /></PermissionRoute>} />
          <Route path="/tracabilite/commandes-export/:id" element={<PermissionRoute permission="tracabilite"><CommandeExportForm /></PermissionRoute>} />
          <Route path="/tracabilite/commandes-export/:id/edit" element={<PermissionRoute permission="tracabilite"><CommandeExportForm /></PermissionRoute>} />

          {/* Magasins */}
          <Route path="/tracabilite/magasins" element={<PermissionRoute permission="tracabilite"><Magasins /></PermissionRoute>} />

          {/* Estimations de production */}
          <Route path="/tracabilite/estimations" element={<PermissionRoute permission="tracabilite"><Estimations /></PermissionRoute>} />

          {/* Bons de livraison */}
          <Route path="/tracabilite/bons-livraison" element={<PermissionRoute permission="tracabilite"><BonsLivraison /></PermissionRoute>} />

          {/* Entrées magasin */}
          <Route path="/tracabilite/entrees-magasin" element={<PermissionRoute permission="tracabilite"><EntreesMagasin /></PermissionRoute>} />

          {/* Fiches de stock */}
          <Route path="/tracabilite/fiches-stock" element={<PermissionRoute permission="tracabilite"><FichesStock /></PermissionRoute>} />

          {/* Chaînes de traçabilité (historique) */}
          <Route path="/tracabilite/chaines" element={<PermissionRoute permission="tracabilite"><ChainsTracabilite /></PermissionRoute>} />

          {/* ==================== FIN MODULE TRAÇABILITÉ ==================== */}

          {/* Cycle annuel / Calendrier agricole (transversal) */}
          <Route path="/cycle-annuel" element={<ProtectedRoute><CycleAnnuel /></ProtectedRoute>} />

          {/* Users - Admin only */}
          <Route path="/utilisateurs" element={<AdminRoute><UserManagement /></AdminRoute>} />
          {/* Journal d'activité - Admin + Superviseur */}
          <Route path="/journal" element={<PermissionRoute permission="superviseur"><ActivityLogs /></PermissionRoute>} />

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
