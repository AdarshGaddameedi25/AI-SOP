import { JSX, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}: ModalProps): JSX.Element | null {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const getWidth = () => {
    switch (size) {
      case 'sm': return '400px'
      case 'lg': return '800px'
      case 'xl': return '1100px'
      case 'md':
      default: return '600px'
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'modalFadeInFast 200ms ease both'
      }}
      onClick={onClose}
    >
      <style>
        {`
          @keyframes modalFadeInFast {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes modalFadeIn {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
      <div
        style={{
          width: getWidth(),
          maxWidth: '90vw',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalFadeIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--sp-4) var(--sp-6)',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px',
              borderRadius: 'var(--r-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            &times;
          </button>
        </div>

        <div
          style={{
            flex: 1,
            padding: 'var(--sp-6)',
            overflowY: 'auto',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            lineHeight: 1.6
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              padding: 'var(--sp-4) var(--sp-6)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 'var(--sp-3)',
              backgroundColor: 'rgba(0, 0, 0, 0.15)'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
