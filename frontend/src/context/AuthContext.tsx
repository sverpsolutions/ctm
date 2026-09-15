import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<User>;
  logout: () => void;
  hasPermission: (permissionCode: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
  isPlatformAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const { user: fetchedUser } = await authApi.getMe();
          setUser(fetchedUser);
          setToken(savedToken);
        } catch (err) {
          console.error('Session restoration failed:', err);
          localStorage.removeItem('token');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<User> => {
    const res = await authApi.login(usernameOrEmail, password);
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
    setMustChangePassword(Boolean(res.mustChangePassword));
    return res.user;
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    if (token) {
      const { user: updatedUser } = await authApi.getMe();
      setUser(updatedUser);
    }
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (user.isPlatformAdmin || user.roleName === 'Super Admin') return true;
    return user.permissions?.includes(permissionCode) || false;
  };

  const hasRole = (...roles: string[]): boolean => {
    if (!user) return false;
    if (user.isPlatformAdmin || user.roleName === 'Super Admin') return true;
    return roles.includes(user.roleName);
  };

  const isPlatformAdmin = (): boolean => {
    return Boolean(user?.isPlatformAdmin);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        mustChangePassword,
        login,
        logout,
        hasPermission,
        hasRole,
        isPlatformAdmin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
