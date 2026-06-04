import { JSX, useEffect, useState } from 'react'
import { adminGetDashboardStatsApi, adminGetWorkflowActivityApi } from '../../api/admin'
import { AdminDashboard as DashboardStats, WorkflowEvent, SOPStatus } from '../../types'
import { formatCompact } from '../../utils/formatDate'

export default function AdminDashboard(): JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<WorkflowEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, activityRes] = await Promise.all([
        adminGetDashboardStatsApi(),
        adminGetWorkflowActivityApi(15)
      ])

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      } else {
        setError(statsRes.error || 'Failed to retrieve stats.')
      }

      if (activityRes.success && activityRes.data) {
        setActivity(activityRes.data.activity || [])
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'Error loading dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
        <div style={{
          border: '2px solid var(--border)',
          borderTop: '2px solid var(--accent)',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          animation: 'spin 1s linear infinite',
          marginRight: '12px'
        }} />
        Loading Governance metrics...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', width: '100%' }}>
      { }
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--sp-4)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          System Governance Dashboard
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Overview of user roles distribution, and real-time document transitions.
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

      { }
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--sp-4)'
        }}>
          { }
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-5)',
            boxShadow: 'var(--shadow-card)'
          }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total SOPs Managed</span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 'var(--sp-2)' }}>
              {stats.sops?.total || 0}
            </div>
          </div>

          { }
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-5)',
            boxShadow: 'var(--shadow-card)'
          }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Average Audit Score</span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--info)', marginTop: 'var(--sp-2)' }}>
              {stats.compliance?.average_score ? `${Math.round(stats.compliance.average_score)}%` : '—'}
            </div>
          </div>

          { }
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-5)',
            boxShadow: 'var(--shadow-card)'
          }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Platform Users</span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 'var(--sp-2)' }}>
              {stats.users?.total || 0}
            </div>
          </div>

          { }
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-5)',
            boxShadow: 'var(--shadow-card)'
          }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Transitions (Last 24h)</span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)', marginTop: 'var(--sp-2)' }}>
              {stats.audit?.activity_last_24h || 0}
            </div>
          </div>
        </div>
      )}

      { }
      <div style={{ display: 'flex', gap: 'var(--sp-6)', minHeight: 0 }}>

        { }
        <div style={{
          flex: 2,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: 'var(--sp-5) var(--sp-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-4)'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--sp-2)', margin: 0 }}>
             Real-Time Workflow Transitions
          </h3>

          {activity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              No recent workflow transitions recorded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', overflowY: 'auto', maxHeight: '500px' }}>
              {activity.map(act => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--sp-3)',
                    padding: 'var(--sp-3)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    backgroundColor: 'rgba(255,255,255,0.01)'
                  }}
                >
                  { }
                  <span style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    marginTop: '2px'
                  }}>
                    {formatCompact(act.timestamp)}
                  </span>

                  { }
                  <div style={{ flex: 1, fontSize: '13px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                      <strong>{act.username || 'System'}</strong>
                      <span style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: '100px',
                        backgroundColor: 'var(--bg-card-hover)',
                        color: 'var(--text-secondary)'
                      }}>{act.user_role}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>performed</span>
                      <span style={{
                        fontWeight: 600,
                        color: act.action.includes('REJECT') ? 'var(--error)' : act.action.includes('APPROVE') ? 'var(--success)' : 'var(--accent-text)'
                      }}>{act.action}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>on</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {act.sop_number || 'SOP'}
                      </span>
                    </div>
                    {act.details && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{act.details}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        { }
        {stats?.sops?.by_status && (
          <div style={{
            flex: 1.2,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-4)',
            alignSelf: 'flex-start'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--sp-2)', margin: 0 }}>
              SOP Status Distribution
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {(Object.keys(stats.sops.by_status) as SOPStatus[]).map(statusKey => {
                const item = stats.sops.by_status[statusKey]
                const totalSops = stats.sops.total || 1
                const percent = Math.round((item.count / totalSops) * 100)

                return (
                  <div key={statusKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.count} ({percent}%)</span>
                    </div>
                    { }
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percent}%`,
                        height: '100%',
                        backgroundColor: item.color || 'var(--text-muted)',
                        borderRadius: '3px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
