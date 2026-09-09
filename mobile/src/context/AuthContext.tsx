/**
 * Contexte d'authentification : session persistée (secure-store),
 * login via POST /api/token/, logout via blacklist du refresh token.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ActivityIndicator, View } from 'react-native';
import { tokenStore } from '../services/tokenStore';
import { API_BASE_URL } from '../services/api';
import { colors } from '../constants/theme';
import { AuthUser, TokenResponse } from '../types/api';

interface AuthContextValue {
  user: AuthUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaure la session sauvegardée au démarrage de l'app
  useEffect(() => {
    tokenStore
      .getUser()
      .then((saved) => setUser(saved))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (username: string, password: string) => {
    const response = await axios.post<TokenResponse>(`${API_BASE_URL}/token/`, {
      username,
      password,
    });
    await tokenStore.saveTokens(response.data.access, response.data.refresh);
    await tokenStore.saveUser(response.data.user);
    setUser(response.data.user);
  };

  const signOut = async () => {
    const refresh = await tokenStore.getRefreshToken();
    if (refresh) {
      try {
        await axios.post(`${API_BASE_URL}/token/blacklist/`, { refresh });
      } catch {
        // Le serveur est peut-être injoignable : on nettoie quand même localement
      }
    }
    await tokenStore.clear();
    setUser(null);
  };

  const value = useMemo(() => ({ user, signIn, signOut }), [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}
