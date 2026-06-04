import { SOPStatus, StatusConfig } from '../types'

export const STATUS_CONFIG: Record<SOPStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    color: 'var(--s-draft)',
    bg: 'var(--s-draft-bg)',
    icon: '',
  },
  under_review: {
    label: 'Under Review',
    color: 'var(--s-review)',
    bg: 'var(--s-review-bg)',
    icon: '',
  },
  review_approved: {
    label: 'Review Approved',
    color: 'var(--s-approved-r)',
    bg: 'var(--s-approved-r-bg)',
    icon: '',
  },
  review_rejected: {
    label: 'Review Rejected',
    color: 'var(--s-rejected)',
    bg: 'var(--s-rejected-bg)',
    icon: '',
  },
  final_approved: {
    label: 'Verified',
    color: 'var(--s-final)',
    bg: 'var(--s-final-bg)',
    icon: '',
  },
  archived: {
    label: 'Archived',
    color: 'var(--s-archived)',
    bg: 'var(--s-archived-bg)',
    icon: '',
  },
}

export function getStatusConfig(status: SOPStatus): StatusConfig {
  return STATUS_CONFIG[status] ?? {
    label: status,
    color: 'var(--text-muted)',
    bg: 'var(--bg-card)',
    icon: '',
  }
}

export function isEditable(status: SOPStatus): boolean {
  return status === 'draft' || status === 'review_rejected'
}

export function isSubmittable(status: SOPStatus): boolean {
  return status === 'draft'
}

export function isResubmittable(status: SOPStatus): boolean {
  return status === 'review_rejected'
}

export function canAuthorAct(status: SOPStatus): boolean {
  return status === 'draft' || status === 'review_rejected'
}
