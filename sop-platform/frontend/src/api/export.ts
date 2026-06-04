import axiosInstance from './axiosInstance'

export async function downloadSopPdfApi(sopId: string): Promise<Blob> {
  const response = await axiosInstance.get(`/export/${sopId}/pdf`, {
    responseType: 'blob'
  })
  return response.data
}

export async function downloadSopDocxApi(sopId: string): Promise<Blob> {
  const response = await axiosInstance.get(`/export/${sopId}/docx`, {
    responseType: 'blob'
  })
  return response.data
}
