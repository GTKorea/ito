'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, CheckCircle2 } from 'lucide-react';
import { getFileTypeInfo } from '@/lib/file-utils';

interface FileUploadProps {
  taskId: string;
  onUploadComplete: () => void;
}

interface UploadingFile {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

export function FileUpload({ taskId, onUploadComplete }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('files');

  const uploadFiles = async (files: File[]) => {
    const entries = files.map((file) => ({ file, status: 'uploading' as const }));
    setUploadingFiles(entries);

    for (let i = 0; i < entries.length; i++) {
      try {
        const formData = new FormData();
        formData.append('file', entries[i].file);
        formData.append('taskId', taskId);
        await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setUploadingFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'done' } : f))
        );
      } catch {
        setUploadingFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'error' } : f))
        );
      }
    }

    setTimeout(() => {
      setUploadingFiles([]);
      onUploadComplete();
    }, 500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) uploadFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) uploadFiles(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isUploading = uploadingFiles.length > 0;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-lg border border-dashed p-4 text-center transition-colors ${
        dragOver ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        multiple
      />
      {isUploading ? (
        <div className="space-y-1.5">
          {uploadingFiles.map((uf, i) => {
            const info = getFileTypeInfo(uf.file.type);
            const Icon = info.icon;
            return (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${info.color}`} />
                <span className="truncate flex-1 text-left">{uf.file.name}</span>
                {uf.status === 'uploading' && <Loader2 className="h-3 w-3 animate-spin" />}
                {uf.status === 'done' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                {uf.status === 'error' && <X className="h-3 w-3 text-red-500" />}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('dropFileHere')}</p>
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1 h-3.5 w-3.5" />
            {t('chooseFile')}
          </Button>
        </div>
      )}
    </div>
  );
}
