'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTaskStore } from '@/stores/task-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { api } from '@/lib/api-client';
import { parseQuickInput } from '@/lib/quick-input-parser';
import { useTranslations } from 'next-intl';
import { Send, Loader2, AtSign, ChevronRight, Flag, CalendarDays } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserResult {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Urgent', color: 'text-red-400', bg: 'bg-red-500/15', dot: 'bg-red-400' },
  { value: 'HIGH', label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/15', dot: 'bg-orange-400' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/15', dot: 'bg-yellow-400' },
  { value: 'LOW', label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/15', dot: 'bg-blue-400' },
] as const;

export function QuickInput() {
  const t = useTranslations('tasks');
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<UserResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);

  const [isFocused, setIsFocused] = useState(false);
  const [priority, setPriority] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  // Map of display name -> user ID for resolved mentions
  const resolvedUsersRef = useRef<Map<string, string>>(new Map());

  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { createTask, connectChain, fetchCategorizedTasks } = useTaskStore();
  const { currentWorkspace } = useWorkspaceStore();

  const searchUsers = useCallback(
    async (query: string) => {
      if (!currentWorkspace) return;
      try {
        const { data } = await api.get('/users/search', {
          params: {
            workspaceId: currentWorkspace.id,
            ...(query.length > 0 ? { query } : {}),
          },
        });
        setAutocompleteResults(data);
        setSelectedIndex(0);
      } catch {
        setAutocompleteResults([]);
      }
    },
    [currentWorkspace],
  );

  // Detect @ mentions in input
  const handleInputChange = (value: string) => {
    setInput(value);

    const cursorPos = inputRef.current?.selectionStart ?? value.length;

    // Find the last @ before cursor that isn't already completed
    let atPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (value[i] === '@') {
        atPos = i;
        break;
      }
      // Stop if we hit ' > ' boundary (previous segment)
      if (i >= 2 && value.substring(i - 2, i + 1) === ' > ') {
        break;
      }
    }

    if (atPos >= 0) {
      const query = value.substring(atPos + 1, cursorPos);
      // Only show autocomplete if we're in a chain segment (after ' > ')
      const beforeAt = value.substring(0, atPos);
      const isInChainSegment = beforeAt.includes(' > ') || beforeAt.endsWith('>');

      if (isInChainSegment || atPos === 0) {
        setMentionQuery(query);
        setMentionStartPos(atPos);
        setShowAutocomplete(true);

        // Debounced search
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchUsers(query), 300);
        return;
      }
    }

    setShowAutocomplete(false);
    setMentionStartPos(-1);
  };

  const selectUser = (user: UserResult) => {
    // Store the user ID mapping
    resolvedUsersRef.current.set(user.name, user.id);

    // Replace the @query with @Username
    const before = input.substring(0, mentionStartPos);
    const after = input.substring(
      mentionStartPos + 1 + mentionQuery.length,
    );
    const newInput = `${before}@${user.name}${after}`;
    setInput(newInput);
    setShowAutocomplete(false);
    setMentionStartPos(-1);

    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAutocomplete && autocompleteResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < autocompleteResults.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : autocompleteResults.length - 1,
        );
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && showAutocomplete)) {
        e.preventDefault();
        selectUser(autocompleteResults[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        return;
      }
    }

    if (e.key === 'Enter' && !showAutocomplete) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || !currentWorkspace || isSubmitting) return;

    const parsed = parseQuickInput(input);
    if (!parsed.title.trim()) return;

    setIsSubmitting(true);
    try {
      const task = await createTask(
        currentWorkspace.id,
        parsed.title,
        undefined,
        priority ?? undefined,
        dueDate ?? undefined,
      );

      if (parsed.chain.length > 0) {
        // Resolve display names to user IDs
        const userIds: string[] = [];
        for (const name of parsed.chain) {
          const userId = resolvedUsersRef.current.get(name);
          if (!userId) {
            // Try to search for the user by name
            const { data } = await api.get('/users/search', {
              params: { workspaceId: currentWorkspace.id, query: name },
            });
            if (data.length > 0) {
              userIds.push(data[0].id);
              resolvedUsersRef.current.set(name, data[0].id);
            }
          } else {
            userIds.push(userId);
          }
        }

        if (userIds.length > 0) {
          await connectChain(task.id, userIds);
        }
      }

      // Refresh the task list
      await fetchCategorizedTasks(currentWorkspace.id);
      setInput('');
      setPriority(null);
      setDueDate(null);
      resolvedUsersRef.current.clear();
    } catch {
      // Error handled silently — could add toast notification here
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertAtCursor = (text: string) => {
    const el = inputRef.current;
    if (!el) return;

    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const newValue = input.substring(0, start) + text + input.substring(end);
    setInput(newValue);

    // Set cursor position after inserted text
    const newPos = start + text.length;
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newPos, newPos);
      // Trigger autocomplete detection for @ insertions
      handleInputChange(newValue);
    }, 0);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Delay blur to allow toolbar button clicks to register
    blurTimeoutRef.current = setTimeout(() => {
      setIsFocused(false);
      setShowPriorityMenu(false);
    }, 200);
  };

  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    // Prevent input blur when clicking toolbar
    e.preventDefault();
  };

  // Global keyboard shortcut: Cmd/Ctrl+N or just "/" to focus input
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+N
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      // "/" key — only when not already focused on an input/textarea
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !document.activeElement?.getAttribute('contenteditable')
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // Close priority menu when clicking outside
  useEffect(() => {
    if (!showPriorityMenu) return;
    const handleClick = () => setShowPriorityMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showPriorityMenu]);

  const selectedPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);

  if (!currentWorkspace) return null;

  return (
    <div className="relative px-8 pb-6 pt-4">
      {/* Autocomplete dropdown — positioned above the input */}
      {showAutocomplete && autocompleteResults.length > 0 && (
        <div className="absolute bottom-full left-8 right-8 mb-3 max-h-48 overflow-y-auto rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl">
          {autocompleteResults.map((user, index) => (
            <button
              key={user.id}
              onClick={() => selectUser(user)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors',
                index === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50',
              )}
            >
              <Avatar className="h-6 w-6" size="sm">
                <AvatarFallback className="text-[9px] bg-secondary">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-left min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Card-style input with toolbar */}
      <div className={cn(
        'rounded-xl overflow-hidden',
        'bg-card/40 backdrop-blur-md',
        'border border-border/50',
        'shadow-lg',
        'transition-all duration-300',
        isFocused && 'bg-card/80 border-border shadow-xl',
      )}>
        {/* Toolbar — slides in when focused */}
        <div
          className={cn(
            'grid transition-all duration-200 ease-out',
            isFocused ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
          onMouseDown={handleToolbarMouseDown}
        >
          <div className="overflow-hidden">
            <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border/30">
              {/* @ Mention button */}
              <button
                type="button"
                onClick={() => insertAtCursor('@')}
                title="Mention (@)"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <AtSign className="h-3.5 w-3.5" />
              </button>

              {/* Chain button */}
              <button
                type="button"
                onClick={() => insertAtCursor(' > @')}
                title="Chain (>)"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              {/* Priority button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPriorityMenu((prev) => !prev);
                  }}
                  title="Priority"
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                    priority
                      ? `${selectedPriority?.color}`
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )}
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>

                {/* Priority dropdown */}
                {showPriorityMenu && (
                  <div
                    className="absolute bottom-full left-0 mb-1.5 w-36 rounded-lg border border-border bg-card shadow-xl overflow-hidden z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setPriority(priority === opt.value ? null : opt.value);
                          setShowPriorityMenu(false);
                          inputRef.current?.focus();
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-accent/50',
                          priority === opt.value && 'bg-accent/30',
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full', opt.dot)} />
                        <span className={opt.color}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Due date button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => dateInputRef.current?.showPicker()}
                  title="Due date"
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                    dueDate
                      ? 'text-blue-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={dueDate ?? ''}
                  onChange={(e) => {
                    setDueDate(e.target.value || null);
                    inputRef.current?.focus();
                  }}
                  className="absolute inset-0 opacity-0 w-7 h-7 cursor-pointer"
                  tabIndex={-1}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Badges row — shows selected priority/due date */}
        {(selectedPriority || dueDate) && (
          <div className="flex items-center gap-1.5 px-4 pt-2">
            {selectedPriority && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                  selectedPriority.bg,
                  selectedPriority.color,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', selectedPriority.dot)} />
                {selectedPriority.label}
                <button
                  type="button"
                  onClick={() => setPriority(null)}
                  onMouseDown={handleToolbarMouseDown}
                  className="ml-0.5 hover:opacity-70"
                >
                  x
                </button>
              </span>
            )}
            {dueDate && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                <CalendarDays className="h-3 w-3" />
                {dueDate}
                <button
                  type="button"
                  onClick={() => setDueDate(null)}
                  onMouseDown={handleToolbarMouseDown}
                  className="ml-0.5 hover:opacity-70"
                >
                  x
                </button>
              </span>
            )}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <input
            ref={inputRef}
            data-quick-input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={t('quickInputPlaceholder')}
            disabled={isSubmitting}
            className="h-8 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isSubmitting}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              'bg-primary text-primary-foreground',
              'transition-all duration-200',
              'hover:bg-primary/90 hover:scale-105',
              'disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed',
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
