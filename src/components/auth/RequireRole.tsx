import React from 'react';
import { useAuth, UserRole } from '../../contexts/AuthContext';

interface RequireRoleProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { profile, loading } = useAuth();

  if (loading) return null;
  
  if (!profile || !roles.includes(profile.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children, fallback = null }: Omit<RequireRoleProps, 'roles'>) {
  return <RequireRole roles={['admin']} fallback={fallback}>{children}</RequireRole>;
}

export function RequireRecruiter({ children, fallback = null }: Omit<RequireRoleProps, 'roles'>) {
  return <RequireRole roles={['recruiter']} fallback={fallback}>{children}</RequireRole>;
}

export function RequireStudent({ children, fallback = null }: Omit<RequireRoleProps, 'roles'>) {
  return <RequireRole roles={['student']} fallback={fallback}>{children}</RequireRole>;
}
