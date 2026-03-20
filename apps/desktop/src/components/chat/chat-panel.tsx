'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useChatStore, type ChatMessage } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Send, MessageCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  todoId: string;
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

export function ChatPanel({ todoId, onClose }: ChatPanelProps) {
  const {
    messagesByTodo,
    loadingByTodo,
    hasMoreByTodo,
    openChat,
    closeChat,
    sendMessage,
    fetchMoreMessages,
  } = useChatStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const t = useTranslations('chat');

  const messages = messagesByTodo[todoId] || [];
  const isLoading = loadingByTodo[todoId] || false;
  const hasMore = hasMoreByTodo[todoId] || false;

  useEffect(() => {
    openChat(todoId);
    return () => closeChat();
  }, [todoId, openChat, closeChat]);

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
      fetchMoreMessages(todoId);
    }
  }, [todoId, isLoading, hasMore, fetchMoreMessages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput('');
    try {
      await sendMessage(todoId, content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-[#0F0F0F]">
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
                    onClick={() => fetchMoreMessages(todoId)}
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

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center justify-center py-3">
                      <span className="text-[10px] text-muted-foreground/60 bg-[#0F0F0F] px-2">
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      'flex gap-2',
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

                      <div className="group flex items-end gap-1.5">
                        {isMe && (
                          <span className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors shrink-0">
                            {formatTime(msg.createdAt)}
                          </span>
                        )}
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
                        {!isMe && (
                          <span className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors shrink-0">
                            {formatTime(msg.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
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
            disabled={!input.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
