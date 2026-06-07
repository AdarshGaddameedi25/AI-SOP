import { JSX, useState, useEffect, useRef } from 'react'
import { generateSopContentApi, previewSopPdfApi } from '../api/sop'
import { SOPContent } from '../types'

interface AIGenerateOverlayProps {
  sopId: string
  title: string
  description: string
  templateType: string
  onConfirm: (generatedContent: SOPContent) => void
  onClose: () => void
}

export default function AIGenerateOverlay({
  sopId,
  title,
  description,
  templateType,
  onConfirm,
  onClose,
}: AIGenerateOverlayProps): JSX.Element {

  const defaultPrompt = `Generate a comprehensive SOP for "${title}".

Template Type: ${templateType}

Description: ${description}

Please include all standard SOP sections: Purpose, Scope, Responsibilities, Procedure (with detailed steps), References, and an Approval Block.`

  const [userPrompt, setUserPrompt] = useState(defaultPrompt)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<SOPContent | null>(null)
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pdfUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current)
      }
    }
  }, [])

  const handleGenerate = async () => {
    if (!userPrompt.trim()) return
    setIsGenerating(true)
    setError(null)
    setGeneratedContent(null)
    setPdfObjectUrl(null)

    try {
      const res = await generateSopContentApi({
        title: title.trim(),
        template_type: templateType,
        description: description.trim(),
        critical_steps: userPrompt.trim(),
      })

      if (res.success && res.data?.generated_content) {
        const content = res.data.generated_content
        setGeneratedContent(content)

        setIsLoadingPdf(true)
        try {
          const blob = await previewSopPdfApi(sopId, content)
          if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
          const url = URL.createObjectURL(blob)
          pdfUrlRef.current = url
          setPdfObjectUrl(url)
        } catch (pdfErr: any) {
          setError('SOP generated but PDF preview failed. You can still use this SOP.')
        } finally {
          setIsLoadingPdf(false)
        }
      } else {
        setError(res.error || 'AI generation failed. Please try again.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'AI generation request failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUseThisSop = () => {
    if (generatedContent) {
      onConfirm(generatedContent)
    }
  }

  const canUse = !!generatedContent && !isGenerating && !isLoadingPdf

  return (
    <>

      <style>{`
        @keyframes ai-overlay-in {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes ai-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes terminal-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes spin-ai { to { transform: rotate(360deg); } }
        @keyframes pdf-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .ai-generate-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          transition: all 0.2s ease;
        }
        .ai-generate-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(99,102,241,0.4);
        }
        .ai-generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .ai-use-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          transition: all 0.2s ease;
        }
        .ai-use-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(16,185,129,0.4);
        }
        .ai-use-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ai-prompt-textarea {
          resize: none;
          transition: border-color 0.2s ease;
        }
        .ai-prompt-textarea:focus { border-color: #6366f1 !important; outline: none; }
      `}</style>

      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(6px)',
          zIndex: 9998,
          animation: 'ai-backdrop-in 0.25s ease forwards',
        }}
      />

      <div style={{
        position: 'fixed',
        inset: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f1117',
        borderRadius: '16px',
        border: '1px solid rgba(99,102,241,0.3)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.1)',
        animation: 'ai-overlay-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        overflow: 'hidden',
      }}>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(90deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f0f0ff' }}>
                AI SOP Generator
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#8b8fa8' }}>
                Customize your prompt — see the live PDF preview on the right
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[title, templateType].filter(Boolean).map((pill, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: '100px',
                fontSize: '11px', fontWeight: 600,
                backgroundColor: 'rgba(99,102,241,0.15)',
                color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.25)',
                maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{pill}</span>
            ))}
            <button
              id="ai-overlay-close-btn"
              onClick={onClose}
              style={{
                marginLeft: '8px',
                width: '32px', height: '32px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'transparent',
                color: '#8b8fa8',
                cursor: 'pointer', fontSize: '18px', lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#8b8fa8' }}
            >×</button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

          <div style={{
            width: '40%', flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: '16px',
            padding: '20px',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            overflowY: 'auto',
          }}>
            <div>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#6366f1', marginBottom: '8px',
              }}>
                Your Instructions to the AI
              </label>
              <textarea
                id="ai-prompt-textarea"
                className="ai-prompt-textarea"
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                disabled={isGenerating}
                rows={14}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '14px',
                  backgroundColor: '#161b2e',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  fontSize: '13px', lineHeight: 1.65,
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  opacity: isGenerating ? 0.6 : 1,
                }}
              />
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#555b7a' }}>
                The SOP metadata above is always included automatically. Add your specific requirements here.
              </p>
            </div>

            {error && (
              <div style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '13px', lineHeight: 1.5,
              }}>
                ️ {error}
              </div>
            )}

            {generatedContent && !isGenerating && (
              <div style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '8px',
                color: '#34d399',
                fontSize: '13px', lineHeight: 1.5,
              }}>
                 SOP generated successfully! {isLoadingPdf ? 'Loading PDF preview...' : 'Review the PDF on the right.'}
              </div>
            )}

            <button
              id="ai-overlay-generate-btn"
              className="ai-generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating || isLoadingPdf || !userPrompt.trim()}
              style={{
                padding: '13px',
                border: 'none', borderRadius: '10px',
                color: '#fff', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {isGenerating ? (
                <>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid #fff',
                    animation: 'spin-ai 0.8s linear infinite',
                  }} />
                  Generating... (~60s)
                </>
              ) : generatedContent ? '↺ Regenerate SOP' : ' Generate SOP'}
            </button>
          </div>

          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            backgroundColor: '#1a1d2e',
          }}>

            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#8b8fa8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                 SOP PDF Preview
              </span>
              {pdfObjectUrl && (
                <a
                  href={pdfObjectUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '11px', color: '#6366f1',
                    textDecoration: 'none', fontWeight: 600,
                    padding: '4px 10px', borderRadius: '6px',
                    border: '1px solid rgba(99,102,241,0.3)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  ↗ Open in new tab
                </a>
              )}
            </div>

            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>

              {!pdfObjectUrl && !isLoadingPdf && !isGenerating && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '16px', color: '#3d4160',
                }}>
                  <div style={{ fontSize: '64px', opacity: 0.4 }}></div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#5a5f80' }}>
                      PDF Preview will appear here
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#3d4160' }}>
                      Enter your instructions and click "Generate SOP"
                    </p>
                  </div>
                </div>
              )}

              {isLoadingPdf && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '16px',
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    border: '3px solid rgba(99,102,241,0.2)',
                    borderTop: '3px solid #6366f1',
                    animation: 'spin-ai 0.9s linear infinite',
                  }} />
                  <p style={{ margin: 0, fontSize: '14px', color: '#6366f1', fontWeight: 600 }}>
                    Rendering PDF preview...
                  </p>
                </div>
              )}

              {isGenerating && !isLoadingPdf && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '16px',
                  color: '#3d4160',
                }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    border: '3px solid rgba(99,102,241,0.15)',
                    borderTop: '3px solid #8b5cf6',
                    animation: 'spin-ai 1.2s linear infinite',
                  }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#8b5cf6' }}>
                      AI is crafting your SOP...
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#3d4160' }}>
                      PDF preview will load automatically after generation
                    </p>
                  </div>
                </div>
              )}

              {pdfObjectUrl && (
                <iframe
                  id="ai-pdf-preview-iframe"
                  src={pdfObjectUrl}
                  title="SOP PDF Preview"
                  style={{
                    width: '100%', height: '100%',
                    border: 'none',
                    animation: 'pdf-fade-in 0.4s ease forwards',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.2)',
          flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#444965' }}>
             Generation takes ~50–60 seconds · PDF preview loads automatically · Do not close this window
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              id="ai-overlay-cancel-btn"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#8b8fa8', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8b8fa8' }}
            >
              Cancel
            </button>
            <button
              id="ai-overlay-use-btn"
              className="ai-use-btn"
              onClick={handleUseThisSop}
              disabled={!canUse}
              style={{
                padding: '10px 24px',
                border: 'none', borderRadius: '8px',
                color: '#fff', fontSize: '13px', fontWeight: 700,
                cursor: canUse ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
               Use This SOP
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
