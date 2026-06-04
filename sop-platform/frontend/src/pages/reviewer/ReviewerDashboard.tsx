import { JSX, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listSopsApi } from '../../api/sop'
import { SOP } from '../../types'
import { formatDate } from '../../utils/formatDate'

export default function ReviewerDashboard(): JSX.Element {
  const navigate = useNavigate()
  const [sops, setSops] = useState<SOP[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSops = async (targetPage: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listSopsApi(targetPage, limit)
      if (res.success && res.data) {
        setSops(res.data.sops)
        setTotal(res.data.total)
        setTotalPages(res.data.pages)
        setPage(res.data.page)
      } else {
        setError(res.error || 'Failed to retrieve review queue.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSops(page)
  }, [page])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        paddingBottom: 'var(--sp-4)'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Quality Review Queue
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Audits submitted procedures, run AI compliance validations, and perform QA transitions.
          </p>
        </div>
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
          Loading queue...
        </div>
      ) : sops.length === 0 ? (
        
        <div style={{
          border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--r-lg)',
          padding: '80px var(--sp-6)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--sp-4)',
          backgroundColor: 'rgba(255, 255, 255, 0.01)'
        }}>
          <span style={{ fontSize: '40px' }}></span>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0 }}>
            All clear. No SOPs are waiting for review right now.
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
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>SOP Number</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Submitted By</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600 }}>Date Submitted</th>
                  <th style={{ padding: 'var(--sp-4) var(--sp-6)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sops.map(sop => (
                  <tr
                    key={sop.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--accent-text)', fontFamily: 'monospace' }}>
                      {sop.sop_number || `ID-${sop.id}`}
                    </td>

                    <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {sop.title}
                    </td>

                    <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-secondary)' }}>
                      {sop.created_by_username || 'Author'}
                    </td>

                    <td style={{ padding: 'var(--sp-4) var(--sp-6)', color: 'var(--text-muted)' }}>
                      {formatDate(sop.updated_at)}
                    </td>

                    <td style={{ padding: 'var(--sp-4) var(--sp-6)', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/reviewer/sop/${sop.id}`)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'var(--accent)',
                          border: 'none',
                          borderRadius: 'var(--r-sm)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          transition: 'all var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                      >
                        Review Document
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-2)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing page {page} of {totalPages} ({total} pending)
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
