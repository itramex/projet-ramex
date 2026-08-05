import { tokenStorage } from './tokenStorage';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Gestionnaire de session avec rafraîchissement automatique
 * 
 * Ce service gère le cycle de vie de la session utilisateur, incluant :
 * - L'initialisation de la session au démarrage de l'application
 * - Le rafraîchissement automatique périodique des tokens
 * - La prévention de rafraîchissements concurrents
 * - La vérification de session au retour de l'application
 * 
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 6.1, 6.2
 */
class SessionManager {
  constructor() {
    this.refreshInterval = null;
    this.CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.listeners = [];
    this.MAX_RETRIES = 3;
    this.BASE_DELAY = 1000; // 1 seconde
  }

  /**
   * Initialise la session au démarrage de l'application
   * 
   * Vérifie si des tokens existent et sont valides, tente de rafraîchir
   * si nécessaire, et démarre le rafraîchissement automatique.
   * 
   * @returns {Promise<Object>} Objet avec authenticated (boolean) et reason (string optionnel)
   * 
   * Requirements: 3.1, 3.2
   */
  async initializeSession() {
    // Vérifier si des tokens existent
    if (!tokenStorage.hasTokens()) {
      return { authenticated: false, reason: 'no_tokens' };
    }

    // Vérifier si le token est expiré
    if (tokenStorage.isTokenExpired()) {
      // Tenter de rafraîchir
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        this.clearSession();
        return { authenticated: false, reason: 'token_expired' };
      }
    }

    // Démarrer le rafraîchissement automatique
    this.startAutoRefresh();

    return { authenticated: true };
  }

  /**
   * Démarre le rafraîchissement automatique périodique
   * 
   * Vérifie toutes les 5 minutes si le token expire bientôt et le rafraîchit
   * automatiquement si nécessaire.
   * 
   * Requirements: 2.1
   */
  startAutoRefresh() {
    // Nettoyer l'intervalle existant
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Vérifier toutes les 5 minutes
    this.refreshInterval = setInterval(async () => {
      if (tokenStorage.isTokenExpiringSoon()) {
        await this.refreshToken();
      }
    }, this.CHECK_INTERVAL);
  }

  /**
   * Arrête le rafraîchissement automatique
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Rafraîchit le token avec prévention de concurrence
   * 
   * Si un rafraîchissement est déjà en cours, retourne la promesse existante
   * pour éviter les appels multiples simultanés.
   * 
   * @returns {Promise<boolean>} true si le rafraîchissement a réussi, false sinon
   * 
   * Requirements: 2.1, 2.2, 2.3
   */
  async refreshToken() {
    // Éviter les rafraîchissements multiples simultanés
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performRefreshWithRetry();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Effectue le rafraîchissement du token avec retry et backoff exponentiel
   * 
   * Tente de rafraîchir le token jusqu'à MAX_RETRIES fois en cas d'erreur réseau,
   * avec un délai exponentiel entre chaque tentative (1s, 2s, 4s).
   * 
   * @private
   * @param {number} attempt - Numéro de la tentative actuelle (0-indexed)
   * @returns {Promise<boolean>} true si le rafraîchissement a réussi, false sinon
   * 
   * Requirements: 4.4, 4.5
   */
  async _performRefreshWithRetry(attempt = 0) {
    try {
      return await this._performRefresh();
    } catch (error) {
      // Vérifier si c'est une erreur réseau (pas une erreur 401)
      const isNetworkError = !error.response || 
                            (error.response.status >= 500) ||
                            error.code === 'ECONNABORTED' ||
                            error.code === 'ERR_NETWORK';
      
      // Si c'est une erreur 401, ne pas retry (token invalide)
      if (error.response?.status === 401) {
        this.clearSession();
        this.notifyListeners('session_expired');
        return false;
      }
      
      // Si c'est une erreur réseau et qu'on n'a pas atteint le max de retries
      if (isNetworkError && attempt < this.MAX_RETRIES - 1) {
        // Calculer le délai avec backoff exponentiel: 1s, 2s, 4s
        const delay = this.BASE_DELAY * Math.pow(2, attempt);
        
        console.log(`Tentative ${attempt + 1}/${this.MAX_RETRIES} échouée. Nouvelle tentative dans ${delay}ms...`);
        
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Réessayer
        return this._performRefreshWithRetry(attempt + 1);
      }
      
      // Max retries atteint ou erreur non-réseau
      if (attempt >= this.MAX_RETRIES - 1) {
        console.error(`Échec du rafraîchissement après ${this.MAX_RETRIES} tentatives`);
        this.clearSession();
        this.notifyListeners('session_expired');
      }
      
      return false;
    }
  }

  /**
   * Effectue le rafraîchissement du token
   * 
   * @private
   * @returns {Promise<boolean>} true si le rafraîchissement a réussi, false sinon
   * @throws {Error} Lance une erreur en cas d'échec pour permettre le retry
   * 
   * Requirements: 2.2, 2.3
   */
  async _performRefresh() {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await axios.post(`${API_URL}/token/refresh/`, {
      refresh: refreshToken
    });
    
    // Mettre à jour le token
    tokenStorage.updateAccessToken(
      response.data.access,
      15 * 60 // 15 minutes par défaut
    );

    // Si un nouveau refresh token est fourni (rotation)
    if (response.data.refresh) {
      tokenStorage.saveTokens(
        response.data.access,
        response.data.refresh,
        15 * 60
      );
    }

    // Notifier les listeners
    this.notifyListeners('token_refreshed');

    return true;
  }

  /**
   * Nettoie la session
   * 
   * Arrête le rafraîchissement automatique, supprime tous les tokens
   * et notifie les listeners.
   * 
   * Requirements: 3.3
   */
  clearSession() {
    this.stopAutoRefresh();
    tokenStorage.clearAll();
    this.notifyListeners('session_cleared');
  }

  /**
   * Enregistre un listener pour les événements de session
   * 
   * @param {Function} callback - Fonction appelée lors des événements de session
   * @returns {Function} Fonction de désinscription
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notifie tous les listeners
   * 
   * @private
   * @param {string} event - Type d'événement ('token_refreshed', 'session_expired', 'session_cleared')
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Erreur listener session:', error);
      }
    });
  }

  /**
   * Vérifie l'état de la session (appelé au retour de l'app)
   * 
   * Utilisé quand l'application revient au premier plan pour vérifier
   * si la session est toujours valide et rafraîchir si nécessaire.
   * 
   * @returns {Promise<boolean>} true si la session est valide, false sinon
   * 
   * Requirements: 6.1, 6.2
   */
  async checkSession() {
    if (!tokenStorage.hasTokens()) {
      return false;
    }

    if (tokenStorage.isTokenExpired()) {
      return await this.refreshToken();
    }

    return true;
  }
}

// Export une instance singleton
export const sessionManager = new SessionManager();
