'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Hash, CheckSquare, Circle, Loader2, AlertTriangle, X } from 'lucide-react';
import { useTaskGroupStore } from '@/stores/task-group-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface SearchTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  taskGroupId?: string;
  taskGroup?: { id: string; name: string } | null;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  OPEN: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  IN_PROGRESS: <Loader2 className="h-3.5 w-3.5 text-blue-400" />,
  BLOCKED: <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />,
  COMPLETED: <CheckSquare className="h-3.5 w-3.5 text-green-400" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-muted-foreground',
};

export function TaskSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeGroupFilter, setActiveGroupFilter] = useState<{ id: string; name: string } | null>(null);
  const [allTasks, setAllTasks] = useState<SearchTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('taskSearch');
  const fetchedRef = useRef(false);

  const { groups } = useTaskGroupStore();
  const { currentWorkspace } = useWorkspaceStore();

  // Cmd+F / Ctrl+F 단축키
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // 열릴 때: 전체 태스크 로드 + 현재 그룹 기본 필터
  useEffect(() => {
    if (!open) return;

    // 현재 그룹 기본 필터 적용
    const currentGroupId = searchParams.get('group');
    if (currentGroupId) {
      const group = groups.find((g) => g.id === currentGroupId);
      if (group) {
        setActiveGroupFilter({ id: group.id, name: group.name });
      }
    } else {
      setActiveGroupFilter(null);
    }

    // 전체 태스크 로드 (그룹 무관)
    if (!currentWorkspace?.id || fetchedRef.current) return;
    setIsLoadingTasks(true);
    api
      .get(`/workspaces/${currentWorkspace.id}/tasks/categorized`)
      .then(({ data }) => {
        const tasks: SearchTask[] = [
          ...(data.actionRequired || []),
          ...(data.waiting || []),
          ...(data.completed || []),
          ...(data.meetings || []),
        ];
        // 중복 제거
        const map = new Map<string, SearchTask>();
        for (const task of tasks) {
          map.set(task.id, task);
        }
        setAllTasks(Array.from(map.values()));
        fetchedRef.current = true;
      })
      .catch(() => {})
      .finally(() => setIsLoadingTasks(false));
  }, [open, currentWorkspace?.id, searchParams, groups]);

  // 닫힐 때 초기화
  const handleOpenChange = useCallback((value: boolean) => {
    setOpen(value);
    if (!value) {
      setQuery('');
      setActiveGroupFilter(null);
      fetchedRef.current = false;
    }
  }, []);

  // 쿼리에서 #그룹 파싱
  const { parsedGroupName, searchTerm } = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.startsWith('#')) {
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx > 0) {
        return {
          parsedGroupName: trimmed.slice(1, spaceIdx),
          searchTerm: trimmed.slice(spaceIdx + 1).trim(),
        };
      }
      return { parsedGroupName: trimmed.slice(1), searchTerm: '' };
    }
    return { parsedGroupName: null, searchTerm: trimmed };
  }, [query]);

  // 그룹 자동완성 (#만 입력했을 때)
  const showGroupSuggestions = query.startsWith('#') && !query.includes(' ');
  const matchingGroups = useMemo(() => {
    if (!showGroupSuggestions) return [];
    const partial = (parsedGroupName || '').toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(partial));
  }, [showGroupSuggestions, parsedGroupName, groups]);

  // 실제 적용될 그룹 필터 (activeGroupFilter 또는 쿼리의 #그룹)
  const effectiveGroupFilter = useMemo(() => {
    if (parsedGroupName) {
      const matched = groups.find(
        (g) => g.name.toLowerCase() === parsedGroupName.toLowerCase(),
      );
      return matched ? { id: matched.id, name: matched.name } : null;
    }
    return activeGroupFilter;
  }, [parsedGroupName, activeGroupFilter, groups]);

  // 태스크 필터링
  const filteredTasks = useMemo(() => {
    let tasks = allTasks;

    // 그룹 필터
    if (effectiveGroupFilter) {
      tasks = tasks.filter((t) => t.taskGroupId === effectiveGroupFilter.id);
    }

    // 텍스트 검색
    const term = parsedGroupName ? searchTerm : query.trim();
    if (term) {
      const lower = term.toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(lower));
    }

    return tasks.slice(0, 30);
  }, [allTasks, query, effectiveGroupFilter, parsedGroupName, searchTerm]);

  // 태스크 선택
  const handleSelect = useCallback(
    (task: SearchTask) => {
      setOpen(false);
      setQuery('');
      setActiveGroupFilter(null);
      fetchedRef.current = false;

      const currentGroup = searchParams.get('group');
      if (task.taskGroupId && task.taskGroupId !== currentGroup) {
        router.push(`/workspace?group=${task.taskGroupId}&task=${task.id}`);
      } else {
        router.push(`/workspace?task=${task.id}`);
      }
    },
    [router, searchParams],
  );

  // 그룹 선택 (자동완성에서)
  const handleGroupSelect = useCallback((group: { id: string; name: string }) => {
    setActiveGroupFilter(group);
    setQuery('');
  }, []);

  // 그룹 필터 제거
  const handleRemoveGroupFilter = useCallback(() => {
    setActiveGroupFilter(null);
    setQuery('');
  }, []);

  // Backspace로 그룹 필터 제거
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && query === '' && activeGroupFilter) {
        e.preventDefault();
        handleRemoveGroupFilter();
      }
    },
    [query, activeGroupFilter, handleRemoveGroupFilter],
  );

  const filterLabel = effectiveGroupFilter?.name;

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      {activeGroupFilter && !parsedGroupName && (
        <div className="flex items-center gap-1 px-3 pt-2">
          <button
            onClick={handleRemoveGroupFilter}
            className="flex shrink-0 items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs text-foreground hover:bg-accent/80"
          >
            <Hash className="h-3 w-3" />
            {activeGroupFilter.name}
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}
      <CommandInput
        placeholder={activeGroupFilter ? t('searchInGroup') : t('placeholder')}
        value={query}
        onValueChange={setQuery}
        onKeyDown={handleKeyDown}
      />
      <CommandList>
        {isLoadingTasks ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <CommandEmpty>{t('noResults')}</CommandEmpty>

            {/* 그룹 자동완성 */}
            {showGroupSuggestions && matchingGroups.length > 0 && (
              <CommandGroup heading={t('groups')}>
                {matchingGroups.map((group) => (
                  <CommandItem
                    key={group.id}
                    value={`group-${group.name}`}
                    onSelect={() => handleGroupSelect({ id: group.id, name: group.name })}
                  >
                    <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{group.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {group._count.tasks}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* 태스크 검색 결과 */}
            {!showGroupSuggestions && (
              <CommandGroup
                heading={
                  filterLabel
                    ? t('inGroup', { group: filterLabel })
                    : t('allTasks')
                }
              >
                {filteredTasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={`task-${task.title}-${task.id}`}
                    onSelect={() => handleSelect(task)}
                  >
                    <div className="mr-2 shrink-0">
                      {STATUS_ICONS[task.status] || STATUS_ICONS.OPEN}
                    </div>
                    <span className="truncate">{task.title}</span>
                    {task.taskGroup && (
                      <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        {task.taskGroup.name}
                      </span>
                    )}
                    {!task.taskGroup && task.priority && (
                      <span
                        className={cn(
                          'ml-auto text-xs',
                          PRIORITY_COLORS[task.priority] || 'text-muted-foreground',
                        )}
                      >
                        {task.priority === 'URGENT' ? '!!!' : task.priority === 'HIGH' ? '!!' : ''}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
