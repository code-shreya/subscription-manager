import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEYS = {
  access: 'submanager_access_token',
  refresh: 'submanager_refresh_token',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(TOKEN_KEYS.access));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(TOKEN_KEYS.refresh));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const storeTokens = (access, refresh) => {
    localStorage.setItem(TOKEN_KEYS.access, access);
    localStorage.setItem(TOKEN_KEYS.refresh, refresh);
    setAccessToken(access);
    setRefreshToken(refresh);
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Validate session on mount
  useEffect(() => {
    const validate = async () => {
      const storedAccess = localStorage.getItem(TOKEN_KEYS.access);
      const storedRefresh = localStorage.getItem(TOKEN_KEYS.refresh);

      if (!storedAccess) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedAccess}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user || data);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Access token expired — try refresh
        if (res.status === 401 && storedRefresh) {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefresh }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const tokens = refreshData.tokens || refreshData;
            storeTokens(tokens.accessToken, tokens.refreshToken);

            const meRes = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${tokens.accessToken}` },
            });

            if (meRes.ok) {
              const data = await meRes.json();
              setUser(data.user || data);
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          }
        }

        // All attempts failed
        clearAuth();
      } catch {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    validate();
  }, []);

  // Listen for auth-expired event from api.js
  useEffect(() => {
    const handleExpired = () => clearAuth();
    window.addEventListener('auth-expired', handleExpired);
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const tokens = data.tokens || data;
    storeTokens(tokens.accessToken, tokens.refreshToken);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const register = async (email, password, name) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    const tokens = data.tokens || data;
    storeTokens(tokens.accessToken, tokens.refreshToken);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, refreshToken, isAuthenticated, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
