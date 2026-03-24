'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useChatStore, type ChatMessage, type ChatFile } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Send, Paperclip, Loader2, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThreadPanelProps {
  taskId: string;
  parentMessage: ChatMessage;
  onClose: () => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';

export function ThreadPanel({ taskId, parentMessage, onClose }: ThreadPanelProps) {
  const {
    threadMessagesByParent,
    threadLoadingByParent,
    threadHasMoreByParent,
    openThread,
    closeThread,
    sendThreadReply,
    fetchMoreThreadReplies,
    uploadChatFile,
  } = useChatStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<ChatFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialScrollDone = useRef(false);
  const isComposingRef = useRef(false);
  const t = useTranslations('chat');

  const replies = threadMessagesByParent[parentMessage.id] || [];
  const isLoading = threadLoadingByParent[parentMessage.id] || false;
  const hasMore = threadHasMoreByParent[parentMessage.id] || false;

  useEffect(() => {
    openThread(taskId, parentMessage.id);
    return () => closeThread();
  }, [taskId, parentMessage.id, openThread, closeThread]);

  useEffect(() => {
    if (replies.length > 0) {
      const container = messagesContainerRef.current;
      if (!container) return;

      if (!initialScrollDone.current) {
        messagesEndRef.current?.scrollIntoView();
        initialScrollDone.current = true;
        return;
      }

      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < 100) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [replies]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoading || !hasMore) return;

    if (container.scrollTop < 50) {
      fetchMoreThreadReplies(taskId, parentMessage.id);
    }
  }, [taskId, parentMessage.id, isLoading, hasMore, fetchMoreThreadReplies]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...files]);
    setUploading(true);

    try {
      const uploaded: ChatFile[] = [];
      for (const file of files) {
        const result = await uploadChatFile(taskId, file);
        uploaded.push(result);
      }
      setUploadedFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const content = input.trim();
    if ((!content && uploadedFiles.length === 0) || sending) return;

    setSending(true);
    setInput('');
    const fileIds = uploadedFiles.map((f) => f.id);
    setSelectedFiles([]);
    setUploadedFiles([]);

    try {
      await sendThreadReply(
        taskId,
        parentMessage.id,
        content || '',
        fileIds.length > 0 ? fileIds : undefined,
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderFiles = (files?: ChatFile[]) => {
    if (!files || files.length === 0) return null;
    return (
      <div className="mt-1 flex flex-col gap-1">
        {files.map((file) => (
          <div key={file.id}>
            {isImageFile(file.mimeType) ? (
              <a
                href={`${API_URL}${file.url}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={`${API_URL}${file.url}`}
                  alt={file.filename}
                  className="max-w-[200px] max-h-[150px] rounded-md object-cover"
                />
              </a>
            ) : (
              <a
                href={`${API_URL}${file.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md bg-[#2A2A2A] px-2 py-1.5 hover:bg-[#333] transition-colors"
              >
                <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-[#CCCCCC] truncate">
                  {file.filename}
                </span>
                <span className="text-[9px] text-muted-foreground shrink-0">
                  {formatFileSize(file.size)}
                </span>
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-[#0F0F0F]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-[#ECECEC]">Thread</h3>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent message preview */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start gap-2">
          <Avatar className="h-6 w-6 shrink-0 mt-0.5">
            <AvatarFallback className="text-[9px] bg-secondary">
              {parentMessage.sender.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#CCCCCC]">
                {parentMessage.sender.name}
              </span>
              <span className="text-[9px] text-muted-foreground/60">
                {formatTime(parentMessage.createdAt)}
              </span>
            </div>
            <p className="text-[12px] text-[#999] mt-0.5 line-clamp-2">
              {parentMessage.content}
            </p>
            {renderFiles(parentMessage.files)}
          </div>
        </div>
        {(parentMessage.replyCount || 0) > 0 && (
          <div className="mt-2 text-[10px] text-muted-foreground">
            {parentMessage.replyCount} {parentMessage.replyCount === 1 ? 'reply' : 'replies'}
          </div>
        )}
      </div>

      {/* Replies */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar"
        onScroll={handleScroll}
      >
        {isLoading && replies.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-xs text-muted-foreground">{t('noRepliesYet')}</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center py-2">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <button
                    onClick={() => fetchMoreThreadReplies(taskId, parentMessage.id)}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('loadMore')}
                  </button>
                )}
              </div>
            )}
            {replies.map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div key={msg.id} className="flex items-start gap-2">
                  <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                    <AvatarFallback className="text-[9px] bg-secondary">
                      {msg.sender.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-[#CCCCCC]">
                        {msg.sender.name}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    {msg.content && msg.content.trim() && (
                      <div
                        className={cn(
                          'mt-0.5 rounded-lg px-3 py-1.5 text-[13px] leading-relaxed break-words inline-block',
                          isMe
                            ? 'bg-blue-600/90 text-white'
                            : 'bg-[#1E1E1E] text-[#E0E0E0]',
                        )}
                      >
                        {msg.content}
                      </div>
                    )}
                    {renderFiles(msg.files)}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* File preview */}
      {selectedFiles.length > 0 && (
        <div className="border-t border-border px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 rounded-md bg-[#1E1E1E] px-2 py-1"
              >
                <FileIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-[#CCCCCC] max-w-[120px] truncate">
                  {file.name}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {uploading && (
              <div className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Uploading...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            multiple
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={() => { isComposingRef.current = false; }}
            placeholder={t('replyPlaceholder')}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-[#1A1A1A] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 max-h-24 custom-scrollbar"
            style={{
              height: 'auto',
              minHeight: '36px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 96) + 'px';
            }}
          />
          <Button
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            onClick={handleSend}
            disabled={(!input.trim() && uploadedFiles.length === 0) || sending || uploading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
