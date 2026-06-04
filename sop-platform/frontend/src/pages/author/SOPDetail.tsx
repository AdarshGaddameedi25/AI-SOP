import { JSX, useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getSopDetailsApi } from '../../api/sop'
import { submitReviewApi, resubmitSopApi, archiveSopApi } from '../../api/workflow'
import { downloadSopPdfApi, downloadSopDocxApi } from '../../api/export'
import { SOP, SOPContent, Role } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatDateTime } from '../../utils/formatDate'
import { triggerBlobDownload, buildSOPFilename, getMimeType } from '../../utils/downloadHelpers'
import HighlightText from '../../components/HighlightText'
import VersionHistory from '../../components/VersionHistory'

export default function SOPDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const highlightQuery = (location.state as any)?.highlightQuery || ''

  const [sop, setSop] = useState<SOP | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  const handleAction = async (actionFn: () => Promise<any>, successMsg: string) => {
    setError(null)
    setSuccess(null)
    setActionLoading(true)
    try {
      const res = await actionFn()
      if (res.success) {
        setSuccess(successMsg)
        await loadSopDetails()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(res.error || 'Action failed')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'Action request failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!sop) return
    setError(null)
    setSuccess(null)
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
      setSuccess(`${format.toUpperCase()} downloaded successfully.`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error(err)
      setError('Failed to download document file export.')
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
        Loading SOP details...
      </div>
    )
  }

  if (!sop) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h3>Document Not Found</h3>
        <p>This SOP might have been deleted or you lack visibility permissions.</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '12px',
            padding: 'var(--sp-2) var(--sp-4)',
            backgroundColor: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    )
  }

  const isAuthor = user?.role === 'author'
  const isAdmin = user?.role === 'admin'
  const content = sop.content as SOPContent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        paddingBottom: 'var(--sp-4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <button
            onClick={() => navigate(isAuthor ? '/author/sops' : '/admin')}
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
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {sop.sop_number || 'SOP-DRAFT'} — {sop.title}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Template: {sop.template_type}
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
              fontSize: '13px',
              fontWeight: 500
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
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Download DOCX
          </button>

          {isAuthor && (
            <>
              {sop.status === 'draft' && (
                <>
                  <button
                    onClick={() => navigate(`/author/editor/${sop.id}`)}
                    style={{
                      padding: 'var(--sp-2) var(--sp-4)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-sm)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    Edit Content
                  </button>
                  <button
                    onClick={() => handleAction(() => submitReviewApi(sop.id), 'SOP submitted for review.')}
                    disabled={actionLoading}
                    style={{
                      padding: 'var(--sp-2) var(--sp-4)',
                      backgroundColor: 'var(--accent)',
                      border: 'none',
                      borderRadius: 'var(--r-sm)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    Submit for Review
                  </button>
                </>
              )}
              {sop.status === 'review_rejected' && (
                <>
                  <button
                    onClick={() => navigate(`/author/editor/${sop.id}`)}
                    style={{
                      padding: 'var(--sp-2) var(--sp-4)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-sm)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    Edit Content
                  </button>
                  <button
                    onClick={() => handleAction(() => resubmitSopApi(sop.id), 'SOP resubmitted and returned to draft.')}
                    disabled={actionLoading}
                    style={{
                      padding: 'var(--sp-2) var(--sp-4)',
                      backgroundColor: 'var(--accent)',
                      border: 'none',
                      borderRadius: 'var(--r-sm)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    Resubmit for Revision
                  </button>
                </>
              )}
            </>
          )}

          {isAdmin && sop.status === 'final_approved' && (
            <button
              onClick={() => handleAction(() => archiveSopApi(sop.id), 'SOP archived successfully.')}
              disabled={actionLoading}
              style={{
                padding: 'var(--sp-2) var(--sp-4)',
                backgroundColor: 'var(--error-subtle)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--error)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              Archive SOP
            </button>
          )}
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

      <div style={{ display: 'flex', gap: 'var(--sp-6)' }}>
        
        <div style={{
          flex: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: 'var(--sp-6) var(--sp-8)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-6)'
        }}>

          <div>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
              1. Purpose
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              <HighlightText text={content?.purpose || 'No purpose defined.'} query={highlightQuery} />
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
              2. Scope
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              <HighlightText text={content?.scope || 'No scope defined.'} query={highlightQuery} />
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
                        <HighlightText text={def} query={highlightQuery} />
                      </li>
                    )
                  }
                  const term = def.term || ''
                  const definition = def.definition || ''
                  return (
                    <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      <strong><HighlightText text={term} query={highlightQuery} />:</strong> <HighlightText text={definition} query={highlightQuery} />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                <HighlightText text={typeof content?.definitions === 'string' ? content.definitions : '—'} query={highlightQuery} />
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
                          <strong><HighlightText text={role} query={highlightQuery} />:</strong> <HighlightText text={desc} query={highlightQuery} />
                        </li>
                      )
                    }
                    return (
                      <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                        <HighlightText text={resp} query={highlightQuery} />
                      </li>
                    )
                  }
                  const role = resp.role || 'Role'
                  const desc = Array.isArray(resp.responsibilities) ? resp.responsibilities.join(' ') : (typeof resp.responsibility === 'string' ? resp.responsibility : '')
                  return (
                    <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      <strong><HighlightText text={role} query={highlightQuery} />:</strong> <HighlightText text={desc} query={highlightQuery} />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                <HighlightText text={typeof content?.responsibilities === 'string' ? content.responsibilities : 'No responsibilities defined.'} query={highlightQuery} />
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
                        <HighlightText text={step} query={highlightQuery} />
                      </li>
                    )
                  }
                  const title = step.step_title || step.title || `Step ${idx + 1}`
                  const action = step.action || step.description || ''
                  return (
                    <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.5 }}>
                      <strong><HighlightText text={title} query={highlightQuery} />:</strong> <HighlightText text={action} query={highlightQuery} />
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
                      <HighlightText text={textToRender} query={highlightQuery} />
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
          minWidth: 0 // Prevent flex overflow
        }}>
          {sop.status === 'review_rejected' && sop.rejection_comments && (
            <div style={{
              backgroundColor: 'var(--error-subtle)',
              color: 'var(--error)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--r-sm)',
              padding: 'var(--sp-4)',
              fontSize: '13px',
              lineHeight: 1.5
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>↩️ Review Quality Rejection Comments:</strong>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(sop.rejection_comments!)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  title="Copy reviewer comment"
                  style={{
                    padding: '2px 8px',
                    backgroundColor: copied ? 'var(--success-subtle)' : 'transparent',
                    border: '1px solid ' + (copied ? 'rgba(22,163,74,0.3)' : 'var(--error)'),
                    borderRadius: '4px',
                    color: copied ? 'var(--success)' : 'var(--error)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 500,
                    flexShrink: 0,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {copied ? ' Copied' : 'Copy'}
                </button>
              </div>
              <p style={{ color: 'var(--text-primary)', marginTop: '4px', fontStyle: 'italic', margin: 0 }}>
                "{sop.rejection_comments}"
              </p>
            </div>
          )}

          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-3)'
          }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
              Status
            </h4>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <StatusBadge status={sop.status} />
            </div>
            
            <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border)' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Created By:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{sop.created_by_username || 'Author'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Created:</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatDate(sop.created_at)}</span>
              </div>
              {sop.reviewer_approved_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Reviewed:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatDate(sop.reviewer_approved_at)}</span>
                </div>
              )}
              {sop.approved_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Authorized:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatDate(sop.approved_at)}</span>
                </div>
              )}
            </div>
          </div>



          <VersionHistory sopId={sop.id} currentVersion={sop.version} />
        </div>

      </div>
    </div>
  )
}
