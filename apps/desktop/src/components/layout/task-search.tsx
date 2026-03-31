'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { Hash, CheckSquare, Circle, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { useTaskStore, type Task } from '@/stores/task-store';
import { useTaskGroupStore } from '@/stores/task-group-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { cn } from '@/lib/utils';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('taskSearch');

  const { actionRequired, waiting, completed, meetings } = useTaskStore();
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

  // 닫힐 때 쿼리 초기화
  const handleOpenChange = useCallback((value: boolean) => {
    setOpen(value);
    if (!value) setQuery('');
  }, []);

  // 모든 태스크 합치기
  const allTasks = useMemo(() => {
    const taskMap = new Map<string, Task>();
    for (const task of [...actionRequired, ...waiting, ...completed, ...meetings]) {
      taskMap.set(task.id, task);
    }
    return Array.from(taskMap.values());
  }, [actionRequired, waiting, completed, meetings]);

  // 쿼리 파싱: #그룹명 검색어
  const { groupFilter, searchTerm } = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.startsWith('#')) {
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx > 0) {
        return {
          groupFilter: trimmed.slice(1, spaceIdx),
          searchTerm: trimmed.slice(spaceIdx + 1).trim(),
        };
      }
      return { groupFilter: trimmed.slice(1), searchTerm: '' };
    }
    return { groupFilter: null, searchTerm: trimmed };
  }, [query]);

  // 그룹 자동완성 (#만 입력했을 때)
  const showGroupSuggestions = query.startsWith('#') && !query.includes(' ');
  const matchingGroups = useMemo(() => {
    if (!showGroupSuggestions) return [];
    const partial = (groupFilter || '').toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(partial));
  }, [showGroupSuggestions, groupFilter, groups]);

  // 태스크 필터링
  const filteredTasks = useMemo(() => {
    if (!query.trim()) return allTasks.slice(0, 20);

    let tasks = allTasks;

    // 그룹 필터
    if (groupFilter) {
      const matchedGroup = groups.find(
        (g) => g.name.toLowerCase() === groupFilter.toLowerCase(),
      );
      if (matchedGroup) {
        tasks = tasks.filter((t) => t.taskGroupId === matchedGroup.id);
      } else {
        tasks = tasks.filter((t) =>
          t.taskGroup?.name?.toLowerCase().includes(groupFilter.toLowerCase()),
        );
      }
    }

    // 텍스트 검색
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(lower));
    }

    return tasks.slice(0, 30);
  }, [allTasks, query, groupFilter, searchTerm, groups]);

  // 태스크 선택
  const handleSelect = useCallback(
    (task: Task) => {
      setOpen(false);
      setQuery('');

      // 그룹이 다르면 그룹 전환
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
  const handleGroupSelect = useCallback((groupName: string) => {
    setQuery(`#${groupName} `);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder={t('placeholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t('noResults')}</CommandEmpty>

        {/* 그룹 자동완성 */}
        {showGroupSuggestions && matchingGroups.length > 0 && (
          <CommandGroup heading={t('groups')}>
            {matchingGroups.map((group) => (
              <CommandItem
                key={group.id}
                value={`group-${group.name}`}
                onSelect={() => handleGroupSelect(group.name)}
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
              groupFilter
                ? `${t('inGroup', { group: groupFilter })}`
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
      </CommandList>
    </CommandDialog>
  );
}
