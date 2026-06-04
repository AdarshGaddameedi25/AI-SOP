import { ExportFormat } from '../types'


export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}


export function buildSOPFilename(
  sopNumber: string,
  title: string,
  format: ExportFormat
): string {
  const sanitized = title
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 50)
  return `${sopNumber}_${sanitized}.${format}`
}


export function getMimeType(format: ExportFormat): string {
  const mimeMap: Record<ExportFormat, string> = {
    pdf:  'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return mimeMap[format]
}
