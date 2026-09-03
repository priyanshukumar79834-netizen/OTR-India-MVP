import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { clearToken, getToken, setToken } from '../api/client';

interface AuthState {
  isAuthenticated: boolean;
  otrId: string | null;
  login: (token: string, otrId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const OTR_ID_KEY = 'otr_india_otr_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [otrId, setOtrId] = useState<string | null>(() => sessionStorage.getItem(OTR_ID_KEY));

  const login = useCallback((newToken: string, newOtrId: string) => {
    setToken(newToken);
    sessionStorage.setItem(OTR_ID_KEY, newOtrId);
    setTokenState(newToken);
    setOtrId(newOtrId);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    sessionStorage.removeItem(OTR_ID_KEY);
    setTokenState(null);
    setOtrId(null);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated: !!token, otrId, login, logout }),
    [token, otrId, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
