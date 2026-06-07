import { JSX, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSopDetailsApi, saveSopContentApi, generateSopContentApi, previewSopPdfApi } from '../../api/sop'
import { SOP, SOPContent } from '../../types'
import VersionHistory from '../../components/VersionHistory'

import { submitReviewApi, resubmitSopApi } from '../../api/workflow'

export default function SOPEditor(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [sop, setSop] = useState<SOP | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [templateType, setTemplateType] = useState('')

  const [generatedContent, setGeneratedContent] = useState<SOPContent | null>(null)

  const [showPromptPanel, setShowPromptPanel] = useState(false)
  const [userPrompt, setUserPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null)
  const pdfUrlRef = useRef<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)

  useEffect(() => () => { if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current) }, [])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const res = await getSopDetailsApi(id)
        if (res.success && res.data) {
          const s = res.data
          if (s.status !== 'draft' && s.status !== 'review_rejected') {
            navigate(`/author/sop/${s.id}`); return
          }
          setSop(s)
          setTitle(s.title); setDescription(s.description)
          setTemplateType(s.template_type)
          const c = s.content as SOPContent
          if (c && c.purpose) {
            setGeneratedContent(c)
            setGenerated(true)
          }
        } else { setError(res.error || 'Failed to load SOP.') }
      } catch (e: any) { setError(e.message || 'Error loading SOP.') }
      finally { setLoading(false) }
    })()
  }, [id, navigate])

  const handleSave = async (silent = false) => {
    if (!id) return false
    setError(null); setSuccess(null)
    if (!silent) setSaving(true)
    try {
      if (!generatedContent) {
        setError('No content to save.')
        return false
      }
      const res = await saveSopContentApi(id, generatedContent)
      if (res.success) {
        if (!silent) { setSuccess('Saved!'); setTimeout(() => setSuccess(null), 3000) }
        return true
      }
      setError(res.error || 'Save failed.'); return false
    } catch (e: any) { setError(e.message || 'Save failed.'); return false }
    finally { if (!silent) setSaving(false) }
  }

  const handleSaveExit = async () => {
    setSaving(true)
    const ok = await handleSave(true)
    setSaving(false)
    if (ok) navigate('/author/sops')
  }

  const handleSubmitForReview = async () => {
    if (!id || !sop) return
    setSubmitting(true)
    const ok = await handleSave(true)
    if (!ok) {
      setSubmitting(false)
      return
    }

    try {
      let res;
      if (sop.status === 'review_rejected') {
        res = await resubmitSopApi(id)
      } else {
        res = await submitReviewApi(id)
      }

      if (res.success) {
        navigate('/author/sops')
      } else {
        setError(res.error || 'Submission failed.')
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerate = async () => {
    if (!title.trim() || !description.trim()) { setError('Title and Description are required.'); return }
    setError(null); setIsGenerating(true); setPdfObjectUrl(null);
    try {
      const res = await generateSopContentApi({
        title: title.trim(), template_type: templateType,
        description: description.trim(),
        sop_id: id,
        extra_instructions: userPrompt.trim() || undefined,
      })

      if (!res.success || !res.data?.generated_content) {
        setError(res.error || 'AI generation failed.'); return
      }

      const gen = res.data.generated_content
      setGeneratedContent(gen)
      setGenerated(true)
      setShowPromptPanel(false)

      setIsLoadingPdf(true)
      try {
        const blob = await previewSopPdfApi(id!, gen)
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
        const url = URL.createObjectURL(blob)
        pdfUrlRef.current = url
        setPdfObjectUrl(url)
      } catch 
      finally { setIsLoadingPdf(false) }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Generation failed.')
    } finally { setIsGenerating(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: 'var(--text-secondary)' }}>
      <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', animation: 'spin 1s linear infinite' }} />
      Loading workspace...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', width: '100%' }}>
      <style>{`
        @keyframes spin-e { to { transform: rotate(360deg); } }
        @keyframes slide-in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pdf-show { from { opacity:0; } to { opacity:1; } }
        @keyframes blink-cur { 0%,100%{opacity:1} 50%{opacity:0} }
        .se-textarea { width:100%; padding:10px; background:var(--bg-input); border:1px solid var(--border); border-radius:var(--r-sm); color:var(--text-primary); font-size:13.5px; line-height:1.55; outline:none; resize:vertical; font-family:inherit; transition:border-color 0.18s; box-sizing:border-box; }
        .se-textarea:focus { border-color:#6366f1; }
        .se-gen-btn:hover:not(:disabled) { background:linear-gradient(135deg,#4f46e5,#7c3aed) !important; transform:translateY(-1px); box-shadow:0 8px 25px rgba(99,102,241,0.45) !important; }
        .se-gen-btn:disabled { opacity:0.55; cursor:not-allowed; }
      `}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border)', paddingBottom:'var(--sp-3)' }}>
        <div>
          <h2 style={{ margin:0, fontSize:'17px', fontWeight:700, color:'var(--text-primary)' }}>
            Editing: <span style={{ color:'var(--accent-text)' }}>{sop?.sop_number}</span> — {title}
          </h2>
          {sop?.status === 'review_rejected' && (
            <span style={{ display:'inline-block', marginTop:'4px', fontSize:'11px', padding:'2px 9px', background:'var(--error-subtle)', color:'var(--error)', borderRadius:'100px', border:'1px solid rgba(239,68,68,0.25)', fontWeight:600 }}>
              ↩ Rejected — use prompt to revise
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={() => navigate('/author/sops')} style={{ padding:'7px 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', color:'var(--text-secondary)', cursor:'pointer', fontSize:'13px', transition:'all 0.15s' }} onMouseEnter={e=>e.currentTarget.style.color='var(--text-primary)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-secondary)'}>Cancel</button>
          <button onClick={() => handleSave()} disabled={saving || submitting || !generated} style={{ padding:'7px 16px', background:'var(--bg-card-hover)', border:'1px solid var(--border-strong)', borderRadius:'var(--r-sm)', color:'var(--text-primary)', cursor:'pointer', fontSize:'13px', fontWeight:500, transition:'all 0.15s', opacity:!generated?0.4:1 }}>
            {saving && !submitting ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={handleSaveExit} disabled={saving || submitting || !generated} style={{ padding:'7px 16px', background:'var(--bg-card-hover)', border:'1px solid var(--border-strong)', borderRadius:'var(--r-sm)', color:'var(--text-primary)', cursor:'pointer', fontSize:'13px', fontWeight:500, transition:'all 0.15s', opacity:!generated?0.4:1 }}>
            Save & Close
          </button>
          <button onClick={handleSubmitForReview} disabled={saving || submitting || !generated} style={{ padding:'7px 16px', background:'var(--accent)', border:'none', borderRadius:'var(--r-sm)', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:700, transition:'all 0.15s', opacity:!generated?0.4:1 }} onMouseEnter={e=>e.currentTarget.style.background='var(--accent-hover)'} onMouseLeave={e=>e.currentTarget.style.background='var(--accent)'}>
            {submitting ? 'Submitting...' : 'Save & Submit for Review'}
          </button>
        </div>
      </div>

      {error && <div style={{ background:'var(--error-subtle)', color:'var(--error)', padding:'10px 14px', borderRadius:'var(--r-sm)', fontSize:'13px', border:'1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
      {success && <div style={{ background:'rgba(34,197,94,0.08)', color:'#22c55e', padding:'10px 14px', borderRadius:'var(--r-sm)', fontSize:'13px', border:'1px solid rgba(34,197,94,0.2)' }}>{success}</div>}

      <div style={{ display:'flex', gap:'var(--sp-5)', alignItems:'flex-start' }}>

        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:'12px' }}>

          {(pdfObjectUrl || isLoadingPdf) && (
            <div style={{ borderRadius:'var(--r-md)', border:'1px solid rgba(99,102,241,0.3)', overflow:'hidden', animation:'slide-in 0.3s ease' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 16px', background:'rgba(99,102,241,0.07)', borderBottom:'1px solid rgba(99,102,241,0.18)' }}>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#818cf8', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                   Generated SOP — PDF Preview
                </span>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  {pdfObjectUrl && (
                    <a href={pdfObjectUrl} download={`${sop?.sop_number || 'SOP'}_preview.pdf`}
                      style={{ padding:'4px 12px', borderRadius:'var(--r-sm)', fontSize:'12px', fontWeight:600, background:'rgba(99,102,241,0.14)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.3)', textDecoration:'none', transition:'all 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,0.25)'}
                      onMouseLeave={e=>e.currentTarget.style.background='rgba(99,102,241,0.14)'}
                    >⬇ Download PDF</a>
                  )}
                  <button onClick={() => { setPdfObjectUrl(null); if (pdfUrlRef.current) { URL.revokeObjectURL(pdfUrlRef.current); pdfUrlRef.current = null } }}
                    style={{ width:'24px', height:'24px', display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', color:'#6b7280', cursor:'pointer', fontSize:'15px', lineHeight:1 }}
                    title="Close preview"
                  >×</button>
                </div>
              </div>
              {isLoadingPdf ? (
                <div style={{ height:'300px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', background:'#1a1d2e' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', border:'3px solid rgba(99,102,241,0.15)', borderTop:'3px solid #6366f1', animation:'spin-e 0.9s linear infinite' }} />
                  <p style={{ margin:0, fontSize:'13px', color:'#6366f1', fontWeight:600 }}>Rendering PDF...</p>
                </div>
              ) : pdfObjectUrl && (

                <iframe src={`${pdfObjectUrl}#toolbar=1&navpanes=0&scrollbar=1`} title="SOP PDF"
                  style={{ width:'100%', height:'580px', border:'none', display:'block', background:'#fff', animation:'pdf-show 0.4s ease' }} />
              )}
            </div>
          )}

          {!pdfObjectUrl && !isLoadingPdf && (
            <div style={{ minHeight:'340px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', borderRadius:'var(--r-md)', border:'1px dashed var(--border-strong)', background:'rgba(255,255,255,0.01)' }}>
              {isGenerating ? (
                <>
                  <div style={{ width:'52px', height:'52px', borderRadius:'50%', border:'3px solid rgba(99,102,241,0.15)', borderTop:'3px solid #8b5cf6', animation:'spin-e 1.1s linear infinite' }} />
                  <div style={{ textAlign:'center' }}>
                    <p style={{ margin:'0 0 4px', fontSize:'16px', fontWeight:600, color:'#7c3aed' }}>Generating your SOP...</p>
                    <p style={{ margin:0, fontSize:'12px', color:'var(--text-muted)' }}>This takes ~50–60 seconds. Please wait.</p>
                  </div>
                </>
              ) : generated ? (
                <>
                  <span style={{ fontSize:'40px', opacity:0.3 }}></span>
                  <p style={{ margin:0, fontSize:'14px', color:'var(--text-muted)', textAlign:'center' }}>
                    PDF preview was closed.<br />Click <strong style={{ color:'#6366f1' }}>Generate</strong> again to regenerate.
                  </p>
                </>
              ) : (
                <>
                  <span style={{ fontSize:'50px', opacity:0.15 }}></span>
                  <div style={{ textAlign:'center', maxWidth:'340px' }}>
                    <p style={{ margin:'0 0 6px', fontSize:'16px', fontWeight:600, color:'var(--text-muted)' }}>No PDF yet</p>
                    <p style={{ margin:0, fontSize:'13px', color:'var(--text-muted)', lineHeight:1.6 }}>
                      Enter your instructions on the right and click <strong style={{ color:'#6366f1' }}>Generate</strong> to produce the SOP PDF here.
                    </p>
                  </div>

                </>
              )}
            </div>
          )}
        </div>

        <div style={{ width:'320px', flexShrink:0, display:'flex', flexDirection:'column', gap:'12px' }}>

          <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>

            <div>
              <p style={{ margin:'0 0 8px', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#6366f1' }}>SOP Info</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'4px', fontSize:'12.5px', lineHeight:1.5 }}>
                <div><span style={{ color:'var(--text-muted)', fontWeight:600 }}>Title: </span><span style={{ color:'var(--text-primary)' }}>{title}</span></div>
                <div><span style={{ color:'var(--text-muted)', fontWeight:600 }}>Type: </span><span style={{ color:'var(--text-primary)' }}>{templateType}</span></div>

                {description && (
                  <div style={{ marginTop:'4px', paddingTop:'6px', borderTop:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text-muted)', fontWeight:600 }}>Description: </span>
                    <span style={{ color:'var(--text-secondary)' }}>{description.length > 80 ? description.slice(0, 80) + '…' : description}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop:'1px solid var(--border)' }} />

            <div>
              <label style={{ display:'block', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-secondary)', marginBottom:'6px' }}>
                Your Prompt <span style={{ fontWeight:400, color: sop?.status === 'review_rejected' ? 'var(--error)' : 'var(--text-muted)', textTransform:'none' }}>{sop?.status === 'review_rejected' ? '(Required: Paste recommendations)' : '(optional)'}</span>
              </label>
              <textarea
                id="ai-prompt-field"
                className="se-textarea"
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                disabled={isGenerating}
                rows={5}
                placeholder={sop?.status === 'review_rejected' ? "Paste reviewer or AI compliance recommendations here..." : ""}
                style={{ width:'100%', padding:'10px', background:'var(--bg-input)', border: sop?.status === 'review_rejected' && !userPrompt.trim() ? '1px solid var(--error)' : '1px solid var(--border)', borderRadius:'var(--r-sm)', color:'var(--text-primary)', fontSize:'12.5px', lineHeight:1.6, outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', opacity:isGenerating ? 0.6 : 1, transition:'border-color 0.18s' }}
                onFocus={e=>e.currentTarget.style.borderColor='#6366f1'}
                onBlur={e=>e.currentTarget.style.borderColor=sop?.status === 'review_rejected' && !userPrompt.trim() ? 'var(--error)' : 'var(--border)'}
              />
            </div>

            {sop?.status === 'review_rejected' && !userPrompt.trim() && (
              <div style={{ color: 'var(--error)', fontSize: '11px', textAlign: 'center', marginBottom: '-4px' }}>
                You must paste recommendations to regenerate.
              </div>
            )}
            <button
              id="editor-generate-btn"
              className="se-gen-btn"
              onClick={handleGenerate}
              disabled={isGenerating || isLoadingPdf || (sop?.status === 'review_rejected' && !userPrompt.trim())}
              style={{
                padding:'11px',
                background: isGenerating || (sop?.status === 'review_rejected' && !userPrompt.trim()) ? 'var(--border)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border:'none', borderRadius:'var(--r-sm)',
                color: isGenerating || (sop?.status === 'review_rejected' && !userPrompt.trim()) ? 'var(--text-muted)' : '#fff', fontSize:'13px', fontWeight:700,
                cursor:(isGenerating||isLoadingPdf||(sop?.status === 'review_rejected' && !userPrompt.trim()))?'not-allowed':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'7px',
                transition:'all 0.2s ease',
                boxShadow: isGenerating || (sop?.status === 'review_rejected' && !userPrompt.trim()) ? 'none' : '0 4px 15px rgba(99,102,241,0.28)',
              }}
            >
              {isGenerating ? (
                <><div style={{ width:'14px', height:'14px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', animation:'spin-e 0.8s linear infinite' }} />Generating... (~60s)</>
              ) : generated ? '↺ Regenerate' : ' Generate'}
            </button>

            {generated && !isGenerating && (
              <div style={{ padding:'8px 12px', background:'rgba(34,197,94,0.07)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:'var(--r-sm)', fontSize:'12px', color:'#22c55e', textAlign:'center', animation:'slide-in 0.3s ease' }}>
                 SOP ready · Review PDF above · Save when done
              </div>
            )}

            <p style={{ margin:0, fontSize:'10.5px', color:'var(--text-muted)', textAlign:'center' }}>
               ~50–60 seconds · Stay on this page
            </p>
          </div>

          {sop && <VersionHistory sopId={sop.id} currentVersion={sop.version} />}
        </div>
      </div>
    </div>
  )
}
