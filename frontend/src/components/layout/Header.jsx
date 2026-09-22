import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, getRoleDisplayName, isAdmin } from '../../utils/permissions';
import { tokenStorage } from '../../services/tokenStorage';
import VillagesModal from '../settings/VillagesModal';
import Button from '../common/Button';
import Icon from '../common/Icon';
import api from '../../services/api';

function Header({ sidebarOpen, setSidebarOpen, menuItems }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [villagesModalOpen, setVillagesModalOpen] = useState(false);
  const settingsRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  // Les données utilisateur du login sont persistées par tokenStorage
  // (clé « user_data ») ; getCurrentUser() n'est qu'un repli historique.
  const currentUser = tokenStorage.getUserData() || getCurrentUser();

  const handleLogout = async () => {
    try {
      // Enregistrer la déconnexion dans les logs
      await api.post('/users/logout/');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la déconnexion:', error);
    }
    localStorage.clear();
    navigate('/');
  };

  // Fermer le menu paramètres en cliquant en dehors ou avec Échap
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-3 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Bouton hamburger pour mobile */}
            <Button
              variant="ghost"
              size="sm"
              icon="Bars3Icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
              aria-label="Toggle menu"
            />
            
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                {menuItems.find((item) => item.path === location.pathname)?.title || 'Dashboard'}
              </h2>
              <p className="hidden sm:block text-sm text-gray-600">
                {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* User Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-chick-yellow flex items-center justify-center text-gray-900 font-bold flex-shrink-0">
                {localStorage.getItem('username')?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden lg:block">
                <p className="font-semibold text-gray-900">{localStorage.getItem('username') || 'Utilisateur'}</p>
                <p className="text-xs text-gray-600">
                  {(() => {
                    // Vérifier d'abord si l'utilisateur est superuser ou staff
                    if (currentUser?.is_superuser || currentUser?.is_staff) {
                      return 'Administrateur';
                    }
                    // Sinon utiliser role_display du token JWT
                    if (currentUser?.role_display) {
                      return currentUser.role_display;
                    }
                    // Fallback: utiliser la fonction pour déterminer le rôle
                    const role = localStorage.getItem('user_role');
                    return getRoleDisplayName(role);
                  })()}
                </p>
              </div>
            </div>

            {/* Settings Dropdown */}
            <div ref={settingsRef} className="relative">
              <Button
                variant="ghost"
                size="sm"
                icon="Cog6ToothIcon"
                onClick={() => setSettingsOpen(!settingsOpen)}
                aria-label="Paramètres"
              />
              
              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  {isAdmin() && (
                    <button
                      onClick={() => { setVillagesModalOpen(true); setSettingsOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <Icon name="PlusIcon" size="md" />
                      <span>Ajouter des villages</span>
                    </button>
                  )}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-xs text-gray-500">Connecté en tant que</p>
                    <p className="font-semibold truncate">{localStorage.getItem('username') || 'Utilisateur'}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 text-red-600 transition-colors"
                  >
                    <Icon name="ArrowRightOnRectangleIcon" size="md" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* #29 — Bandeau confidentialité par agence : les comptes non-responsables
          (animateur, agent de collecte) avec une agence assignée ne voient que
          les données de leur agence (voir backend users/permissions.py). */}
      {currentUser?.agence && currentUser?.see_all_data === false && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs sm:text-sm px-3 sm:px-6 py-1.5 flex items-center gap-2">
          <Icon name="InformationCircleIcon" size="sm" />
          <span>
            Données limitées à votre agence : <strong>{currentUser.agence.nom}</strong>
          </span>
        </div>
      )}

      <VillagesModal open={villagesModalOpen} onClose={() => setVillagesModalOpen(false)} />
    </>
  );
}

export default Header;
