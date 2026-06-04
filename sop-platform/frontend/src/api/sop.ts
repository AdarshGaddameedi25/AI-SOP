import axiosInstance from './axiosInstance'
import { ApiResponse, SOP, SOPContent, CreateSOPPayload, SOPListResponse, GenerateSOPPayload, SOPVersionHistory } from '../types'

export async function createSopApi(payload: CreateSOPPayload): Promise<ApiResponse<SOP>> {
  const response = await axiosInstance.post<ApiResponse<SOP>>('/sop/create', payload)
  return response.data
}

export async function listSopsApi(page = 1, limit = 10): Promise<ApiResponse<SOPListResponse>> {
  const response = await axiosInstance.get<ApiResponse<SOPListResponse>>('/sop/list', {
    params: { page, limit }
  })
  return response.data
}

export async function getSopDetailsApi(id: string): Promise<ApiResponse<SOP>> {
  const response = await axiosInstance.get<ApiResponse<SOP>>(`/sop/${id}`)
  return response.data
}

export async function saveSopContentApi(id: string, content: SOPContent): Promise<ApiResponse<SOP>> {
  const response = await axiosInstance.put<ApiResponse<SOP>>(`/sop/${id}/content`, { content })
  return response.data
}

export async function deleteSopApi(id: string): Promise<ApiResponse<void>> {
  const response = await axiosInstance.delete<ApiResponse<void>>(`/sop/${id}`)
  return response.data
}

export async function generateSopContentApi(payload: GenerateSOPPayload): Promise<ApiResponse<{ generated_content: SOPContent }>> {
  const response = await axiosInstance.post<ApiResponse<{ generated_content: SOPContent }>>('/sop/generate', payload)
  return response.data
}

export async function searchSopsSemanticApi(query: string, limit = 5): Promise<ApiResponse<SOP[]>> {
  const response = await axiosInstance.get<ApiResponse<SOP[]>>('/sop/search', {
    params: { query, limit }
  })
  return response.data
}

export async function getSopVersionsApi(sopId: string): Promise<ApiResponse<SOPVersionHistory[]>> {
  const response = await axiosInstance.get<ApiResponse<SOPVersionHistory[]>>(`/sop/${sopId}/versions`)
  return response.data
}

export async function getSopVersionDetailApi(versionId: number): Promise<ApiResponse<SOPVersionHistory>> {
  const response = await axiosInstance.get<ApiResponse<SOPVersionHistory>>(`/sop/versions/${versionId}`)
  return response.data
}

export async function classifySopApi(id: string): Promise<ApiResponse<any>> {
  const response = await axiosInstance.post<ApiResponse<any>>(`/sop/${id}/classify`)
  return response.data
}

export async function previewSopPdfApi(sopId: string, content: SOPContent): Promise<Blob> {
  const response = await axiosInstance.post(
    `/export/${sopId}/pdf-preview`,
    { content },
    { responseType: 'blob' }
  )
  return response.data as Blob
}
