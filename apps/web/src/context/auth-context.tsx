'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, setClientAuth, getClientActiveOrgId } from '../lib/api-client';
import { AuthenticatedUser, UserMembership } from '@bizflow/shared-types';

interface AuthContextType {
  user: AuthenticatedUser | null;
  memberships: UserMembership[];
  activeOrgId: string | null;
  isLoading: boolean;
  login: (tokens: { accessToken: string }, userData: AuthenticatedUser, initialMemberships?: UserMembership[]) => void;
  register: (tokens: { accessToken: string }, userData: AuthenticatedUser, initialMemberships?: UserMembership[]) => void;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedOrgId = getClientActiveOrgId();
    if (savedOrgId) {
      setActiveOrgId(savedOrgId);
    }
    // Attempt silent check if token in memory or check /auth/me
    refreshProfile().finally(() => setIsLoading(false));
  }, []);

  const refreshProfile = async () => {
    try {
      const response: any = await apiClient.get('/auth/me');
      if (response && response.data) {
        setUser(response.data.user);
        setMemberships(response.data.memberships || []);
        const targetOrg =
          response.data.user.activeOrganizationId ||
          getClientActiveOrgId() ||
          response.data.memberships?.[0]?.organizationId;

        if (targetOrg) {
          setActiveOrgId(targetOrg);
          setClientAuth(undefined, targetOrg);
        }
      }
    } catch {
      setUser(null);
      setMemberships([]);
    }
  };

  const login = (tokens: { accessToken: string }, userData: AuthenticatedUser, initialMemberships?: UserMembership[]) => {
    setClientAuth(tokens.accessToken, userData.activeOrganizationId);
    setUser(userData);
    if (initialMemberships && initialMemberships.length > 0) {
      setMemberships(initialMemberships);
    }
    setActiveOrgId(userData.activeOrganizationId || null);
    refreshProfile().finally(() => {
      router.push('/dashboard');
    });
  };

  const register = (tokens: { accessToken: string }, userData: AuthenticatedUser, initialMemberships?: UserMembership[]) => {
    setClientAuth(tokens.accessToken, userData.activeOrganizationId);
    setUser(userData);
    if (initialMemberships && initialMemberships.length > 0) {
      setMemberships(initialMemberships);
    }
    setActiveOrgId(userData.activeOrganizationId || null);
    refreshProfile().finally(() => {
      router.push('/dashboard');
    });
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network failure on logout
    }
    setClientAuth(null, null);
    setUser(null);
    setMemberships([]);
    setActiveOrgId(null);
    router.push('/login');
  };

  const switchOrganization = async (orgId: string) => {
    try {
      const res: any = await apiClient.post(`/organizations/${orgId}/switch`);
      if (res && res.data) {
        setActiveOrgId(orgId);
        setClientAuth(undefined, orgId);
        await refreshProfile();
        // Refresh router so current dashboard updates context
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to switch organization', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        activeOrgId,
        isLoading,
        login,
        register,
        logout,
        switchOrganization,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
