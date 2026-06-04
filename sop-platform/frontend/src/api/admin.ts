import axiosInstance from './axiosInstance'
import { ApiResponse, User, AdminDashboard, WorkflowEvent, AuditLogResponse } from '../types'

export async function adminListUsersApi(page = 1, limit = 50): Promise<ApiResponse<{ users: User[]; total: number; page: number; limit: number; pages: number }>> {
  const response = await axiosInstance.get<ApiResponse<{ users: User[]; total: number; page: number; limit: number; pages: number }>>('/admin/users', {
    params: { page, limit }
  })
  return response.data
}

export async function adminUpdateUserRoleApi(userId: string, role: string): Promise<ApiResponse<User>> {
  const response = await axiosInstance.put<ApiResponse<User>>(`/admin/users/${userId}/role`, { role })
  return response.data
}

export async function adminGetDashboardStatsApi(): Promise<ApiResponse<AdminDashboard>> {
  const response = await axiosInstance.get<ApiResponse<AdminDashboard>>('/admin/dashboard')
  return response.data
}

export async function adminGetWorkflowActivityApi(limit = 20): Promise<ApiResponse<{ activity: WorkflowEvent[], total: number }>> {
  const response = await axiosInstance.get<ApiResponse<{ activity: WorkflowEvent[], total: number }>>('/admin/workflow-activity', {
    params: { limit }
  })
  return response.data
}

export async function adminGetAuditLogsApi(page = 1, limit = 50, sopId?: string, action?: string): Promise<ApiResponse<AuditLogResponse>> {
  const response = await axiosInstance.get<ApiResponse<AuditLogResponse>>('/audit/logs', {
    params: { page, limit, sop_id: sopId, action }
  })
  return response.data
}

export async function adminDeleteUserApi(userId: string): Promise<ApiResponse<null>> {
  const response = await axiosInstance.delete<ApiResponse<null>>(`/admin/users/${userId}`)
  return response.data
}
