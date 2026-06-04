
export type Role = 'author' | 'reviewer' | 'approver' | 'admin'

export type SOPStatus =
  | 'draft'
  | 'under_review'
  | 'review_approved'
  | 'review_rejected'
  | 'final_approved'
  | 'archived'

export type ComplianceClass =
  | 'Audit Ready'
  | 'Minor Gaps'
  | 'Moderate Gaps'
  | 'Major Revision Required'

export type ApprovalStage = 'review' | 'final'

export type ExportFormat = 'pdf' | 'docx'


export interface User {
  id: string
  username: string
  email: string
  role: Role
  created_at: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}


export interface SOP {
  id: string
  sop_number: string
  title: string
  template_type: string
  description: string
  status: SOPStatus
  version: string
  content: SOPContent | Record<string, unknown>
  created_by: string
  created_by_username: string | null
  updated_by: string | null
  updated_by_username: string | null
  current_reviewer: string | null
  current_reviewer_username: string | null
  current_approver: string | null
  current_approver_username: string | null
  rejection_comments: string | null
  created_at: string
  updated_at: string
  reviewer_approved_at: string | null
  approved_at: string | null
  is_deleted: boolean
}

export interface SOPContent {
  purpose: string
  scope: string
  responsibilities: string
  procedure: string[]
  references: string[]
  document_header?: Record<string, unknown>
  definitions?: { term: string; definition: string }[] | string
  prerequisites?: string
  quality_control_checkpoints?: string[]
  deviation_handling?: string
  revision_history?: Record<string, unknown>[]
  approval_block?: Record<string, unknown>
  security_classification?: {
    security_risk_level: string
    security_risk_reason: string
    gxp_classification: string
    information_security_classification: string
    safety_risk_level: string
    recommended_controls: string[]
  }
}

export interface SOPVersionHistory {
  id: number
  sop_id: number
  version: string
  title: string
  content: SOPContent
  summary: string | null
  created_at: string
  created_by: number
  creator_username: string | null
}

export interface CreateSOPPayload {
  title: string
  template_type: string
  description: string
  critical_steps?: string
}

export interface GenerateSOPPayload extends CreateSOPPayload {
  sop_id?: string
  extra_instructions?: string
}

export interface SOPListResponse {
  sops: SOP[]
  total: number
  page: number
  limit: number
  pages: number
  role_filter: string
}


export interface SectionResult {
  section: string
  passed: boolean
  notes?: string
}

export interface AuditCategoryResult {
  category: string
  passed: number
  failed: number
  checks: SectionResult[]
}

export interface ComplianceReport {
  id: string
  sop_id: string
  score: number
  classification: ComplianceClass
  total_checks: number
  passed_checks_count: number
  failed_checks_count: number
  audit_results: Record<string, unknown>
  critical_failures: string[]
  missing_sections: string[]
  recommendations: string[]
  triggered_by: string | null
  triggered_by_username: string | null
  created_at: string
}


export interface Approval {
  id: string
  sop_id: string
  reviewer_id: string
  reviewer_username: string | null
  reviewer_role: Role | null
  approval_stage: ApprovalStage
  status: string
  comments: string | null
  timestamp: string
}

export interface WorkflowEvent {
  id: string
  sop_id: string | null
  sop_number?: string
  sop_title?: string
  user_id: string
  username: string | null
  user_role: Role | null
  action: string
  details: string | null
  timestamp: string
}


export interface AuditLog {
  id: string
  action: string
  sop_id: string | null
  user_id: string
  username: string | null
  user_role: Role | null
  details: string | null
  timestamp: string
}

export interface AuditLogResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  pages: number
}


export interface AdminDashboard {
  sops: {
    total: number
    by_status: Record<SOPStatus, {
      count: number
      label: string
      color: string
    }>
  }
  users: {
    total: number
    by_role: Record<Role, number>
  }
  compliance: {
    total_reports: number
    average_score: number | null
  }
  audit: {
    activity_last_24h: number
  }
}

export interface AdminUsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
  pages: number
  role_filter: string | null
}


export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}


export interface StatusConfig {
  label: string
  color: string
  bg: string
  icon: string
}

export interface NavItem {
  label: string
  path: string
  icon: string
  roles: Role[]
}
