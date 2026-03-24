'use client';

import { useEffect, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, ChevronLeft, ChevronRight, Download, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFileTypeInfo, getFileUrl, getFileViewUrl } from '@/lib/file-utils';

interface FileItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

interface FilePreviewModalProps {
  files: FileItem[];
  initialIndex: number;
  onClose: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilePreviewModal({ files, initialIndex, onClose }: FilePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const file = files[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;
  const t = useTranslations('files');

  const handlePrev = useCallback(() => {
    if (hasPrev) setCurrentIndex((i) => i - 1);
  }, [hasPrev]);

  const handleNext = useCallback(() => {
    if (hasNext) setCurrentIndex((i) => i + 1);
  }, [hasNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  if (!file) return null;

  const renderContent = () => {
    // PDF preview
    if (file.mimeType === 'application/pdf') {
      return (
        <iframe
          src={getFileUrl(file.id)}
          className="w-full h-[80vh] rounded-lg"
          title={file.filename}
        />
      );
    }

    // Video preview
    if (file.mimeType.startsWith('video/')) {
      return (
        <video
          controls
          src={getFileViewUrl(file.url)}
          className="max-w-full max-h-[80vh] rounded-lg"
        />
      );
    }

    // Audio preview
    if (file.mimeType.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-[#1A1A1A] border border-border p-8 min-w-[300px]">
          <Music className="h-16 w-16 text-cyan-500" />
          <p className="text-sm font-medium text-foreground">{file.filename}</p>
          <audio controls src={getFileViewUrl(file.url)} className="w-full max-w-md" />
        </div>
      );
    }

    // Image preview
    if (file.mimeType.startsWith('image/')) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getFileViewUrl(file.url)}
          alt={file.filename}
          className="max-h-[80vh] max-w-[80vw] object-contain rounded-lg"
        />
      );
    }

    // Fallback for other types
    const info = getFileTypeInfo(file.mimeType);
    const TypeIcon = info.icon;
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-[#1A1A1A] border border-border p-8 min-w-[300px]">
        <TypeIcon className={`h-16 w-16 ${info.color}`} />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{file.filename}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatSize(file.size)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('unsupportedPreview')}</p>
        </div>
        <Button
          size="sm"
          onClick={() => window.open(getFileUrl(file.id), '_blank')}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {t('download')}
        </Button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 z-10"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* File info header */}
      <div className="absolute top-4 left-4 flex items-center gap-3 z-10">
        <span className="text-sm text-white/90 font-medium truncate max-w-[300px]">
          {file.filename}
        </span>
        <span className="text-xs text-white/50">{formatSize(file.size)}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => window.open(getFileUrl(file.id), '_blank')}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          {t('download')}
        </Button>
      </div>

      {/* Navigation - Previous */}
      {hasPrev && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full z-10"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}

      {/* Navigation - Next */}
      {hasNext && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full z-10"
          onClick={handleNext}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}

      {/* Content */}
      <div className="flex items-center justify-center max-h-[85vh] max-w-[85vw]">
        {renderContent()}
      </div>

      {/* Index indicator */}
      {files.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50">
          {currentIndex + 1} / {files.length}
        </div>
      )}
    </div>
  );
}
