'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FileText, Image, Download, Trash2, Loader2 } from 'lucide-react';

interface FileItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

interface FileListProps {
  todoId: string;
  refreshKey: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export function FileList({ todoId, refreshKey }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/files/todo/${todoId}`)
      .then(({ data }) => setFiles(data))
      .catch((e) => console.error('Failed to load files:', e))
      .finally(() => setIsLoading(false));
  }, [todoId, refreshKey]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/files/${id}`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleDownload = (file: FileItem) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    window.open(`${baseUrl}/files/${file.id}/download`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (files.length === 0) return null;

  return (
    <div className="space-y-1">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <FileIcon mimeType={file.mimeType} />
          <span className="flex-1 truncate text-xs">{file.filename}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatSize(file.size)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => handleDownload(file)}
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-destructive"
            onClick={() => handleDelete(file.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
