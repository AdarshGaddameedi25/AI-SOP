import { JSX, useEffect, useState } from 'react'
import { adminGetAuditLogsApi } from '../../api/admin'
import { AuditLog } from '../../types'
import { formatDateTime } from '../../utils/formatDate'

const AUDIT_ACTIONS = [
  'SOP_CREATED',
  'SOP_UPDATED',
  'SOP_SENT_FOR_REVIEW',
  'SOP_APPROVED',
  'SOP_REJECTED',
  'SOP_RESUBMITTED',
  'SOP_ARCHIVED',
  'COMPLIANCE_CHECKED',
  'PDF_EXPORTED',
  'DOCX_EXPORTED',
  'AI_GENERATED',
  'REVIEW_REQUESTED',
  'USER_REGISTERED'
]

export default function AuditLogs(): JSX.Element {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [totalPages, setTotalPages] = useState(1)

  const [sopFilter, setSopFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async (targetPage: number) => {
    setLoading(true)
    setError(null)
    try {
      const formattedSopId = sopFilter.trim() ? sopFilter.trim() : undefined
      const formattedAction = actionFilter ? actionFilter : undefined

      const res = await adminGetAuditLogsApi(targetPage, limit, formattedSopId, formattedAction)
      if (res.success && res.data) {
        setLogs(res.data.logs)
        setTotal(res.data.total)
        setTotalPages(res.data.pages)
        setPage(res.data.page)
      } else {
        setError(res.error || 'Failed to retrieve audit ledger.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'Error loading audit logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(page)
  }, [page])

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs(1)
  }

  const handleReset = () => {
    setSopFilter('')
    setActionFilter('')
    setPage(1)
    setTimeout(() => {
      adminGetAuditLogsApi(1, limit).then(res => {
        if (res.success && res.data) {
          setLogs(res.data.logs)
          setTotal(res.data.total)
          setTotalPages(res.data.pages)
          setPage(res.data.page)
        }
      })
    }, 0)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', width: '100%' }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--sp-4)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Regulatory Audit Trail Ledger
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          FDA 21 CFR Part 11 compliant, immutable audit trail documenting all user actions, document lifecycle changes, and AI validations.
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

      <form onSubmit={handleFilterSubmit} style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: 'var(--sp-4) var(--sp-5)',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 'var(--sp-4)'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Filter by SOP Document ID
          </label>
          <input
            type="number"
            placeholder="e.g. 42"
            value={sopFilter}
            onChange={(e) => setSopFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px var(--sp-3)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ flex: 1.5 }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Filter by Action Type
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px var(--sp-3)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">-- All Actions --</option>
            {AUDIT_ACTIONS.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '8px var(--sp-4)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            style={{
              padding: '8px var(--sp-4)',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Apply Filters
          </button>
        </div>
      </form>

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
          Loading audit trail...
        </div>
      ) : logs.length === 0 ? (

        <div style={{
          border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--r-lg)',
          padding: '80px var(--sp-6)',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.01)'
        }}>
          <span style={{ fontSize: '40px' }}></span>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: 'var(--sp-4)', margin: 0 }}>
            The audit ledger is empty. Actions will appear here as they occur.
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
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Actor</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>SOP ID</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Audit Ledger Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {formatDateTime(log.timestamp)}
                    </td>

                    <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {log.username || 'System'}
                    </td>

                    <td style={{ padding: 'var(--sp-4) var(--sp-6)' }}>
                      {log.user_role ? (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: '100px',
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          color: 'var(--text-secondary)'
                        }}>
                          {log.user_role}
                        </span>
                      ) : '—'}
                    </td>

                    <td style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600, color: 'var(--accent-text)' }}>
                      {log.action}
                    </td>

                    <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {log.sop_id ? `#${log.sop_id}` : '—'}
                    </td>

                    <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-primary)' }}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-2)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing page {page} of {totalPages} ({total} entries)
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
