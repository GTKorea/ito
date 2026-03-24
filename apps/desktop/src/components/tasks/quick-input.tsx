'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTaskStore } from '@/stores/task-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useTaskGroupStore } from '@/stores/task-group-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { parseQuickInput } from '@/lib/quick-input-parser';
import { useTranslations } from 'next-intl';
import { Send, Loader2, AtSign, ChevronRight, Flag, CalendarDays, ShieldAlert, Hash, Users, Vote } from 'lucide-react';
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

interface QuickInputProps {
  taskGroupId?: string;
}

export function QuickInput({ taskGroupId }: QuickInputProps) {
  const t = useTranslations('tasks');
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<(UserResult | { id: string; name: string; special: true; icon: 'group' | 'workspace' })[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);

  // Group autocomplete state
  const [showGroupAutocomplete, setShowGroupAutocomplete] = useState(false);
  const [groupSuggestions, setGroupSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [groupAutocompleteIndex, setGroupAutocompleteIndex] = useState(0);
  const [groupMentionStartPos, setGroupMentionStartPos] = useState(0);
  const resolvedGroupRef = useRef<Map<string, string>>(new Map());

  const [isFocused, setIsFocused] = useState(false);
  const [priority, setPriority] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [isVoteMode, setIsVoteMode] = useState(false);

  // Map of display name -> user ID for resolved mentions
  const resolvedUsersRef = useRef<Map<string, string>>(new Map());

  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { createTask, connectChain, connectMultiThread, connectBlocker, silentRefetch } = useTaskStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { groups } = useTaskGroupStore();
  const { user: currentUser } = useAuthStore();

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

        // Add special @group and @workspace suggestions
        const specialSuggestions: (UserResult | { id: string; name: string; special: true; icon: 'group' | 'workspace' })[] = [];
        const lowerQuery = query.toLowerCase();

        if ('group'.startsWith(lowerQuery)) {
          specialSuggestions.push({ id: '__group__', name: 'group', special: true as const, icon: 'group' as const });
        }
        if ('workspace'.startsWith(lowerQuery)) {
          specialSuggestions.push({ id: '__workspace__', name: 'workspace', special: true as const, icon: 'workspace' as const });
        }

        setAutocompleteResults([...specialSuggestions, ...data]);
        setSelectedIndex(0);
      } catch {
        setAutocompleteResults([]);
      }
    },
    [currentWorkspace],
  );

  // Detect @ mentions and # group mentions in input
  const handleInputChange = (value: string) => {
    setInput(value);

    const cursorPos = inputRef.current?.selectionStart ?? value.length;

    // --- # Group autocomplete detection ---
    // Only look for # in the first segment (before any ' > ')
    const firstSegmentEnd = value.indexOf(' > ');
    const firstSegment = firstSegmentEnd === -1 ? value : value.substring(0, firstSegmentEnd);

    if (cursorPos <= firstSegment.length) {
      let hashPos = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (value[i] === '#') {
          hashPos = i;
          break;
        }
        if (value[i] === ' ' && i < cursorPos - 1) {
          // Allow spaces within the hash query for multi-word search? No — #(\S+) means no spaces
          break;
        }
      }

      if (hashPos >= 0) {
        const query = value.substring(hashPos + 1, cursorPos);
        if (query.length >= 0 && !query.includes(' ')) {
          const lowerQuery = query.toLowerCase();
          const filtered = groups.filter((g) =>
            g.name.toLowerCase().startsWith(lowerQuery),
          );
          if (filtered.length > 0) {
            setGroupSuggestions(filtered.map((g) => ({ id: g.id, name: g.name })));
            setGroupMentionStartPos(hashPos);
            setGroupAutocompleteIndex(0);
            setShowGroupAutocomplete(true);
            // Don't proceed to @ detection
            setShowAutocomplete(false);
            setMentionStartPos(-1);
            return;
          }
        }
      }
    }
    setShowGroupAutocomplete(false);

    // --- @ mention detection ---
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

  const selectUser = (user: UserResult | { id: string; name: string; special: true; icon: string }) => {
    if ('special' in user) {
      // Special keyword like @group or @workspace
      resolvedUsersRef.current.set(user.name, user.id);
    } else {
      // Store the user ID mapping
      resolvedUsersRef.current.set(user.name, user.id);
    }

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

  const selectGroup = (group: { id: string; name: string }) => {
    const before = input.substring(0, groupMentionStartPos);
    const after = input.substring(inputRef.current?.selectionStart ?? input.length);
    const newInput = before + '#' + group.name + after;
    setInput(newInput);
    resolvedGroupRef.current.set(group.name, group.id);
    setShowGroupAutocomplete(false);
    setTimeout(() => {
      const newPos = before.length + group.name.length + 1;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Group autocomplete keyboard handling
    if (showGroupAutocomplete && groupSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setGroupAutocompleteIndex((prev) =>
          prev < groupSuggestions.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setGroupAutocompleteIndex((prev) =>
          prev > 0 ? prev - 1 : groupSuggestions.length - 1,
        );
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && showGroupAutocomplete)) {
        e.preventDefault();
        selectGroup(groupSuggestions[groupAutocompleteIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowGroupAutocomplete(false);
        return;
      }
    }

    // User autocomplete keyboard handling
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

    if (e.key === 'Enter' && !showAutocomplete && !showGroupAutocomplete) {
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
      // Resolve group ID from #groupName
      const effectiveGroupId = parsed.groupName
        ? resolvedGroupRef.current.get(parsed.groupName) ||
          groups.find((g) => g.name === parsed.groupName)?.id ||
          taskGroupId
        : taskGroupId;

      const task = await createTask(
        currentWorkspace.id,
        parsed.title,
        undefined,
        priority ?? undefined,
        dueDate ?? undefined,
        effectiveGroupId,
        isVoteMode ? 'VOTE' : undefined,
        isVoteMode ? { mode: 'approve_reject', options: ['approve', 'reject', 'abstain'], allowChange: true, anonymous: false } : undefined,
      );

      if (parsed.chain.length > 0) {
        // Resolve display names to user IDs, handling special @group and @workspace
        const userIds: string[] = [];
        for (const name of parsed.chain) {
          if (name === 'group') {
            // Fetch current group members
            const groupId = effectiveGroupId || taskGroupId;
            if (groupId) {
              try {
                const { data } = await api.get(`/task-groups/${groupId}/members`);
                const memberIds = data
                  .map((m: any) => m.userId)
                  .filter((id: string) => id !== currentUser?.id);
                userIds.push(...memberIds);
              } catch {
                // silent — group members fetch failed
              }
            }
          } else if (name === 'workspace') {
            // Fetch workspace members
            try {
              const { data } = await api.get(`/workspaces/${currentWorkspace.id}/members`);
              const memberIds = data
                .map((m: any) => m.userId)
                .filter((id: string) => id !== currentUser?.id);
              userIds.push(...memberIds);
            } catch {
              // silent — workspace members fetch failed
            }
          } else {
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
        }

        // Deduplicate user IDs
        const uniqueUserIds = [...new Set(userIds)];

        if (uniqueUserIds.length > 1) {
          // Parallel connect for multiple users
          await connectMultiThread(task.id, uniqueUserIds);
        } else if (uniqueUserIds.length === 1) {
          await connectChain(task.id, uniqueUserIds);
        }
      } else if (parsed.blockerNote) {
        // No chain connections — create blocker
        await connectBlocker(task.id, parsed.blockerNote);
      }

      // Refresh the task list
      await silentRefetch(currentWorkspace.id, taskGroupId);
      setInput('');
      setPriority(null);
      setDueDate(null);
      setIsVoteMode(false);
      resolvedUsersRef.current.clear();
      resolvedGroupRef.current.clear();
      setTimeout(() => inputRef.current?.focus(), 0);
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
      // Trigger autocomplete detection for @ and # insertions
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

  // Render highlighted input text with styled @, #, and > characters
  const renderHighlightedInput = (text: string) => {
    if (!text) return null;
    // Split by special tokens: @mention, #group, and ' > '
    const parts: { text: string; type: 'normal' | 'at' | 'chain' | 'mention' | 'blocker' | 'group' | 'special' }[] = [];
    let i = 0;
    while (i < text.length) {
      // Check for ' > ' chain separator
      if (i + 2 < text.length && text.substring(i, i + 3) === ' > ') {
        parts.push({ text: ' > ', type: 'chain' });
        i += 3;
        continue;
      }
      // Check for #groupName
      if (text[i] === '#') {
        let end = i + 1;
        while (end < text.length && text[end] !== ' ' && text[end] !== '>') {
          end++;
        }
        const groupText = text.substring(i, end);
        const groupName = groupText.substring(1);
        const isResolved = resolvedGroupRef.current.has(groupName) ||
          groups.some((g) => g.name === groupName);
        parts.push({ text: groupText, type: isResolved ? 'group' : 'normal' });
        i = end;
        continue;
      }
      // Check for @mention
      if (text[i] === '@') {
        // Collect the full @username
        let end = i + 1;
        while (end < text.length && text[end] !== ' ' && text[end] !== '>') {
          end++;
        }
        const mentionText = text.substring(i, end);
        const username = mentionText.substring(1);
        // Check for special keywords
        if (username === 'group' || username === 'workspace') {
          parts.push({ text: mentionText, type: 'special' });
        } else {
          const isResolved = resolvedUsersRef.current.has(username);
          parts.push({ text: mentionText, type: isResolved ? 'at' : 'normal' });
        }
        i = end;
        continue;
      }
      // Normal text
      let end = i + 1;
      while (end < text.length && text[end] !== '@' && text[end] !== '#' && !(end + 2 < text.length && text.substring(end, end + 3) === ' > ')) {
        end++;
      }
      parts.push({ text: text.substring(i, end), type: 'normal' });
      i = end;
    }

    // Post-process: normal text after a chain separator without @ is a blocker
    for (let j = 0; j < parts.length; j++) {
      if (
        parts[j].type === 'normal' &&
        j > 0 &&
        parts[j - 1].type === 'chain' &&
        !parts[j].text.startsWith('@')
      ) {
        parts[j].type = 'blocker';
      }
    }

    return parts.map((part, idx) => {
      if (part.type === 'chain') {
        return (
          <span key={idx} className="font-medium">
            <span className="text-transparent">{' '}</span>
            <span className="text-amber-400/80">{'›'}</span>
            <span className="text-transparent">{' '}</span>
          </span>
        );
      }
      if (part.type === 'at') {
        return (
          <span key={idx} className="text-blue-400 font-medium">{part.text}</span>
        );
      }
      if (part.type === 'group') {
        return (
          <span key={idx} className="text-green-400 font-medium">{part.text}</span>
        );
      }
      if (part.type === 'special') {
        return (
          <span key={idx} className="text-purple-400 font-medium">{part.text}</span>
        );
      }
      if (part.type === 'blocker') {
        return (
          <span key={idx} className="text-red-400 font-medium">{part.text}</span>
        );
      }
      return <span key={idx} className="text-foreground">{part.text}</span>;
    });
  };

  if (!currentWorkspace) return null;

  return (
    <div className="relative px-8 pb-6 pt-4">
      {/* Group autocomplete dropdown — positioned above the input */}
      {showGroupAutocomplete && groupSuggestions.length > 0 && (
        <div className="absolute bottom-full left-8 right-8 mb-3 max-h-48 overflow-y-auto rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl">
          {groupSuggestions.map((group, index) => (
            <button
              key={group.id}
              onClick={() => selectGroup(group)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors',
                index === groupAutocompleteIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50',
              )}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-500/15">
                <Hash className="h-3.5 w-3.5 text-green-400" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-medium truncate">{group.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* User autocomplete dropdown — positioned above the input */}
      {showAutocomplete && autocompleteResults.length > 0 && (
        <div className="absolute bottom-full left-8 right-8 mb-3 max-h-48 overflow-y-auto rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl">
          {autocompleteResults.map((item, index) => {
            const isSpecial = 'special' in item;
            return (
              <button
                key={item.id}
                onClick={() => selectUser(item)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors',
                  index === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
              >
                {isSpecial ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/15">
                    <Users className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                ) : (
                  <Avatar className="h-6 w-6" size="sm">
                    <AvatarFallback className="text-[9px] bg-secondary">
                      {item.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="text-left min-w-0">
                  <p className={cn('font-medium truncate', isSpecial && 'text-purple-400')}>
                    @{item.name}
                  </p>
                  {!isSpecial && 'email' in item && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.email}
                    </p>
                  )}
                  {isSpecial && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.name === 'group'
                        ? t('assignToGroup')
                        : t('assignToWorkspace')}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Card-style input with toolbar */}
      <div className={cn(
        'rounded-xl',
        'bg-background/60 backdrop-blur-xl',
        'border border-white/[0.08]',
        'shadow-[0_-8px_30px_rgb(0,0,0,0.12)]',
        'transition-all duration-300',
        isFocused && 'bg-background/80 border-white/[0.15] shadow-[0_-8px_30px_rgb(0,0,0,0.2)]',
      )}>
        {/* Toolbar — always visible */}
        <div
          className="transition-all duration-200 ease-out"
          onMouseDown={handleToolbarMouseDown}
        >
            <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border/30">
              {/* Group hash button */}
              <button
                type="button"
                onClick={() => insertAtCursor('#')}
                title={t('groupHashHint')}
                className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <Hash className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </button>

              {/* @ Mention button */}
              <button
                type="button"
                onClick={() => insertAtCursor('@')}
                title="Mention (@)"
                className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <AtSign className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </button>

              {/* Chain button */}
              <button
                type="button"
                onClick={() => insertAtCursor(' > @')}
                title="Chain (>)"
                className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </button>

              {/* Blocker button */}
              <button
                type="button"
                onClick={() => insertAtCursor(' > ')}
                title="Blocker"
                className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <ShieldAlert className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
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
                    'flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-md transition-colors',
                    'cursor-pointer',
                    priority
                      ? `${selectedPriority?.color}`
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )}
                >
                  <Flag className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
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
                    'flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-md transition-colors',
                    'cursor-pointer',
                    dueDate
                      ? 'text-blue-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )}
                >
                  <CalendarDays className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={dueDate ?? ''}
                  onChange={(e) => {
                    setDueDate(e.target.value || null);
                    inputRef.current?.focus();
                  }}
                  className="absolute inset-0 opacity-0 w-7 h-7 lg:w-8 lg:h-8 cursor-pointer"
                  tabIndex={-1}
                />
              </div>

              {/* Vote button */}
              <button
                type="button"
                onClick={() => {
                  setIsVoteMode((prev) => !prev);
                  inputRef.current?.focus();
                }}
                title={t('voteTask')}
                className={cn(
                  'flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-md transition-colors',
                  'cursor-pointer',
                  isVoteMode
                    ? 'text-purple-400 bg-purple-400/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                )}
              >
                <Vote className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </button>
            </div>
        </div>

        {/* Badges row — shows selected priority/due date */}
        {(selectedPriority || dueDate || isVoteMode) && (
          <div className="flex items-center gap-1.5 px-4 pt-2">
            {isVoteMode && (
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-400">
                <Vote className="h-3 w-3" />
                {t('voteTask')}
                <button
                  type="button"
                  onClick={() => setIsVoteMode(false)}
                  onMouseDown={handleToolbarMouseDown}
                  className="ml-0.5 hover:opacity-70 cursor-pointer"
                >
                  x
                </button>
              </span>
            )}
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
                  className="ml-0.5 hover:opacity-70 cursor-pointer"
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
                  className="ml-0.5 hover:opacity-70 cursor-pointer"
                >
                  x
                </button>
              </span>
            )}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <div className="relative flex-1 h-8">
            {/* Highlight overlay */}
            <div
              aria-hidden
              className="absolute inset-0 flex items-center text-sm pointer-events-none whitespace-pre overflow-hidden"
            >
              <span className="text-transparent">{!input && t('quickInputPlaceholder')}</span>
              {renderHighlightedInput(input)}
            </div>
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
              className={cn(
                "relative h-8 w-full bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50",
                input ? "text-transparent caret-foreground" : "text-foreground",
              )}
            />
          </div>
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
