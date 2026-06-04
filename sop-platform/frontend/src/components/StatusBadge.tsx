import { JSX } from 'react'
import { SOPStatus } from '../types'
import { getStatusConfig } from '../utils/statusHelpers'

interface StatusBadgeProps {
  status: SOPStatus
  style?: React.CSSProperties
}

export default function StatusBadge({ status, style }: StatusBadgeProps): JSX.Element {
  const config = getStatusConfig(status)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 'var(--r-sm)',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.color}25`,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        userSelect: 'none',
        ...style
      }}
    >
      {config.label}
    </span>
  )
}
