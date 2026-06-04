import { JSX, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSopDetailsApi } from '../../api/sop'
import { reviewerApproveApi, reviewerRejectApi } from '../../api/workflow'
import { validateComplianceApi, getComplianceReportApi } from '../../api/compliance'
import { downloadSopPdfApi, downloadSopDocxApi } from '../../api/export'
import { SOP, SOPContent, ComplianceReport } from '../../types'
import { triggerBlobDownload, buildSOPFilename } from '../../utils/downloadHelpers'
import VersionHistory from '../../components/VersionHistory'

export default function ReviewerDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [sop, setSop] = useState<SOP | null>(null)
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [isComplianceRunning, setIsComplianceRunning] = useState(false)

  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionComments, setRejectionComments] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadSopAndReport = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const sopRes = await getSopDetailsApi(id)
      if (sopRes.success && sopRes.data) {
        setSop(sopRes.data)
        try {
          const reportRes = await getComplianceReportApi(id)
          if (reportRes.success && reportRes.data) setReport(reportRes.data)
        } catch {  }
      } else {
        setError(sopRes.error || 'Failed to load SOP.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error loading page.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSopAndReport() }, [id])

  const handleApprove = async () => {
    if (!sop) return
    if (!window.confirm('Approve this SOP and send it to the final authorizer?')) return
    setError(null)
    setSuccess(null)
    setActionLoading(true)
    try {
      const res = await reviewerApproveApi(String(sop.id))
      if (res.success) {
        setSuccess(' SOP approved successfully! Redirecting...')
        setTimeout(() => navigate('/reviewer'), 2000)
      } else {
        setError(res.error || 'Approval failed.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error approving.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!sop) return
    const comments = rejectionComments.trim()
    if (!comments) {
      setError('Please enter rejection reason before submitting.')
      return
    }
    setError(null)
    setSuccess(null)
    setActionLoading(true)
    try {
      const res = await reviewerRejectApi(String(sop.id), comments)
      if (res.success) {
        setSuccess(' SOP rejected. Author has been notified. Redirecting...')
        setShowRejectForm(false)
        setRejectionComments('')
        setTimeout(() => navigate('/reviewer'), 2500)
      } else {
        setError(res.error || 'Rejection failed. Please try again.')
      }
    } catch (err: any) {
      console.error('Reject error:', err)
      setError(err.response?.data?.error || err.message || 'Network error. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRunCompliance = async () => {
    if (!sop) return
    setError(null)
    setSuccess(null)
    setIsComplianceRunning(true)
    try {
      const res = await validateComplianceApi(Number(sop.id))
      if (res.success && res.data) {
        setReport(res.data)
        setSuccess('Compliance analysis complete.')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(res.error || 'Validation failed.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error running audit.')
    } finally {
      setIsComplianceRunning(false)
    }
  }

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!sop) return
    setActionLoading(true)
    try {
      const data = format === 'pdf' ? await downloadSopPdfApi(sop.id) : await downloadSopDocxApi(sop.id)
      triggerBlobDownload(data, buildSOPFilename(sop.sop_number || `SOP-${sop.id}`, sop.title, format))
    } catch {
      setError('Download failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const getScoreColor = (score: number) => score >= 90 ? 'var(--success)' : score >= 70 ? 'var(--info)' : 'var(--error)'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
        <div style={{ border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite', marginRight: '12px' }} />
        Loading...
      </div>
    )
  }

  if (!sop) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Document not found.</div>

  const content = sop.content as SOPContent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/reviewer')} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}>
            ← Back
          </button>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {sop.sop_number || 'SOP-DRAFT'} — {sop.title}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Author: {sop.created_by_username}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleDownload('pdf')} disabled={actionLoading} style={{ padding: '6px 14px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-strong)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px' }}>PDF</button>
          <button onClick={() => handleDownload('docx')} disabled={actionLoading} style={{ padding: '6px 14px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-strong)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px' }}>DOCX</button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--error-subtle)', color: 'var(--error)', padding: '12px 16px', borderRadius: '6px', fontSize: '13px', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
        </div>
      )}
      {success && (
        <div style={{ background: 'var(--success-subtle)', color: 'var(--success)', padding: '12px 16px', borderRadius: '6px', fontSize: '13px', border: '1px solid rgba(22,163,74,0.2)' }}>
          {success}
        </div>
      )}

      {showRejectForm && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '2px solid rgba(220, 38, 38, 0.4)',
          borderRadius: '10px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--error)', margin: 0 }}>
              ↩ Reject SOP — Provide Reason
            </h3>
            <button
              onClick={() => { setShowRejectForm(false); setRejectionComments(''); setError(null) }}
              disabled={actionLoading}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', padding: '0 4px' }}
            >
              ×
            </button>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            This SOP will be returned to the author with your feedback. The author will be asked to revise and resubmit.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Rejection Reason <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <textarea
              value={rejectionComments}
              onChange={(e) => setRejectionComments(e.target.value)}
              placeholder="Describe what needs to be corrected or improved..."
              rows={5}
              disabled={actionLoading}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowRejectForm(false); setRejectionComments(''); setError(null) }}
              disabled={actionLoading}
              style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading || !rejectionComments.trim()}
              style={{
                padding: '8px 20px',
                background: rejectionComments.trim() && !actionLoading ? 'var(--error)' : 'var(--border)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: rejectionComments.trim() && !actionLoading ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {actionLoading && (
                <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              )}
              {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        <div style={{ flex: 2, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>1. Purpose</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{content?.purpose || '—'}</p>
          </div>
          <div>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>2. Scope</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{content?.scope || '—'}</p>
          </div>
          <div>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>3. Definitions</h3>
            {Array.isArray(content?.definitions) && content.definitions.length > 0 ? (
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {content.definitions.map((def: any, idx: number) => {
                  if (typeof def === 'string') {
                    return <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>{def}</li>
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
            ) : <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{typeof content?.definitions === 'string' ? content.definitions : '—'}</p>}
          </div>
          <div>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>4. Responsibilities</h3>
            {Array.isArray(content?.responsibilities) && content.responsibilities.length > 0 ? (
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
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
                    return <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>{resp}</li>
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
            ) : <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{typeof content?.responsibilities === 'string' ? content.responsibilities : '—'}</p>}
          </div>
          <div>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>5. Procedure</h3>
            {Array.isArray(content?.procedure) && content.procedure.length > 0 ? (
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                {content.procedure.map((step: any, idx: number) => {
                  if (typeof step === 'string') {
                    return <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.5 }}>{step}</li>
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
            ) : <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No procedure defined.</p>}
          </div>
          <div>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>6. References</h3>
            {Array.isArray(content?.references) && content.references.length > 0 ? (
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {content.references.map((ref: any, idx: number) => {
                  const textToRender = typeof ref === 'string' ? ref : (ref.title || JSON.stringify(ref))
                  return <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>{textToRender}</li>
                })}
              </ul>
            ) : <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No references.</p>}
          </div>
        </div>

        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Quality Review Gate</h4>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setError(null)
                  setShowRejectForm(true)
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
                }}
                disabled={actionLoading || isComplianceRunning || showRejectForm}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: '#fee2e2',
                  border: '1px solid rgba(220,38,38,0.4)',
                  borderRadius: '6px',
                  color: '#dc2626',
                  cursor: actionLoading || isComplianceRunning || showRejectForm ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: actionLoading || isComplianceRunning ? 0.6 : 1,
                  transition: 'all 0.15s'
                }}
              >
                 Reject
              </button>

              <button
                onClick={handleApprove}
                disabled={actionLoading || isComplianceRunning || showRejectForm}
                style={{
                  flex: 1.3,
                  padding: '8px 12px',
                  background: actionLoading || isComplianceRunning ? 'var(--border)' : 'var(--success)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: actionLoading || isComplianceRunning ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: actionLoading || isComplianceRunning ? 0.6 : 1,
                  transition: 'all 0.15s'
                }}
              >
                 Approve & Sign QA
              </button>
            </div>

            {actionLoading && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                Processing...
              </p>
            )}
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isComplianceRunning ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Running AI compliance audit (~30s)...</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Compliance Check</h4>
                  <button onClick={handleRunCompliance} disabled={isComplianceRunning || actionLoading} style={{ padding: '4px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    Run Audit
                  </button>
                </div>

                {report ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: `4px solid ${getScoreColor(report.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: getScoreColor(report.score), flexShrink: 0 }}>
                        {report.score}
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Classification</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{report.classification}</span>
                      </div>
                    </div>
                    {report.missing_sections?.length > 0 && (
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--error)', fontWeight: 600, marginBottom: '4px' }}>Missing Sections:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {report.missing_sections.map(s => <span key={s} style={{ fontSize: '11px', padding: '2px 6px', background: '#fee2e2', color: '#dc2626', borderRadius: '4px' }}>{s}</span>)}
                        </div>
                      </div>
                    )}
                    {report.recommendations?.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>AI Recommendations:</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(report.recommendations.join('\n'))}
                            style={{
                              background: 'var(--accent)',
                              border: 'none',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              padding: '3px 10px',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                          >
                            Copy All
                          </button>
                        </div>
                        <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {report.recommendations.map((r, i) => (
                            <li key={i} style={{ marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                <span>{r}</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(r)}
                                  title="Copy recommendation"
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    fontSize: '11px',
                                    flexShrink: 0
                                  }}
                                >
                                  Copy
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '16px 0' }}>No compliance report yet.</p>
                )}
              </>
            )}
          </div>

          <VersionHistory sopId={sop.id} currentVersion={sop.version} />
        </div>
      </div>
    </div>
  )
}
