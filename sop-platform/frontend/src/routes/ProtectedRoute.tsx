import React, { JSX } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Role } from '../types'

interface ProtectedRouteProps {
  allowedRoles?: Role[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        <div style={{
          border: '2px solid var(--border)',
          borderTop: '2px solid var(--accent)',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          animation: 'spin 1s linear infinite',
          marginRight: '12px'
        }} />
        Loading session...
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleRedirects: Record<Role, string> = {
      author: '/author/sops',
      reviewer: '/reviewer',
      approver: '/approver',
      admin: '/admin'
    }
    return <Navigate to={roleRedirects[user.role] || '/login'} replace />
  }

  return <Outlet />
}
