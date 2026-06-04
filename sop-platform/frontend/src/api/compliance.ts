import axiosInstance from './axiosInstance'
import { ApiResponse, ComplianceReport } from '../types'

export async function validateComplianceApi(sopId: number): Promise<ApiResponse<ComplianceReport>> {
  const response = await axiosInstance.post<ApiResponse<ComplianceReport>>('/compliance/validate', { sop_id: sopId })
  return response.data
}

export async function getComplianceReportApi(sopId: string): Promise<ApiResponse<ComplianceReport>> {
  const response = await axiosInstance.get<ApiResponse<ComplianceReport>>(`/compliance/${sopId}/report`)
  return response.data
}
