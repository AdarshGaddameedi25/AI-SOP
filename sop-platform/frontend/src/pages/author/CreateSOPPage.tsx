import { JSX, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSopApi, generateSopContentApi, saveSopContentApi, previewSopPdfApi } from '../../api/sop'
import { submitReviewApi } from '../../api/workflow'
import { SOPContent } from '../../types'

const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Operations', 'Quality', 'Legal', 'Compliance', 'Manufacturing']

const SECTION_LABELS = [
  { key: 'purpose',   num: 1, label: 'Purpose'          },
  { key: 'scope',     num: 2, label: 'Scope'            },
  { key: 'defs',      num: 3, label: 'Definitions'      },
  { key: 'resp',      num: 4, label: 'Responsibilities' },
  { key: 'proc',      num: 5, label: 'Procedure'        },
  { key: 'refs',      num: 6, label: 'References'       },
]
interface SectionCardProps {
  number: number
  label: string
  recommended?: boolean
  children: React.ReactNode
}

function SectionCard({ number, label, recommended, children }: SectionCardProps) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      animation: 'card-in 0.3s ease both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: '#f8fafc',
        borderRadius: 'var(--r-md) var(--r-md) 0 0',
      }}>
        <span style={{
          width: '22px', height: '22px', borderRadius: '50%',
          backgroundColor: 'var(--accent)', color: '#fff',
          fontSize: '11px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{number}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          {label}
        </span>
        {recommended && (
          <span style={{
            marginLeft: 'auto', fontSize: '10px', fontWeight: 600,
            padding: '2px 8px', borderRadius: '100px',
            backgroundColor: 'var(--success-subtle)', color: 'var(--success)',
          }}>Recommended</span>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

export default function CreateSOPPage(): JSX.Element {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [templateType, setTemplateType] = useState('IT SOP')
  const [description, setDescription] = useState('')
  const [userPrompt, setUserPrompt] = useState('')

  const [createdSopId, setCreatedSopId] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<SOPContent | null>(null)

  const [editPurpose, setEditPurpose] = useState('')
  const [editScope, setEditScope] = useState('')
  const [editDefinitions, setEditDefinitions] = useState('')
  const [editResponsibilities, setEditResponsibilities] = useState<string[]>([])
  const [editProcedure, setEditProcedure] = useState<string[]>([])
  const [editReferences, setEditReferences] = useState<string[]>([])

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const [showPdfPanel, setShowPdfPanel] = useState(false)
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pdfUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => { if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current) }
  }, [])

  const populateEditors = (c: SOPContent) => {
    setEditPurpose(typeof c.purpose === 'string' ? c.purpose : '')
    setEditScope(typeof c.scope === 'string' ? c.scope : '')
    if (Array.isArray(c.definitions)) {
      setEditDefinitions(c.definitions.map(d => {
        if (typeof d === 'string') return d;
        const term = (d as any).term || '';
        const definition = (d as any).definition || '';
        return term ? `${term}: ${definition}` : definition;
      }).filter(Boolean).join('\n'));
    } else if (typeof c.definitions === 'string') {
      setEditDefinitions(c.definitions);
    } else {
      setEditDefinitions('');
    }
    if (Array.isArray(c.responsibilities)) {
      setEditResponsibilities(c.responsibilities.map(r => {
        if (typeof r === 'string') return r;
        const role = (r as any).role || 'Role';
        const respText = Array.isArray((r as any).responsibilities) 
          ? (r as any).responsibilities.join(' ') 
          : ((r as any).responsibility || '');
        return `${role}: ${respText}`;
      }))
    } else if (typeof c.responsibilities === 'string') {
      setEditResponsibilities(c.responsibilities.split('\n').filter(Boolean))
    }
    if (Array.isArray(c.procedure)) {
      setEditProcedure(c.procedure.map((p, i) => {
        if (typeof p === 'string') return p
        const s = p as any
        const t = s.step_title || s.title || `Step ${i + 1}`
        const a = s.action || s.description || ''
        return `Step ${s.step_number || s.step || i + 1}: ${t}${a ? '\n' + a : ''}`
      }))
    }
    if (Array.isArray(c.references)) {
      setEditReferences(c.references.map(r =>
        typeof r === 'string' ? r : (r as any).title || JSON.stringify(r)
      ))
    }
  }

  const buildContent = (): SOPContent => ({
    ...(generatedContent || {} as SOPContent),
    purpose: editPurpose,
    scope: editScope,
    definitions: editDefinitions.split('\n').map(d => d.trim()).filter(Boolean).map(d => {
      const idx = d.indexOf(':');
      if (idx > -1) {
        return { term: d.substring(0, idx).trim(), definition: d.substring(idx + 1).trim() };
      }
      return d;
    }) as any,
    responsibilities: editResponsibilities.map(r => r.trim()).filter(Boolean).map(r => {
      const idx = r.indexOf(':');
      if (idx > -1) {
        return { role: r.substring(0, idx).trim(), responsibility: r.substring(idx + 1).trim() };
      }
      return r;
    }) as any,
    procedure: editProcedure.map(p => p.trim()).filter(Boolean) as any,
    references: editReferences.map(r => r.trim()).filter(Boolean) as any,
  })

  const handleGenerate = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and Description are required.')
      return
    }
    setError(null)
    setIsGenerating(true)
    setGeneratedContent(null)
    setPdfObjectUrl(null)
    setShowPdfPanel(false)

    try {
      let sopId = createdSopId
      if (!sopId) {
        const r = await createSopApi({ title: title.trim(), template_type: templateType, description: description.trim() })
        if (!r.success || !r.data) { setError(r.error || 'Failed to create SOP record.'); return }
        sopId = String(r.data.id)
        setCreatedSopId(sopId)
      }

      const prompt = userPrompt.trim()
        ? `${userPrompt.trim()}\n\nDescription: ${description}`
        : `Generate a complete SOP for "${title}". Template: ${templateType}. Description: ${description}`

      const g = await generateSopContentApi({
        title: title.trim(), template_type: templateType,
        description: description.trim(), critical_steps: prompt,
      })

      if (!g.success || !g.data?.generated_content) { setError(g.error || 'AI generation failed.'); return }

      setGeneratedContent(g.data.generated_content)
      populateEditors(g.data.generated_content)
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'An error occurred.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreview = async () => {
    if (!createdSopId) return
    setIsLoadingPdf(true)
    setShowPdfPanel(true)
    setError(null)
    try {
      const blob = await previewSopPdfApi(createdSopId, buildContent())
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
      const url = URL.createObjectURL(blob)
      pdfUrlRef.current = url
      setPdfObjectUrl(url)
    } catch {
      setError('PDF rendering failed. Please try again.')
    } finally {
      setIsLoadingPdf(false)
    }
  }

  const handleSave = async () => {
    if (!createdSopId || !generatedContent) return
    setIsSaving(true)
    setError(null)
    try {
      const r = await saveSopContentApi(createdSopId, buildContent())
      if (r.success) {
        await submitReviewApi(createdSopId)
        navigate(`/author/sop/${createdSopId}`)
      } else {
        setError(r.error || 'Failed to save.')
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Save failed.')
    } finally {
      setIsSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '8px 11px',
    backgroundColor: '#ffffff', border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)', color: 'var(--text-primary)',
    fontSize: '13px', outline: 'none', transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-secondary)', marginBottom: '5px',
  }
  const taStyle = (rows: number): React.CSSProperties => ({
    ...inputStyle, resize: 'vertical', lineHeight: 1.6, minHeight: `${rows * 22}px`,
  })

  const canGenerate = !!title.trim() && !!description.trim() && !isGenerating
  const canSave = !!generatedContent && !isGenerating && !isSaving
  const canPreview = !!generatedContent && !isGenerating && !isLoadingPdf

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-h))', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      <style>{`
        @keyframes spin-csp { to { transform: rotate(360deg); } }
        @keyframes card-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .csp-input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important; }
        .csp-btn-primary { background: var(--accent); color: #fff; border: none; border-radius: var(--r-sm); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .csp-btn-primary:hover:not(:disabled) { background: var(--accent-hover); box-shadow: 0 4px 14px rgba(37,99,235,0.3); transform: translateY(-1px); }
        .csp-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
        .csp-btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid var(--border); border-radius: var(--r-sm); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .csp-btn-outline:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .csp-btn-success { background: var(--success); color: #fff; border: none; border-radius: var(--r-sm); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .csp-btn-success:hover:not(:disabled) { background: #15803d; box-shadow: 0 4px 14px rgba(22,163,74,0.3); transform: translateY(-1px); }
        .csp-btn-success:disabled { opacity: 0.45; cursor: not-allowed; }
        .arr-row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); }
        .arr-row:last-child { border-bottom: none; }
        .arr-ta { flex: 1; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 13px; font-family: inherit; line-height: 1.55; resize: none; }
        .arr-ta:focus { background: rgba(37,99,235,0.04); border-radius: 4px; }
        .arr-del { flex-shrink: 0; background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 15px; padding: 2px 5px; border-radius: 4px; transition: color 0.12s, background 0.12s; line-height: 1; }
        .arr-del:hover { color: var(--error); background: var(--error-subtle); }
        .arr-add { margin-top: 10px; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--accent-text); background: var(--accent-subtle); border: 1px dashed rgba(37,99,235,0.3); border-radius: var(--r-sm); cursor: pointer; transition: all 0.15s; }
        .arr-add:hover { background: #dbeafe; border-color: var(--accent); }
        .spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: spin-csp 0.7s linear infinite; }
      `}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '56px', borderBottom: '1px solid var(--border)', flexShrink: 0, backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="csp-btn-outline" onClick={() => navigate('/author/sops')} style={{ padding: '6px 14px' }}>
            Back
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Create New SOP</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Fill details, generate, review sections, preview PDF, then save</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {error && <span style={{ fontSize: '12px', color: 'var(--error)', maxWidth: '280px' }}>{error}</span>}
          <button className="csp-btn-success" id="create-sop-save-btn" onClick={handleSave} disabled={!canSave} style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            {isSaving ? <><div className="spinner" />Saving...</> : 'Save & Submit for Review'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* LEFT: Form */}
        <div style={{ width: '22%', flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', backgroundColor: '#ffffff' }}>
          <div style={{ padding: '20px 18px' }}>
            <p style={{ margin: '0 0 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>SOP Details</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>

              <div>
                <label style={labelStyle}>Title <span style={{ color: 'var(--error)' }}>*</span></label>
                <input id="create-title" className="csp-input" type="text" placeholder="e.g. Employee Onboarding Procedure" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Template Type</label>
                <select className="csp-input" value={templateType} onChange={e => setTemplateType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {['IT SOP', 'HR SOP', 'Quality SOP', 'Security SOP'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Description <span style={{ color: 'var(--error)' }}>*</span></label>
                <textarea id="create-description" className="csp-input" placeholder="Briefly describe what this SOP covers..." value={description} onChange={e => setDescription(e.target.value)} rows={5} style={taStyle(5)} />
              </div>

            </div>

            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <label style={labelStyle}>AI Prompt</label>
              <textarea id="create-prompt" className="csp-input" placeholder="Add specific instructions for AI generation..." value={userPrompt} onChange={e => setUserPrompt(e.target.value)} rows={4} style={taStyle(4)} />
            </div>

            <button
              id="create-generate-btn"
              className="csp-btn-primary"
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{ marginTop: '14px', width: '100%', padding: '11px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isGenerating ? <><div className="spinner" />Generating... (~60s)</> : generatedContent ? 'Regenerate SOP' : 'Generate SOP'}
            </button>

            <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Generation takes approximately 50-60 seconds
            </p>
          </div>
        </div>

        {/* CENTER: Editable Section Cards */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', minHeight: 0, backgroundColor: '#f8fafc' }}>
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>SOP Content Editor</span>
            {generatedContent && !isGenerating && (
              <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>Content ready — review and edit below</span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {!generatedContent && !isGenerating && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '14px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#94a3b8' }}>No Content Generated</p>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>Fill in the details on the left and click Generate SOP</p>
                </div>
              </div>
            )}

            {isGenerating && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '18px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTop: '3px solid var(--accent)', animation: 'spin-csp 0.9s linear infinite' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--accent)' }}>AI is generating your SOP</p>
                  <p style={{ margin: '5px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Editable sections will appear here when complete</p>
                </div>
              </div>
            )}

            {generatedContent && !isGenerating && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <SectionCard number={1} label="Purpose" recommended>
                  <textarea className="csp-input" value={editPurpose} onChange={e => setEditPurpose(e.target.value)} rows={4} style={taStyle(4)} />
                </SectionCard>

                <SectionCard number={2} label="Scope" recommended>
                  <textarea className="csp-input" value={editScope} onChange={e => setEditScope(e.target.value)} rows={4} style={taStyle(4)} />
                </SectionCard>

                <SectionCard number={3} label="Definitions">
                  <textarea className="csp-input" value={editDefinitions} onChange={e => setEditDefinitions(e.target.value)} rows={3} placeholder="Define key terms used in this SOP..." style={taStyle(3)} />
                </SectionCard>

                <SectionCard number={4} label="Responsibilities">
                  {editResponsibilities.map((r, i) => (
                    <div key={i} className="arr-row">
                      <span style={{ flexShrink: 0, marginTop: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--accent)', minWidth: '18px' }}>{i + 1}.</span>
                      <textarea className="arr-ta" value={r} rows={2} onChange={e => setEditResponsibilities(p => p.map((x, j) => j === i ? e.target.value : x))} style={{ minHeight: '44px' }} />
                      <button className="arr-del" onClick={() => setEditResponsibilities(p => p.filter((_, j) => j !== i))}>x</button>
                    </div>
                  ))}
                  <button className="arr-add" onClick={() => setEditResponsibilities(p => [...p, ''])}>+ Add Responsibility</button>
                </SectionCard>

                <SectionCard number={5} label={`Procedure (${editProcedure.length} steps)`}>
                  {editProcedure.map((step, i) => (
                    <div key={i} className="arr-row">
                      <span style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '3px' }}>{i + 1}</span>
                      <textarea className="arr-ta" value={step} rows={3} onChange={e => setEditProcedure(p => p.map((x, j) => j === i ? e.target.value : x))} style={{ minHeight: '60px' }} />
                      <button className="arr-del" onClick={() => setEditProcedure(p => p.filter((_, j) => j !== i))}>x</button>
                    </div>
                  ))}
                  <button className="arr-add" onClick={() => setEditProcedure(p => [...p, ''])}>+ Add Step</button>
                </SectionCard>

                <SectionCard number={6} label="References">
                  {editReferences.map((ref, i) => (
                    <div key={i} className="arr-row">
                      <span style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: '12px', marginTop: '3px' }}>-</span>
                      <textarea className="arr-ta" value={ref} rows={1} onChange={e => setEditReferences(p => p.map((x, j) => j === i ? e.target.value : x))} style={{ minHeight: '28px', resize: 'none' }} />
                      <button className="arr-del" onClick={() => setEditReferences(p => p.filter((_, j) => j !== i))}>x</button>
                    </div>
                  ))}
                  <button className="arr-add" onClick={() => setEditReferences(p => [...p, ''])}>+ Add Reference</button>
                </SectionCard>


              </div>
            )}
          </div>

          {generatedContent && !isGenerating && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', backgroundColor: '#ffffff', flexShrink: 0, display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                id="create-preview-btn"
                className="csp-btn-primary"
                onClick={handlePreview}
                disabled={!canPreview}
                style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                {isLoadingPdf ? <><div className="spinner" />Rendering PDF...</> : 'Preview PDF'}
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Edit sections above, then preview your document</span>
            </div>
          )}
        </div>

        {/* RIGHT: PDF Preview */}
        <div style={{ width: '30%', flexShrink: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>PDF Preview</span>
            {pdfObjectUrl && <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>Ready</span>}
          </div>

          <div style={{ flex: 1, position: 'relative', minHeight: 0, backgroundColor: '#f1f5f9' }}>
            {!showPdfPanel && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '0 24px' }}>
                  {generatedContent ? 'Click "Preview PDF" to render the document' : 'Generate content first, then preview here'}
                </p>
              </div>
            )}

            {isLoadingPdf && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTop: '3px solid var(--accent)', animation: 'spin-csp 0.9s linear infinite' }} />
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>Rendering PDF...</p>
              </div>
            )}

            {pdfObjectUrl && !isLoadingPdf && (
              <iframe
                id="create-pdf-iframe"
                src={`${pdfObjectUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                title="SOP PDF Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </div>

          {pdfObjectUrl && !isLoadingPdf && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', backgroundColor: '#ffffff', flexShrink: 0, display: 'flex', gap: '10px' }}>
              <a href={pdfObjectUrl} download="SOP_Preview.pdf" style={{ flex: 1, textDecoration: 'none' }}>
                <button className="csp-btn-primary" style={{ width: '100%', padding: '9px 0' }}>
                  Download PDF
                </button>
              </a>
              <button
                className="csp-btn-outline"
                onClick={() => { const f = document.getElementById('create-pdf-iframe') as HTMLIFrameElement; f?.contentWindow?.print() }}
                style={{ flex: 1, padding: '9px 0' }}
              >
                Print
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
