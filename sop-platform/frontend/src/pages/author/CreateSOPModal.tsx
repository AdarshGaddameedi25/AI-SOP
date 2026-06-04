import { JSX, useState } from 'react'
import Modal from '../../components/Modal'
import { createSopApi } from '../../api/sop'
import { SOP } from '../../types'

interface CreateSOPModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (sop: SOP) => void
}

const TEMPLATE_TYPES = ['Standard SOP', 'IT SOP', 'HR SOP', 'Finance SOP', 'Operations SOP', 'Quality SOP', 'Compliance SOP', 'Manufacturing SOP']

export default function CreateSOPModal({
  isOpen,
  onClose,
  onCreated
}: CreateSOPModalProps): JSX.Element {
  const [title, setTitle] = useState('')
  const [templateType, setTemplateType] = useState(TEMPLATE_TYPES[0])
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !description.trim()) {
      setError('Please fill in all fields.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createSopApi({
        title: title.trim(),
        template_type: templateType,
        description: description.trim()
      })

      if (res.success && res.data) {
        onCreated(res.data)
        setTitle('')
        setTemplateType(TEMPLATE_TYPES[0])
        setDescription('')
        onClose()
      } else {
        setError(res.error || 'Failed to create SOP.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'An error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const footer = (
    <>
      <button
        onClick={onClose}
        disabled={isSubmitting}
        style={{
          padding: 'var(--sp-2) var(--sp-4)',
          backgroundColor: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all var(--transition-fast)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        style={{
          padding: 'var(--sp-2) var(--sp-4)',
          backgroundColor: 'var(--accent)',
          border: 'none',
          borderRadius: 'var(--r-sm)',
          color: 'var(--text-primary)',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          opacity: isSubmitting ? 0.7 : 1,
          transition: 'all var(--transition-fast)'
        }}
        onMouseEnter={(e) => {
          if (!isSubmitting) e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
        }}
        onMouseLeave={(e) => {
          if (!isSubmitting) e.currentTarget.style.backgroundColor = 'var(--accent)'
        }}
      >
        {isSubmitting ? 'Creating...' : 'Create Draft'}
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New SOP Document" footer={footer}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
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

        <div>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: '6px'
          }}>
            SOP Title
          </label>
          <input
            type="text"
            placeholder="e.g. Employee Onboarding Procedure"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            required
            style={{
              width: '100%',
              padding: 'var(--sp-3) var(--sp-4)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: '6px'
          }}>
            Template Type
          </label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: 'var(--sp-3) var(--sp-4)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none'
            }}
          >
            {TEMPLATE_TYPES.map(tt => (
              <option key={tt} value={tt}>{tt}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: '6px'
          }}>
            Description
          </label>
          <textarea
            placeholder="Briefly describe what this procedure covers..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            required
            rows={4}
            style={{
              width: '100%',
              padding: 'var(--sp-3) var(--sp-4)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </form>
    </Modal>
  )
}
