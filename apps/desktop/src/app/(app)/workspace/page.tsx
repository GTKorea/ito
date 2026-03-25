'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTaskStore } from '@/stores/task-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useTaskGroupStore } from '@/stores/task-group-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

import { TaskList } from '@/components/tasks/task-list';
import { CreateTask } from '@/components/tasks/create-task';
import { TaskDetail } from '@/components/tasks/task-detail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Building2, ArrowUpDown, ArrowLeft, Hash, ArrowRightLeft, Users, UserPlus, X, Settings, Archive, Trash2, Filter, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuickInput } from '@/components/tasks/quick-input';
import { MoveTasksDialog } from '@/components/tasks/move-tasks-dialog';
import { GroupMembersPopover } from '@/components/groups/group-members-popover';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function CreateWorkspacePrompt() {
  const { createWorkspace } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const t = useTranslations('workspace');
  const tc = useTranslations('common');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await createWorkspace(name, slug);
    setOpen(false);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
        <Building2 className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{t('noWorkspaceYet')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('createWorkspaceToStart')}
        </p>
      </div>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        {t('createWorkspace')}
      </Button>

      {open && (
        <Dialog open onOpenChange={() => setOpen(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('createWorkspace')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t('workspaceName')}</Label>
                <Input
                  placeholder={t('workspaceNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!name.trim()}>
                {tc('create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const { currentWorkspace, isLoading: wsLoading } = useWorkspaceStore();
  const { actionRequired, waiting, completed, isLoading, fetchCategorizedTasks } = useTaskStore();
  const { groups, deleteGroup, archiveGroup } = useTaskGroupStore();
  const { checkAndStartWizard } = useOnboardingStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [openWithChat, setOpenWithChat] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isResizingRef = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = startX - ev.clientX;
      setSidebarWidth(Math.max(360, Math.min(800, startWidth + delta)));
    };
    const onUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);
  const [sortBy, setSortByState] = useState<'priority' | 'dueDate' | 'custom'>('priority');

  useEffect(() => {
    if (currentWorkspace) {
      const saved = localStorage.getItem(`ito-sort-${currentWorkspace.id}`);
      if (saved && ['priority', 'dueDate', 'custom'].includes(saved)) {
        setSortByState(saved as 'priority' | 'dueDate' | 'custom');
      }
    }
  }, [currentWorkspace?.id]);

  const setSortBy = (value: 'priority' | 'dueDate' | 'custom') => {
    setSortByState(value);
    if (currentWorkspace) {
      localStorage.setItem(`ito-sort-${currentWorkspace.id}`, value);
    }
  };
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [groupFilter, setGroupFilter] = useState<Set<string>>(new Set());
  const isSelecting = selectedTaskIds.size > 0;

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const clearSelection = () => setSelectedTaskIds(new Set());
  const searchParams = useSearchParams();
  const t = useTranslations('workspace');
  const tc = useTranslations('common');
  const tt = useTranslations('tasks');
  const tg = useTranslations('groups');

  const groupId = searchParams.get('group');
  const currentGroup = groupId ? groups.find((g) => g.id === groupId) : null;

  useEffect(() => { clearSelection(); }, [groupId]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchCategorizedTasks(currentWorkspace.id, groupId || undefined);
    }
  }, [currentWorkspace, fetchCategorizedTasks, groupId]);

  // Trigger onboarding wizard on first workspace visit
  useEffect(() => {
    if (currentWorkspace) {
      checkAndStartWizard();
    }
  }, [currentWorkspace, checkAndStartWizard]);

  // Auto-select task from query param (e.g. from notification click)
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId) {
      setSelectedTaskId(taskId);
    }
  }, [searchParams]);

  const handleSelectTask = (id: string, openChat?: boolean) => {
    setSelectedTaskId(id);
    setDrawerVisible(true);
    setOpenWithChat(!!openChat);
  };

  const handleCloseTask = () => {
    setDrawerVisible(false);
    setOpenWithChat(false);
    // Wait for slide-out animation to finish before unmounting
    setTimeout(() => setSelectedTaskId(null), 200);
  };

  const sortFn = useMemo(() => {
    if (sortBy === 'custom') return null;
    if (sortBy === 'dueDate') {
      return (a: { dueDate?: string }, b: { dueDate?: string }) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      };
    }
    return (a: { priority: string; createdAt: string }, b: { priority: string; createdAt: string }) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };
  }, [sortBy]);

  const sortedActionRequired = useMemo(() => {
    if (!sortFn) return actionRequired;
    return [...actionRequired].sort(sortFn);
  }, [actionRequired, sortFn]);

  const sortedWaiting = useMemo(() => {
    if (!sortFn) return waiting;
    return [...waiting].sort(sortFn);
  }, [waiting, sortFn]);

  const sortedCompleted = useMemo(() => {
    if (!sortFn) return completed;
    return [...completed].sort(sortFn);
  }, [completed, sortFn]);

  const groupFilterFn = useCallback(
    (task: { taskGroup?: { id: string; name: string } | null }) => {
      if (groupFilter.size === 0) return true;
      if (!task.taskGroup) return groupFilter.has('none');
      return groupFilter.has(task.taskGroup.id);
    },
    [groupFilter],
  );

  const filteredActionRequired = useMemo(
    () => sortedActionRequired.filter(groupFilterFn),
    [sortedActionRequired, groupFilterFn],
  );
  const filteredWaiting = useMemo(
    () => sortedWaiting.filter(groupFilterFn),
    [sortedWaiting, groupFilterFn],
  );
  const filteredCompleted = useMemo(
    () => sortedCompleted.filter(groupFilterFn),
    [sortedCompleted, groupFilterFn],
  );

  const toggleGroupFilter = (id: string) => {
    setGroupFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllGroups = () => {
    if (groupFilter.size === 0) return;
    setGroupFilter(new Set());
  };

  if (wsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!currentWorkspace) {
    return <CreateWorkspacePrompt />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3">
        <div className="flex items-center gap-2">
          {currentGroup && (
            <Link
              href="/workspace"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div>
            <h1 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              {currentGroup ? (
                <>
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  {currentGroup.name}
                </>
              ) : (
                t('myTasks')
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentGroup
                ? `${currentGroup._count.tasks} ${tg('tasks').toLowerCase()}`
                : t('tasksAssignedToYou')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentGroup && (
            <>
              <GroupMembersPopover groupId={currentGroup.id} memberCount={currentGroup._count.members} />
              {!currentGroup.isPrivate && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />}>
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={async () => {
                        await archiveGroup(currentGroup.id);
                        window.location.href = `/workspace`;
                      }}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      {tg('archiveGroup')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-500 focus:text-red-500"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {tg('deleteGroup')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
          {!currentGroup && groups.length > 0 && (
            <Popover>
              <PopoverTrigger render={
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('h-8 text-xs text-muted-foreground relative', groupFilter.size > 0 && 'text-primary')}
                  title={tt('filterGroups')}
                />
              }>
                <Filter className="mr-1 h-3.5 w-3.5" />
                {tt('filterGroups')}
                {groupFilter.size > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <div className="space-y-1">
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                    onClick={toggleAllGroups}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded border border-border">
                      {groupFilter.size === 0 && <Check className="h-3 w-3 text-primary" />}
                    </span>
                    <span className="font-medium">{tt('allGroups')}</span>
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                    onClick={() => toggleGroupFilter('none')}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded border border-border">
                      {groupFilter.has('none') && <Check className="h-3 w-3 text-primary" />}
                    </span>
                    <span className="text-muted-foreground">{tt('noGroup')}</span>
                  </button>
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                      onClick={() => toggleGroupFilter(g.id)}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded border border-border">
                        {groupFilter.has(g.id) && <Check className="h-3 w-3 text-primary" />}
                      </span>
                      <Hash className="h-3 w-3 text-green-400" />
                      <span className="truncate">{g.name}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setSortBy(sortBy === 'priority' ? 'dueDate' : sortBy === 'dueDate' ? 'custom' : 'priority')}
          >
            <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
            {sortBy === 'priority' ? tt('sortByPriority') : sortBy === 'dueDate' ? tt('sortByDueDate') : tt('sortByCustom')}
          </Button>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
            <span className="text-xs">&#8984;</span>K
          </kbd>
          <Button size="sm" onClick={() => setShowCreate(true)} data-onboarding="new-task">
            <Plus className="mr-1 h-4 w-4" />
            {t('newTask')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-2">
        {showCreate && (
          <CreateTask
            workspaceId={currentWorkspace.id}
            taskGroupId={groupId || undefined}
            onClose={() => setShowCreate(false)}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <TaskList
            actionRequired={filteredActionRequired}
            waiting={filteredWaiting}
            completed={filteredCompleted}
            onSelectTask={handleSelectTask}
            sortBy={sortBy}
            workspaceId={currentWorkspace.id}
            isSelecting={isSelecting}
            selectedTaskIds={selectedTaskIds}
            onToggleSelect={toggleTaskSelection}
            currentGroupId={groupId || undefined}
          />
        )}

        {/* Quick Input + Selection Bar — sticky bottom */}
        <div className="sticky bottom-0 z-10">
          {isSelecting && (
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm px-4 py-2">
                <span className="text-sm font-medium">{tt('selectedCount', { count: selectedTaskIds.size })}</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowMoveDialog(true)}>
                    <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
                    {tt('moveTo')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    {tt('clearSelection')}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="px-4 md:px-6 pb-3">
            <QuickInput taskGroupId={groupId || undefined} />
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {selectedTaskId && (
        <div
          className={cn(
            'fixed inset-0 z-40 transition-opacity duration-200',
            drawerVisible ? 'bg-black/30 opacity-100' : 'opacity-0 pointer-events-none',
          )}
          onClick={handleCloseTask}
        />
      )}

      {/* Task Detail Slide-over */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full transition-transform duration-200 ease-out',
          drawerVisible ? 'translate-x-0' : 'translate-x-full',
          !selectedTaskId && 'pointer-events-none',
        )}
        style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${sidebarWidth}px` : undefined }}
      >
        {/* Resize handle — left edge (lg+ only) */}
        <div
          className="hidden lg:flex absolute left-0 top-0 h-full w-1.5 cursor-col-resize items-center justify-center z-10 hover:bg-primary/20 transition-colors group"
          onMouseDown={handleResizeStart}
        >
          <div className="h-8 w-0.5 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
        </div>
        {selectedTaskId && (
          <TaskDetail
            taskId={selectedTaskId}
            onClose={handleCloseTask}
            initialShowChat={openWithChat}
          />
        )}
      </div>

      {/* Move Tasks Dialog */}
      {showMoveDialog && (
        <MoveTasksDialog
          open={showMoveDialog}
          onClose={() => { setShowMoveDialog(false); clearSelection(); }}
          selectedTaskIds={Array.from(selectedTaskIds)}
          currentWorkspaceId={currentWorkspace.id}
          currentGroupId={groupId || undefined}
        />
      )}

      {/* Delete Group Confirmation */}
      {showDeleteConfirm && currentGroup && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tg('deleteGroup')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {tg('deleteConfirm')}
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                {tc('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await deleteGroup(currentGroup.id);
                  setShowDeleteConfirm(false);
                  window.location.href = `/workspace`;
                }}
              >
                {tg('deleteGroup')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Onboarding Wizard */}
      <OnboardingWizard />


    </div>
  );
}
