'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Loader2, Eye } from 'lucide-react';
import { FilePreviewModal } from './file-preview-modal';
import { getFileTypeInfo, getFileUrl, getFileViewUrl } from '@/lib/file-utils';

interface FileItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

interface FileListProps {
  taskId: string;
  refreshKey: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const info = getFileTypeInfo(mimeType);
  const Icon = info.icon;
  return <Icon className={`h-4 w-4 ${info.color}`} />;
}

export function FileList({ taskId, refreshKey }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    api
      .get(`/files/task/${taskId}`)
      .then(({ data }) => setFiles(data))
      .catch((e) => console.error('Failed to load files:', e))
      .finally(() => setIsLoading(false));
  }, [taskId, refreshKey]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/files/${id}`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleDownload = (file: FileItem) => {
    window.open(getFileUrl(file.id), '_blank');
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
    <>
      <div className="space-y-1">
        {files.map((file, index) => (
          <div
            key={file.id}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm group cursor-pointer hover:border-border/80 transition-colors"
            onClick={() => setPreviewIndex(index)}
          >
            {file.mimeType.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getFileViewUrl(file.url)}
                alt={file.filename}
                className="h-8 w-8 rounded object-cover shrink-0"
              />
            ) : (
              <FileIcon mimeType={file.mimeType} />
            )}
            <span className="flex-1 truncate text-xs">{file.filename}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatSize(file.size)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIndex(index);
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(file);
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(file.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {previewIndex !== null && (
        <FilePreviewModal
          files={files}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </>
  );
}
