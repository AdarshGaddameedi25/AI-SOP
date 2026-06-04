import { JSX, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSopDetailsApi } from '../../api/sop'
import { finalApproveApi } from '../../api/workflow'
import { downloadSopPdfApi, downloadSopDocxApi } from '../../api/export'
import { SOP, SOPContent } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { triggerBlobDownload, buildSOPFilename } from '../../utils/downloadHelpers'
import VersionHistory from '../../components/VersionHistory'

export default function ApproverDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [sop, setSop] = useState<SOP | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadSopDetails = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await getSopDetailsApi(id!)
      if (res.success && res.data) {
        setSop(res.data)
      } else {
        setError(res.error || 'Failed to retrieve SOP details.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'Error loading SOP.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSopDetails()
  }, [id])

  const handleFinalApprove = async () => {
    if (!sop) return
    setError(null)
    setSuccess(null)
    setActionLoading(true)

    try {
      const res = await finalApproveApi(sop.id)
      if (res.success) {
        setSuccess('Electronic signature applied. SOP is now active and approved.')
        setTimeout(() => {
          navigate('/approver')
        }, 2500)
      } else {
        setError(res.error || 'Authorization failed.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'Error granting final approval.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!sop) return
    setError(null)
    setActionLoading(true)
    try {
      let data: Blob
      if (format === 'pdf') {
        data = await downloadSopPdfApi(sop.id)
      } else {
        data = await downloadSopDocxApi(sop.id)
      }
      const filename = buildSOPFilename(sop.sop_number || `SOP-${sop.id}`, sop.title, format)
      triggerBlobDownload(data, filename)
    } catch (err: any) {
      console.error(err)
      setError('Download failed.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
        <div style={{
          border: '2px solid var(--border)',
          borderTop: '2px solid var(--accent)',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          animation: 'spin 1s linear infinite',
          marginRight: '12px'
        }} />
        Loading Authorization workspace...
      </div>
    )
  }

  if (!sop) return <div style={{ color: 'var(--text-secondary)' }}>Document not found.</div>

  const content = sop.content as SOPContent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        paddingBottom: 'var(--sp-3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <button
            onClick={() => navigate('/approver')}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ← Back
          </button>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Authorize: {sop.sop_number || 'SOP-DRAFT'} — {sop.title}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Author: {sop.created_by_username}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button
            onClick={() => handleDownload('pdf')}
            disabled={actionLoading}
            style={{
              padding: 'var(--sp-2) var(--sp-4)',
              backgroundColor: 'var(--bg-card-hover)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Download PDF
          </button>
          <button
            onClick={() => handleDownload('docx')}
            disabled={actionLoading}
            style={{
              padding: 'var(--sp-2) var(--sp-4)',
              backgroundColor: 'var(--bg-card-hover)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Download DOCX
          </button>
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

      <div style={{ display: 'flex', gap: 'var(--sp-6)', alignItems: 'flex-start' }}>
        
        <div style={{
          flex: 2,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: 'var(--sp-6) var(--sp-7)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-5)'
        }}>
          <div>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
              1. Purpose
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {content?.purpose || '—'}
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
              2. Scope
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {content?.scope || '—'}
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
              3. Definitions
            </h3>
            {Array.isArray(content?.definitions) && content.definitions.length > 0 ? (
              <ul style={{ paddingLeft: 'var(--sp-5)', margin: 0 }}>
                {content.definitions.map((def: any, idx: number) => {
                  if (typeof def === 'string') {
                    return (
                      <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                        {def}
                      </li>
                    )
                  }
                  const term = def.term || ''
                  const definition = def.definition || ''
                  return (
                    <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      <strong>{term}:</strong> {definition}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                {typeof content?.definitions === 'string' ? content.definitions : '—'}
              </p>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
              4. Responsibilities
            </h3>
            {Array.isArray(content?.responsibilities) && content.responsibilities.length > 0 ? (
              <ul style={{ paddingLeft: 'var(--sp-5)', margin: 0 }}>
                {content.responsibilities.map((resp: any, idx: number) => {
                  if (typeof resp === 'string') {
                    const parts = resp.split(':')
                    if (parts.length > 1) {
                      const role = parts[0]
                      const desc = parts.slice(1).join(':').trim()
                      return (
                        <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                          <strong>{role}:</strong> {desc}
                        </li>
                      )
                    }
                    return (
                      <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                        {resp}
                      </li>
                    )
                  }
                  const role = resp.role || 'Role'
                  const desc = Array.isArray(resp.responsibilities) ? resp.responsibilities.join(' ') : (typeof resp.responsibility === 'string' ? resp.responsibility : '')
                  return (
                    <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      <strong>{role}:</strong> {desc}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                {typeof content?.responsibilities === 'string' ? content.responsibilities : '—'}
              </p>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
              5. Procedure
            </h3>
            {Array.isArray(content?.procedure) && content.procedure.length > 0 ? (
              <ol style={{ paddingLeft: 'var(--sp-5)', margin: 0 }}>
                {content.procedure.map((step: any, idx: number) => {
                  if (typeof step === 'string') {
                    return (
                      <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.5 }}>
                        {step}
                      </li>
                    )
                  }
                  const title = step.step_title || step.title || `Step ${idx + 1}`
                  const action = step.action || step.description || ''
                  return (
                    <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.5 }}>
                      <strong>{title}:</strong> {action}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                No procedure steps defined.
              </p>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
              6. References
            </h3>
            {Array.isArray(content?.references) && content.references.length > 0 ? (
              <ul style={{ paddingLeft: 'var(--sp-5)', margin: 0 }}>
                {content.references.map((ref: any, idx: number) => {
                  const textToRender = typeof ref === 'string' ? ref : (ref.title || JSON.stringify(ref))
                  return (
                    <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {textToRender}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                No references specified.
              </p>
            )}
          </div>
        </div>

        <div style={{
          flex: 1.2,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-5)',
          minWidth: 0
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-4)'
          }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
              Final Authorizing Sign-off
            </h4>

            
            {sop.status === 'review_approved' ? (
              <button
                onClick={handleFinalApprove}
                disabled={actionLoading}
                style={{
                  width: '100%',
                  padding: 'var(--sp-3)',
                  backgroundColor: 'var(--success)',
                  border: 'none',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--success)'}
              >
                {actionLoading ? 'Applying Signature...' : '️ Grant Final Approval'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                <StatusBadge status={sop.status} />
              </div>
            )}
          </div>

          <VersionHistory sopId={sop.id} currentVersion={sop.version} />
        </div>

      </div>
    </div>
  )
}
