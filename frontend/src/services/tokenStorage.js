/**
 * Service de gestion sécurisée du stockage des tokens
 * 
 * Ce service gère la persistance des tokens JWT (access et refresh) dans localStorage,
 * ainsi que la validation de leur expiration.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
class TokenStorage {
  constructor() {
    this.ACCESS_TOKEN_KEY = 'access_token';
    this.REFRESH_TOKEN_KEY = 'refresh_token';
    this.TOKEN_EXPIRY_KEY = 'token_expiry';
    this.USER_DATA_KEY = 'user_data';
  }

  /**
   * Sauvegarde les tokens après login
   * 
   * @param {string} accessToken - Le token d'accès JWT
   * @param {string} refreshToken - Le token de rafraîchissement JWT
   * @param {number} expiresIn - Durée de validité en secondes
   * @returns {boolean} true si la sauvegarde a réussi, false sinon
   * 
   * Requirements: 1.1, 1.2
   */
  saveTokens(accessToken, refreshToken, expiresIn) {
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      
      // Calculer et sauvegarder le timestamp d'expiration
      const expiryTime = Date.now() + (expiresIn * 1000);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde tokens:', error);
      return false;
    }
  }

  /**
   * Récupère l'access token
   * 
   * @returns {string|null} Le token d'accès ou null s'il n'existe pas
   * 
   * Requirements: 1.3
   */
  getAccessToken() {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Récupère le refresh token
   * 
   * @returns {string|null} Le token de rafraîchissement ou null s'il n'existe pas
   * 
   * Requirements: 1.3
   */
  getRefreshToken() {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Vérifie si l'access token est expiré ou va expirer bientôt
   * 
   * @param {number} bufferMinutes - Nombre de minutes avant expiration pour considérer le token comme "expirant bientôt" (défaut: 5)
   * @returns {boolean} true si le token expire bientôt ou est expiré, false sinon
   * 
   * Requirements: 1.4
   */
  isTokenExpiringSoon(bufferMinutes = 5) {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) return true;
    
    const bufferMs = bufferMinutes * 60 * 1000;
    const expiryWithBuffer = parseInt(expiryTime) - bufferMs;
    
    return Date.now() >= expiryWithBuffer;
  }

  /**
   * Vérifie si l'access token est complètement expiré
   * 
   * @returns {boolean} true si le token est expiré, false sinon
   * 
   * Requirements: 1.4
   */
  isTokenExpired() {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) return true;
    
    return Date.now() >= parseInt(expiryTime);
  }

  /**
   * Met à jour l'access token après rafraîchissement
   * 
   * @param {string} accessToken - Le nouveau token d'accès
   * @param {number} expiresIn - Durée de validité en secondes
   * 
   * Requirements: 1.1, 1.2
   */
  updateAccessToken(accessToken, expiresIn) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    
    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Sauvegarde les données utilisateur
   * 
   * @param {Object} userData - Les données utilisateur à sauvegarder
   */
  saveUserData(userData) {
    localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
  }

  /**
   * Récupère les données utilisateur
   * 
   * @returns {Object|null} Les données utilisateur ou null si elles n'existent pas
   */
  getUserData() {
    const data = localStorage.getItem(this.USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Nettoie tous les tokens et données
   * 
   * Requirements: 3.3
   */
  clearAll() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
  }

  /**
   * Vérifie si des tokens existent
   * 
   * @returns {boolean} true si les tokens existent, false sinon
   * 
   * Requirements: 1.3
   */
  hasTokens() {
    return !!(this.getAccessToken() && this.getRefreshToken());
  }
}

// Export une instance singleton
export const tokenStorage = new TokenStorage();
