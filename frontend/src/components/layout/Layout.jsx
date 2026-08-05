import { useState, useEffect } from 'react';
import { isAdmin } from '../../utils/permissions';
import Sidebar from './Sidebar';
import Header from './Header';

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Détecter la taille de l'écran et fermer la sidebar sur mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    // Fermer la sidebar au chargement si on est sur mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }

    // Écouter les changements de taille
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Menu items definition for Header
  const menuItems = [
    {
      title: 'Dashboard',
      path: '/dashboard',
    },
    {
      title: 'Producteurs',
      path: '/producteurs',
    },
    {
      title: 'Ménage',
      path: '/menage',
    },
    {
      title: 'Coopératives',
      path: '/cooperatives',
    },
    {
      title: 'Parcelles',
      path: '/parcelles',
    },
    {
      title: 'Certification et Formation',
      path: '/formations',
    },
    {
      title: 'Activité',
      path: '/activite',
    },
    {
      title: 'Recommandations',
      path: '/recommandations',
    },
    ...(isAdmin() ? [{
      title: 'Utilisateurs',
      path: '/utilisateurs',
    }] : []),
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full md:ml-0">
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          menuItems={menuItems}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 overflow-x-hidden">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
