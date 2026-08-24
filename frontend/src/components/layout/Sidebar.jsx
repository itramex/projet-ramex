import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isAdmin, canManageTracabilite, canManageCertificationDD } from '../../utils/permissions';
import Icon from '../common/Icon';
import { iconMap } from '../../styles/icons';

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const [tracabiliteOpen, setTracabiliteOpen] = useState(false);
  const [formationsOpen, setFormationsOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    {
      title: 'Dashboard',
      iconKey: 'dashboard',
      path: '/dashboard',
      description: 'Chiffres clés',
    },
    {
      title: 'Producteurs',
      iconKey: 'producteurs',
      path: '/producteurs',
      description: 'Gestion des producteurs',
    },
    {
      title: 'Ménage',
      iconKey: 'menage',
      path: '/menage',
      description: 'Ménages globaux',
    },
    {
      title: 'Coopératives',
      iconKey: 'cooperatives',
      path: '/cooperatives',
      description: 'Gestion des coopératives',
    },
    {
      title: 'Parcelles',
      iconKey: 'parcelles',
      path: '/parcelles',
      description: 'Gestion des parcelles',
    },
    // Développement Durable + Certification/Formation → animateur / superviseur / admin
    ...(canManageCertificationDD() ? [
      {
        title: 'Développement Durable',
        iconKey: 'location',
        path: '/developpement-durable',
        description: 'Activités et partenaires DD',
      },
      {
        title: 'Certification et Formation',
        iconKey: 'certifications',
        path: '/formations',
        description: 'Certifications et formations',
        hasSubmenu: true,
      },
    ] : []),
    {
      title: 'Activité',
      iconKey: 'activite',
      path: '/activite',
      description: 'Activité des producteurs',
    },
    {
      title: 'Recommandations',
      iconKey: 'recommandations',
      path: '/recommandations',
      description: 'Recommandations agricoles',
      disabled: true,
    },
    {
      title: 'Historique',
      iconKey: 'calendar',
      path: '/historique',
      description: 'Évolution annuelle',
    },
    // User management - admin only
    ...(isAdmin() ? [{
      title: 'Utilisateurs',
      iconKey: 'utilisateurs',
      path: '/utilisateurs',
      description: 'Gestion des utilisateurs',
    }] : []),
  ];

  const formationsItems = [
    {
      title: 'Liste des formations',
      iconKey: 'certifications',
      path: '/formations',
    },
    {
      title: 'Gestion des certifications',
      iconKey: 'certificationTypes',
      path: '/formations/certification-types',
    },
    {
      title: 'Spécifications',
      iconKey: 'information',
      path: '/formations/specifications',
    },
  ];

  const tracabiliteItems = [
    {
      title: 'Dashboard',
      iconKey: 'dashboard',
      path: '/tracabilite/dashboard',
    },
    {
      title: 'Bons de Collecte',
      iconKey: 'bonCollecte',
      path: '/tracabilite/bons-collecte',
    },
    {
      title: 'Fiches de Collecte',
      iconKey: 'ficheCollecte',
      path: '/tracabilite/fiches-collecte',
    },
    {
      title: 'Bons de Transport',
      iconKey: 'bonTransport',
      path: '/tracabilite/bons-transport',
    },
    {
      title: 'Lots de Traitement',
      iconKey: 'lotTraitement',
      path: '/tracabilite/lots-traitement',
    },
    {
      title: 'Colis',
      iconKey: 'colis',
      path: '/tracabilite/colis',
    },
    {
      title: 'Commandes Export',
      iconKey: 'commandeExport',
      path: '/tracabilite/commandes-export',
    },
  ];

  const isActive = (path) => location.pathname === path;
  const isTracabiliteActive = () => location.pathname.startsWith('/tracabilite');

  // Ouvrir automatiquement les sous-menus si on est sur une page correspondante
  useEffect(() => {
    if (location.pathname.startsWith('/tracabilite')) {
      setTracabiliteOpen(true);
    }
    if (location.pathname.startsWith('/formations')) {
      setFormationsOpen(true);
    }
  }, [location.pathname]);

  // Déterminer les classes de la sidebar selon l'état
  const getSidebarClasses = () => {
    if (sidebarOpen) {
      return 'w-64 translate-x-0';
    } else {
      return '-translate-x-full md:translate-x-0 md:w-20';
    }
  };

  return (
    <>
      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${getSidebarClasses()} bg-gray-800 text-white transition-all duration-300 flex flex-col shadow-xl fixed md:relative z-30 h-screen`}
      >
        {/* Logo & Toggle */}
        <div className="p-4 flex items-center justify-between border-b border-gray-700">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <img 
                src="/logo_re.jpg" 
                alt="Logo Ramanandraibe Exportation" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-chick-yellow">RE</h1>
                <p className="text-xs text-gray-400">Outils de gestion</p>
              </div>
            </div>
          ) : (
            <span className="text-3xl mx-auto">
              <img 
                src="/logo_re.jpg" 
                alt="Logo Ramanandraibe Exportation" 
                className="h-12 w-12 object-contain"
              />
            </span>
          )}
          
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label={sidebarOpen ? 'Réduire la sidebar' : 'Ouvrir la sidebar'}
          >
            <Icon 
              name="ChevronLeftIcon" 
              size="lg"
              className={`transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Groupe: Gestion principale */}
          {menuItems.map((item, index) => {
            // Vérifier si l'élément a un sous-menu (formations)
            if (item.hasSubmenu && item.title === 'Certification et Formation') {
              return (
                <div key={item.path || `menu-${index}`}>
                  <button
                    onClick={() => setFormationsOpen(!formationsOpen)}
                    className={`w-full flex items-center gap-4 px-4 py-3 mx-2 rounded-lg transition-all ${
                      location.pathname.startsWith('/formations')
                        ? 'bg-chick-yellow text-gray-900 font-semibold shadow-md'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon
                      name={iconMap[item.iconKey]}
                      size="lg"
                      className="flex-shrink-0"
                    />
                    {sidebarOpen && (
                      <>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs opacity-75 truncate">{item.description}</p>
                        </div>
                        <Icon
                          name="ChevronRightIcon"
                          size="md"
                          className={`transition-transform ${formationsOpen ? 'rotate-90' : ''}`}
                        />
                      </>
                    )}
                  </button>

                  {/* Sous-menu Formations */}
                  {sidebarOpen && formationsOpen && (
                    <div className="ml-4 mt-2 space-y-1 border-l-2 border-chick-yellow pl-4">
                      {formationsItems.map((subItem, subIndex) => (
                        <Link
                          key={subIndex}
                          to={subItem.path}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                            isActive(subItem.path)
                              ? 'bg-chick-yellow/20 text-chick-yellow font-medium'
                              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          <Icon
                            name={iconMap[subItem.iconKey] || iconMap.certifications}
                            size="sm"
                          />
                          <span>{subItem.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Élément normal sans sous-menu
            return (
              <Link
                key={item.path || `menu-${index}`}
                to={item.disabled ? '#' : item.path}
                className={`flex items-center gap-4 px-4 py-3 mx-2 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-chick-yellow text-gray-900 font-semibold shadow-md'
                    : item.disabled
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                <Icon
                  name={iconMap[item.iconKey]}
                  size="lg"
                  className="flex-shrink-0"
                />
                {sidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs opacity-75 truncate">{item.description}</p>
                  </div>
                )}
                {item.disabled && sidebarOpen && (
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded">Bientôt</span>
                )}
              </Link>
            );
          })}
          
          {/* Séparateur visuel */}
          {sidebarOpen && (
            <div className="mx-4 my-3 border-t border-gray-700"></div>
          )}
          
          {/* Menu Traçabilité avec sous-menu → admin / agent_collecte */}
          {canManageTracabilite() && (
          <div>
            <button
              onClick={() => setTracabiliteOpen(!tracabiliteOpen)}
              className={`w-full flex items-center gap-4 px-4 py-3 mx-2 rounded-lg transition-all ${
                isTracabiliteActive()
                  ? 'bg-chick-yellow text-gray-900 font-semibold shadow-md'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon 
                name={iconMap.tracabilite} 
                size="lg" 
                className="flex-shrink-0"
              />
              {sidebarOpen && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium truncate">Traçabilité</p>
                    <p className="text-xs opacity-75 truncate">Suivi des récoltes</p>
                  </div>
                  <Icon 
                    name="ChevronRightIcon" 
                    size="md"
                    className={`transition-transform ${tracabiliteOpen ? 'rotate-90' : ''}`}
                  />
                </>
              )}
            </button>

            {/* Sous-menu */}
            {sidebarOpen && tracabiliteOpen && (
              <div className="ml-4 mt-2 space-y-1 border-l-2 border-chick-yellow pl-4">
                {tracabiliteItems.map((item, index) => (
                  <Link
                    key={index}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                      isActive(item.path)
                        ? 'bg-chick-yellow/20 text-chick-yellow font-medium'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon 
                      name={iconMap[item.iconKey]} 
                      size="sm"
                    />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
