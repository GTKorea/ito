import { FileText, FileSpreadsheet, Image, Video, Music, File, Presentation } from 'lucide-react';

export interface FileTypeInfo {
  icon: typeof FileText;
  color: string;
  label: string;
}

export function getFileTypeInfo(mimeType: string): FileTypeInfo {
  if (mimeType === 'application/pdf') {
    return { icon: FileText, color: 'text-red-500', label: 'PDF' };
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return { icon: FileSpreadsheet, color: 'text-green-500', label: 'Spreadsheet' };
  }
  if (mimeType.includes('document') || mimeType.includes('msword') || mimeType.includes('rtf')) {
    return { icon: FileText, color: 'text-blue-500', label: 'Document' };
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return { icon: Presentation, color: 'text-orange-500', label: 'Presentation' };
  }
  if (mimeType.startsWith('image/')) {
    return { icon: Image, color: 'text-purple-500', label: 'Image' };
  }
  if (mimeType.startsWith('video/')) {
    return { icon: Video, color: 'text-pink-500', label: 'Video' };
  }
  if (mimeType.startsWith('audio/')) {
    return { icon: Music, color: 'text-cyan-500', label: 'Audio' };
  }
  return { icon: File, color: 'text-muted-foreground', label: 'File' };
}

export function getFileUrl(fileId: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';
  return `${apiUrl}/files/${fileId}/download`;
}

/**
 * Returns a direct static URL for inline viewing (images, previews).
 * Uses the static /uploads/ path which doesn't require JWT auth,
 * making it suitable for <img src="..."> and other inline elements.
 */
export function getFileViewUrl(fileUrl: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';
  return `${apiUrl}${fileUrl}`;
}
