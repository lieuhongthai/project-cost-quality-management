import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AbilityContext, buildAbilityRules, createAppAbility } from '@/ability';
import { authApi, setAuthToken } from '@/services/api';
import type { AuthUser } from '@/types/auth';

const AUTH_TOKEN_KEY = 'pcqm.auth.token';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshProfile: () => Promise<AuthUser | null>;
  changeCredentials: (payload: { newPassword: string; newUsername?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ability] = useState(() => createAppAbility());

  const applyUser = useCallback(
    (nextUser: AuthUser | null) => {
      setUser(nextUser);
      ability.update(buildAbilityRules(nextUser?.permissions ?? []));
    },
    [ability],
  );

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      applyUser(null);
      return null;
    }
    setAuthToken(token);
    try {
      const response = await authApi.me();
      const profile = response.data;
      applyUser(profile);
      return profile;
    } catch {
      setAuthToken();
      localStorage.removeItem(AUTH_TOKEN_KEY);
      applyUser(null);
      return null;
    }
  }, [applyUser]);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await authApi.login({ username, password });
      const { accessToken, user: nextUser } = response.data;
      localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
      setAuthToken(accessToken);
      applyUser(nextUser);
      return nextUser;
    },
    [applyUser],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken();
    applyUser(null);
  }, [applyUser]);

  const changeCredentials = useCallback(
    async (payload: { newPassword: string; newUsername?: string }) => {
      await authApi.changeCredentials(payload);
      await refreshProfile();
    },
    [refreshProfile],
  );

  useEffect(() => {
    refreshProfile().finally(() => setIsLoading(false));
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
      refreshProfile,
      changeCredentials,
    }),
    [user, isLoading, login, logout, refreshProfile, changeCredentials],
  );

  return (
    <AuthContext.Provider value={value}>
      <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
