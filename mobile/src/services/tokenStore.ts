/**
 * Stockage sécurisé des tokens JWT et du profil utilisateur.
 * Sur iOS -> Keychain, sur Android -> Keystore (via expo-secure-store).
 */
import * as SecureStore from 'expo-secure-store';
import { AuthUser } from '../types/api';

const ACCESS_KEY = 'ramex_access_token';
const REFRESH_KEY = 'ramex_refresh_token';
const USER_KEY = 'ramex_user';

export const tokenStore = {
  async saveTokens(access: string, refresh: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, access),
      SecureStore.setItemAsync(REFRESH_KEY, refresh),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },

  async saveUser(user: AuthUser): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<AuthUser | null> {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  },
};
