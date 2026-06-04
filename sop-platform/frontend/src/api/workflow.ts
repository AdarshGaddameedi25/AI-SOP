import axiosInstance from './axiosInstance'
import { ApiResponse, SOP } from '../types'

export async function submitReviewApi(sopId: string): Promise<ApiResponse<SOP>> {
  const response = await axiosInstance.post<ApiResponse<SOP>>(`/workflow/${sopId}/submit-review`)
  return response.data
}

export async function reviewerApproveApi(sopId: string, comments?: string): Promise<ApiResponse<SOP>> {
  const response = await axiosInstance.post<ApiResponse<SOP>>(`/workflow/${sopId}/reviewer-approve`, { comments })
  return response.data
}

export async function reviewerRejectApi(sopId: string, comments: string): Promise<ApiResponse<SOP>> {
  const response = await axiosInstance.post<ApiResponse<SOP>>(`/workflow/${sopId}/reviewer-reject`, { comments })
  return response.data
}

export async function finalApproveApi(sopId: string): Promise<ApiResponse<SOP>> {
  const response = await axiosInstance.post<ApiResponse<SOP>>(`/workflow/${sopId}/final-approve`)
  return response.data
}

export async function resubmitSopApi(sopId: string): Promise<ApiResponse<SOP>> {
  const response = await axiosInstance.post<ApiResponse<SOP>>(`/workflow/${sopId}/resubmit`)
  return response.data
}

export async function archiveSopApi(sopId: string): Promise<ApiResponse<SOP>> {
  const response = await axiosInstance.post<ApiResponse<SOP>>(`/workflow/${sopId}/archive`)
  return response.data
}
