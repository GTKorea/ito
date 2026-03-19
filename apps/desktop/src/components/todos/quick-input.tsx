'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTodoStore } from '@/stores/todo-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { api } from '@/lib/api-client';
import { parseQuickInput } from '@/lib/quick-input-parser';
import { Send, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserResult {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export function QuickInput() {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<UserResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);

  // Map of display name -> user ID for resolved mentions
  const resolvedUsersRef = useRef<Map<string, string>>(new Map());

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { createTodo, connectChain, fetchTodos } = useTodoStore();
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
      const todo = await createTodo(currentWorkspace.id, parsed.title);

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
          await connectChain(todo.id, userIds);
        }
      }

      // Refresh the todo list
      await fetchTodos(currentWorkspace.id);
      setInput('');
      resolvedUsersRef.current.clear();
    } catch {
      // Error handled silently — could add toast notification here
    } finally {
      setIsSubmitting(false);
    }
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

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!currentWorkspace) return null;

  return (
    <div className="relative px-8 pb-6 pt-4">
      {/* Autocomplete dropdown — positioned above the input */}
      {showAutocomplete && autocompleteResults.length > 0 && (
        <div className="absolute bottom-full left-8 right-8 mb-3 max-h-48 overflow-y-auto rounded-2xl border border-lime-400/10 bg-card/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(160,220,0,0.04)]">
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

      {/* Floating neon input */}
      <div className={cn(
        'flex items-center gap-2 rounded-[20px] px-5 py-2.5',
        'bg-card/60 backdrop-blur-md',
        'border border-lime-400/8',
        'shadow-[0_4px_20px_rgba(0,0,0,0.25)]',
        'transition-all duration-300',
        'focus-within:border-lime-400/20',
        'focus-within:shadow-[0_4px_20px_rgba(160,220,0,0.06),0_8px_32px_rgba(0,0,0,0.25)]',
      )}>
        <input
          ref={inputRef}
          data-quick-input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="새 태스크... ( > @유저 로 바로 연결)"
          disabled={isSubmitting}
          className="h-8 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isSubmitting}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            'bg-lime-500/80 text-white',
            'transition-all duration-200',
            'hover:bg-lime-400/90 hover:scale-105 hover:shadow-[0_0_8px_rgba(160,220,0,0.25)]',
            'disabled:opacity-20 disabled:hover:scale-100 disabled:hover:shadow-none disabled:cursor-not-allowed',
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
  );
}
