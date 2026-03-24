'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useChatStore, type ChatMessage, type ChatFile } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  X,
  Send,
  MessageCircle,
  Loader2,
  Paperclip,
  MessageSquare,
  FileIcon,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileTypeInfo } from '@/lib/file-utils';
import { getSocket } from '@/lib/ws-client';
import { ThreadPanel } from './thread-panel';

interface ChatPanelProps {
  taskId: string;
  onClose: () => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function shouldShowDateSeparator(
  current: ChatMessage,
  previous?: ChatMessage,
): boolean {
  if (!previous) return true;
  const a = new Date(current.createdAt).toDateString();
  const b = new Date(previous.createdAt).toDateString();
  return a !== b;
}

function isSameGroup(
  current: ChatMessage,
  previous?: ChatMessage,
): boolean {
  if (!previous) return false;
  if (current.senderId !== previous.senderId) return false;
  const diff =
    new Date(current.createdAt).getTime() -
    new Date(previous.createdAt).getTime();
  return diff < 2 * 60 * 1000; // 2 minutes
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

export function ChatPanel({ taskId, onClose }: ChatPanelProps) {
  const {
    messagesByTask,
    loadingByTask,
    hasMoreByTask,
    activeThreadParentId,
    openChat,
    closeChat,
    sendMessage,
    fetchMoreMessages,
    openThread,
    closeThread,
    uploadChatFile,
  } = useChatStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<ChatFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [chatDragOver, setChatDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialScrollDone = useRef(false);
  const isComposingRef = useRef(false);
  const t = useTranslations('chat');

  const messages = messagesByTask[taskId] || [];
  const isLoading = loadingByTask[taskId] || false;
  const hasMore = hasMoreByTask[taskId] || false;

  const threadParentMessage = activeThreadParentId
    ? messages.find((m) => m.id === activeThreadParentId)
    : null;

  useEffect(() => {
    openChat(taskId);
    return () => closeChat();
  }, [taskId, openChat, closeChat]);

  // TASK 2: Handle visibility change — unfocus when tab hidden, refocus when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      const socket = getSocket();
      if (!socket) return;
      if (document.hidden) {
        socket.emit('chatUnfocus', { taskId });
      } else {
        socket.emit('chatFocus', { taskId });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [taskId]);

  // TASK 2: Re-emit chatFocus on socket reconnect
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleReconnect = () => {
      socket.emit('chatFocus', { taskId });
    };
    socket.on('connect', handleReconnect);
    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [taskId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Only auto-scroll if user is near bottom or it's the initial load
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
  }, [messages]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoading || !hasMore) return;

    if (container.scrollTop < 50) {
      fetchMoreMessages(taskId);
    }
  }, [taskId, isLoading, hasMore, fetchMoreMessages]);

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

  const handleChatDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setChatDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const result = await uploadChatFile(taskId, file);
        setSelectedFiles((prev) => [...prev, file]);
        setUploadedFiles((prev) => [...prev, result]);
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setUploading(false);
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
      await sendMessage(
        taskId,
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

  const handleOpenThread = (msg: ChatMessage) => {
    openThread(taskId, msg.id);
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
              (() => {
                const info = getFileTypeInfo(file.mimeType);
                const TypeIcon = info.icon;
                return (
                  <a
                    href={`${API_URL}${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md bg-[#2A2A2A] px-2 py-1.5 hover:bg-[#333] transition-colors"
                  >
                    <TypeIcon className={`h-3.5 w-3.5 shrink-0 ${info.color}`} />
                    <span className="text-[11px] text-[#CCCCCC] truncate">
                      {file.filename}
                    </span>
                    <span className="text-[9px] text-muted-foreground shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                  </a>
                );
              })()
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full">
      {/* Main chat area */}
      <div
        className={cn(
          'relative flex h-full flex-col border-l border-border bg-[#0F0F0F]',
          threadParentMessage ? 'w-[40%]' : 'w-full',
        )}
        onDragOver={(e) => { e.preventDefault(); setChatDragOver(true); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setChatDragOver(false);
          }
        }}
        onDrop={handleChatDrop}
      >
        {/* Drag overlay */}
        {chatDragOver && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-8 w-8" />
              <p className="text-sm font-medium">{t('dropFilesHere')}</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-[#ECECEC]">{t('title')}</h3>
            {messages.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {messages.length}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5"
          onScroll={handleScroll}
        >
          {isLoading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">{t('empty')}</p>
            </div>
          ) : (
            <>
              {hasMore && (
                <div className="flex justify-center py-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <button
                      onClick={() => fetchMoreMessages(taskId)}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t('loadMore')}
                    </button>
                  )}
                </div>
              )}
              {messages.map((msg, i) => {
                const prev = i > 0 ? messages[i - 1] : undefined;
                const isMe = msg.senderId === user?.id;
                const grouped = isSameGroup(msg, prev);
                const showDate = shouldShowDateSeparator(msg, prev);
                const isHovered = hoveredMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    {showDate && (
                      <div className="flex items-center justify-center py-3">
                        <span className="text-[10px] text-muted-foreground/60 bg-[#0F0F0F] px-2">
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'relative flex gap-2',
                        isMe ? 'justify-end' : 'justify-start',
                        grouped ? 'mt-0.5' : 'mt-3',
                      )}
                    >
                      {/* Avatar for others (only on first message in group) */}
                      {!isMe && !grouped && (
                        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                          <AvatarFallback className="text-[9px] bg-secondary">
                            {msg.sender.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!isMe && grouped && <div className="w-6 shrink-0" />}

                      <div
                        className={cn(
                          'max-w-[75%] flex flex-col',
                          isMe ? 'items-end' : 'items-start',
                        )}
                      >
                        {/* Sender name for others (first in group) */}
                        {!isMe && !grouped && (
                          <span className="text-[10px] text-muted-foreground mb-0.5 ml-1">
                            {msg.sender.name}
                          </span>
                        )}

                        <div className="flex items-end gap-1.5">
                          {isMe && (
                            <span className="text-[9px] text-muted-foreground/60 shrink-0">
                              {formatTime(msg.createdAt)}
                            </span>
                          )}
                          <div>
                            {msg.content && msg.content.trim() && (
                              <div
                                className={cn(
                                  'rounded-2xl px-3 py-1.5 text-[13px] leading-relaxed break-words',
                                  isMe
                                    ? 'bg-blue-600/90 text-white rounded-br-md'
                                    : 'bg-[#1E1E1E] text-[#E0E0E0] rounded-bl-md',
                                )}
                              >
                                {msg.content}
                              </div>
                            )}
                            {renderFiles(msg.files)}
                          </div>
                          {!isMe && (
                            <span className="text-[9px] text-muted-foreground/60 shrink-0">
                              {formatTime(msg.createdAt)}
                            </span>
                          )}
                        </div>

                        {/* Reply count */}
                        {(msg.replyCount || 0) > 0 && (
                          <button
                            onClick={() => handleOpenThread(msg)}
                            className="mt-1 ml-1 flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <MessageSquare className="h-3 w-3" />
                            {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                      </div>

                      {/* Hover action bar */}
                      {isHovered && (
                        <div
                          className={cn(
                            'absolute -top-3 flex items-center rounded-md border border-border bg-[#1A1A1A] shadow-sm',
                            isMe ? 'right-0' : 'left-8',
                          )}
                        >
                          <button
                            onClick={() => handleOpenThread(msg)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            title="Reply in thread"
                          >
                            <MessageSquare className="h-3 w-3" />
                          </button>
                        </div>
                      )}
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
              placeholder={t('placeholder')}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-border bg-[#1A1A1A] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 max-h-24"
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

      {/* Thread panel (slide-in from right) */}
      {threadParentMessage && (
        <div className="w-[60%] h-full">
          <ThreadPanel
            taskId={taskId}
            parentMessage={threadParentMessage}
            onClose={() => closeThread()}
          />
        </div>
      )}
    </div>
  );
}
