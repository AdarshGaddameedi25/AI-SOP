

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours   = Math.floor(minutes / 60)
    const days    = Math.floor(hours / 24)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24)   return `${hours}h ago`
    if (days < 7)     return `${days}d ago`
    return formatDate(iso)
  } catch {
    return '—'
  }
}

export function formatCompact(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const day   = d.getDate()
    const month = d.toLocaleString('en-US', { month: 'short' })
    const time  = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `${day} ${month} · ${time}`
  } catch {
    return '—'
  }
}
