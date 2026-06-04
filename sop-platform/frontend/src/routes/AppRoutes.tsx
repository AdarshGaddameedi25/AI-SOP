import React, { JSX } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from '../layouts/AppLayout'

import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'

import AuthorDashboard from '../pages/author/AuthorDashboard'
import SOPEditor from '../pages/author/SOPEditor'
import SOPDetail from '../pages/author/SOPDetail'
import CreateSOPPage from '../pages/author/CreateSOPPage'

import ReviewerDashboard from '../pages/reviewer/ReviewerDashboard'
import ReviewerDetail from '../pages/reviewer/ReviewerDetail'

import ApproverDashboard from '../pages/approver/ApproverDashboard'
import ApproverDetail from '../pages/approver/ApproverDetail'

import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminUsers from '../pages/admin/AdminUsers'
import AuditLogs from '../pages/admin/AuditLogs'

import { useAuth } from '../context/AuthContext'
import { Role } from '../types'

export default function AppRoutes(): JSX.Element {
  const { isAuthenticated, user } = useAuth()

  const getDashboardRedirect = (role: Role) => {
    const redirects: Record<Role, string> = {
      author: '/author/sops',
      reviewer: '/reviewer',
      approver: '/approver',
      admin: '/admin'
    }
    return redirects[role] || '/login'
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated && user ? (
            <Navigate to={getDashboardRedirect(user.role)} replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated && user ? (
            <Navigate to={getDashboardRedirect(user.role)} replace />
          ) : (
            <Register />
          )
        }
      />

      <Route element={<ProtectedRoute allowedRoles={['author']} />}>
        <Route element={<AppLayout />}>
          <Route path="/author/sops" element={<AuthorDashboard />} />
          <Route path="/author/sop/:id" element={<SOPDetail />} />
          <Route path="/author/create" element={<CreateSOPPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/author/editor/:id" element={<SOPEditor />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['reviewer']} />}>
        <Route element={<AppLayout />}>
          <Route path="/reviewer" element={<ReviewerDashboard />} />
          <Route path="/reviewer/sop/:id" element={<ReviewerDetail />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['approver']} />}>
        <Route element={<AppLayout />}>
          <Route path="/approver" element={<ApproverDashboard />} />
          <Route path="/approver/sop/:id" element={<ApproverDetail />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/sop/:id" element={<SOPDetail />} />
        </Route>
      </Route>

      <Route
        path="/"
        element={
          isAuthenticated && user ? (
            <Navigate to={getDashboardRedirect(user.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
