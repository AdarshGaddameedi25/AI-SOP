import { JSX, useEffect, useState } from 'react'
import { adminListUsersApi, adminUpdateUserRoleApi, adminDeleteUserApi } from '../../api/admin'
import { User, Role } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/formatDate'

const VALID_ROLES: Role[] = ['author', 'reviewer', 'approver', 'admin']

export default function AdminUsers(): JSX.Element {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [totalPages, setTotalPages] = useState(1)

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadUsers = async (targetPage: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminListUsersApi(targetPage, limit)
      if (res.success && res.data) {
        setUsers(res.data.users)
        setTotal(res.data.total)
        setTotalPages(res.data.pages)
        setPage(res.data.page)
      } else {
        setError(res.error || 'Failed to retrieve user directory.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'Error loading users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers(page)
  }, [page])

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setError(null)
    setSuccess(null)
    setActionLoading(userId)

    try {
      const res = await adminUpdateUserRoleApi(userId, newRole)
      if (res.success && res.data) {
        setSuccess(`User role updated successfully to ${newRole.toUpperCase()}.`)
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(res.error || 'Failed to assign role.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'Role promotion request failed.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete the user '${username}'? This action cannot be undone.`)) {
      return
    }

    setError(null)
    setSuccess(null)
    setActionLoading(userId)

    try {
      const res = await adminDeleteUserApi(userId)
      if (res.success) {
        setSuccess(`User '${username}' deleted successfully.`)
        setUsers(users.filter(u => String(u.id) !== userId))
        setTotal(prev => prev - 1)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(res.error || 'Failed to delete user.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'User deletion failed.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', width: '100%' }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--sp-4)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          User Directory & Privilege Management
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Assign operational roles (Author, Reviewer, Approver, Admin) to enforce regulatory workflow segregation.
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'var(--error-subtle)',
          color: 'var(--error)',
          padding: 'var(--sp-3) var(--sp-4)',
          borderRadius: 'var(--r-sm)',
          fontSize: '13px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          backgroundColor: 'var(--success-subtle)',
          color: 'var(--success)',
          padding: 'var(--sp-3) var(--sp-4)',
          borderRadius: 'var(--r-sm)',
          fontSize: '13px',
          border: '1px solid rgba(34, 197, 94, 0.2)'
        }}>
          {success}
        </div>
      )}

      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 0',
          color: 'var(--text-secondary)'
        }}>
          <div style={{
            border: '2px solid var(--border)',
            borderTop: '2px solid var(--accent)',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            animation: 'spin 1s linear infinite',
            marginRight: '12px'
          }} />
          Loading user records...
        </div>
      ) : users.length === 0 ? (
        
        <div style={{
          border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--r-lg)',
          padding: '80px var(--sp-6)',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.01)'
        }}>
          <span style={{ fontSize: '40px' }}></span>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: 'var(--sp-4)', margin: 0 }}>
            No users registered yet.
          </p>
        </div>
      ) : (
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            backgroundColor: 'var(--bg-secondary)',
            overflow: 'hidden'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  color: 'var(--text-secondary)'
                }}>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>User ID</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Username</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Email Address</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Registration Date</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Active Role</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = String(u.id) === String(currentUser?.id)
                  
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        USR-{u.id}
                      </td>

                      <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {u.username} {isSelf && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(You)</span>}
                      </td>

                      <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-secondary)' }}>
                        {u.email}
                      </td>

                      <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-muted)' }}>
                        {formatDate(u.created_at)}
                      </td>

                      <td style={{ padding: 'var(--sp-4) var(--sp-6)' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: '100px',
                          backgroundColor: u.role === 'admin' ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                          color: u.role === 'admin' ? 'var(--accent-text)' : 'var(--text-primary)',
                          border: u.role === 'admin' ? '1px solid rgba(99,102,241,0.2)' : '1px solid var(--border)'
                        }}>
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: 'var(--sp-4) var(--sp-6)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(String(u.id), e.target.value as Role)}
                          disabled={isSelf || actionLoading === String(u.id)}
                          title={isSelf ? 'You cannot modify your own administrative privileges' : ''}
                          style={{
                            padding: '4px var(--sp-2)',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--r-sm)',
                            color: isSelf ? 'var(--text-muted)' : 'var(--text-primary)',
                            fontSize: '12px',
                            outline: 'none',
                            cursor: isSelf ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {VALID_ROLES.map(role => (
                            <option key={role} value={role}>{role.toUpperCase()}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleDeleteUser(String(u.id), u.username)}
                          disabled={isSelf || actionLoading === String(u.id)}
                          title={isSelf ? 'Admins cannot delete themselves' : 'Delete User'}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--error)',
                            borderRadius: 'var(--r-sm)',
                            color: 'var(--error)',
                            cursor: isSelf || actionLoading === String(u.id) ? 'not-allowed' : 'pointer',
                            opacity: isSelf || actionLoading === String(u.id) ? 0.5 : 1,
                            fontSize: '12px',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-2)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing page {page} of {totalPages} ({total} users)
              </span>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
