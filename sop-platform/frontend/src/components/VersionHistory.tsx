import { JSX, useEffect, useState } from 'react'
import { getSopVersionsApi, getSopVersionDetailApi } from '../api/sop'
import { SOPVersionHistory } from '../types'
import Modal from './Modal'
import { formatDateTime } from '../utils/formatDate'

interface VersionHistoryProps {
  sopId: string
  currentVersion: string
}

export default function VersionHistory({ sopId, currentVersion }: VersionHistoryProps): JSX.Element {
  const [versions, setVersions] = useState<SOPVersionHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedVersion, setSelectedVersion] = useState<SOPVersionHistory | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchVersions = async () => {
    if (!sopId) return
    setLoading(true)
    setError(null)
    try {
      const res = await getSopVersionsApi(sopId)
      if (res.success && res.data) {
        setVersions(res.data)
      } else {
        setError(res.error || 'Failed to load versions.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'Error loading version history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVersions()
  }, [sopId])

  const handleViewVersion = async (versionId: number) => {
    setLoadingDetail(true)
    setError(null)
    try {
      const res = await getSopVersionDetailApi(versionId)
      if (res.success && res.data) {
        setSelectedVersion(res.data)
        setIsModalOpen(true)
      } else {
        setError(res.error || 'Failed to load version details.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'Error loading version detail.')
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: 'var(--sp-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-4)',
        boxShadow: 'var(--shadow-sm)',
        minWidth: 0
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
          Document Versions
        </h4>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
          Active: v{currentVersion}
        </span>
      </div>

      <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border)' }} />

      {error && (
        <div style={{ color: 'var(--error)', fontSize: '12px', backgroundColor: 'var(--error-subtle)', padding: '8px', borderRadius: 'var(--r-sm)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          <div style={{
            border: '2px solid var(--border)',
            borderTop: '2px solid var(--accent)',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            animation: 'spin 1s linear infinite',
            marginRight: '8px'
          }} />
          Loading history...
        </div>
      ) : versions.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
          No previous snapshots archived yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', maxHeight: '250px', overflowY: 'auto', minWidth: 0 }}>
          {versions.map((v) => (
            <div
              key={v.id}
              style={{
                backgroundColor: 'var(--bg-card-hover)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                padding: 'var(--sp-3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '8px',
                transition: 'border-color var(--transition-fast)'
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: v.version.startsWith('0.') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: v.version.startsWith('0.') ? 'var(--warning)' : 'var(--success)'
                  }}>
                    v{v.version}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {formatDateTime(v.created_at)}
                  </span>
                </div>
                {v.summary && (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {v.summary}
                  </p>
                )}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  By: {v.creator_username || 'System'}
                </span>
              </div>
              <button
                onClick={() => handleViewVersion(v.id)}
                disabled={loadingDetail}
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '4px 8px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  alignSelf: 'center',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedVersion && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Historical Snapshot: ${selectedVersion.title} (v${selectedVersion.version})`}
          size="lg"
          footer={
            <button
              onClick={() => setIsModalOpen(false)}
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
              Close
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div style={{
              backgroundColor: 'var(--bg-card-hover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              padding: '12px 16px',
              fontSize: '12px',
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Created on: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(selectedVersion.created_at)}</strong>
                <span style={{ color: 'var(--text-muted)' }}> by </span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedVersion.creator_username || 'System'}</strong>
              </div>
              {selectedVersion.summary && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Summary/Reason: </span>
                  <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{selectedVersion.summary}"</span>
                </div>
              )}
            </div>

            {(() => {
              let content: any = {}
              if (selectedVersion && selectedVersion.content) {
                if (typeof selectedVersion.content === 'string') {
                  try {
                    content = JSON.parse(selectedVersion.content)
                  } catch (e) {
                    console.error("Failed to parse historical content JSON string:", e)
                  }
                } else {
                  content = selectedVersion.content
                }
              }

              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-5)',
                  maxHeight: '50vh',
                  overflowY: 'auto',
                  paddingRight: 'var(--sp-2)'
                }}>
                  <div>
                    <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
                      1. Purpose
                    </h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {content.purpose || 'No purpose defined.'}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
                      2. Scope
                    </h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {content.scope || 'No scope defined.'}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
                      3. Responsibilities
                    </h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {content.responsibilities || 'No responsibilities defined.'}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
                      4. Procedure
                    </h4>
                    {Array.isArray(content.procedure) && content.procedure.length > 0 ? (
                      <ol style={{ paddingLeft: 'var(--sp-5)', margin: 0 }}>
                        {content.procedure.map((step: any, idx: number) => (
                          <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.5 }}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                        No procedure steps defined.
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
                      5. References
                    </h4>
                    {Array.isArray(content.references) && content.references.length > 0 ? (
                      <ul style={{ paddingLeft: 'var(--sp-5)', margin: 0 }}>
                        {content.references.map((ref: any, idx: number) => (
                          <li key={idx} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                            {ref}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                        No references specified.
                      </p>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </Modal>
      )}
    </div>
  )
}
