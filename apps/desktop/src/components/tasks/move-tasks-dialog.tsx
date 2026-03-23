'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTaskStore } from '@/stores/task-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useTaskGroupStore } from '@/stores/task-group-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, Hash, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MoveTasksDialogProps {
  open: boolean;
  onClose: () => void;
  selectedTaskIds: string[];
  currentWorkspaceId: string;
  currentGroupId?: string;
}

type Tab = 'workspace' | 'group';

interface CheckResult {
  movable: Array<{ id: string; title: string }>;
  blocked: Array<{ task: { id: string; title: string }; reason: string }>;
}

export function MoveTasksDialog({
  open,
  onClose,
  selectedTaskIds,
  currentWorkspaceId,
  currentGroupId,
}: MoveTasksDialogProps) {
  const t = useTranslations('tasks');
  const [tab, setTab] = useState<Tab>('workspace');
  const [isChecking, setIsChecking] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);

  const { workspaces } = useWorkspaceStore();
  const { groups } = useTaskGroupStore();
  const { batchMoveCheck, batchMoveExecute } = useTaskStore();

  const handleSelectTarget = async (wsId?: string, grpId?: string | null) => {
    setTargetWorkspaceId(wsId || null);
    setTargetGroupId(grpId !== undefined ? grpId : null);
    setIsChecking(true);
    try {
      const result = await batchMoveCheck(
        selectedTaskIds,
        wsId,
        grpId !== undefined ? (grpId || undefined) : undefined,
      );
      setCheckResult(result);
    } catch {
      toast.error(t('moveError'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirmMove = async () => {
    if (!checkResult || checkResult.movable.length === 0) return;
    setIsMoving(true);
    try {
      const movableIds = checkResult.movable.map((t) => t.id);
      await batchMoveExecute(
        movableIds,
        targetWorkspaceId || undefined,
        targetGroupId !== null ? (targetGroupId || undefined) : undefined,
      );
      toast.success(t('moveSuccess', { count: movableIds.length }));
      onClose();
    } catch {
      toast.error(t('moveError'));
    } finally {
      setIsMoving(false);
    }
  };

  const reasonLabel = (reason: string) => {
    if (reason === 'ACTIVE_CHAIN') return t('cannotMoveActiveChain');
    if (reason === 'ASSIGNEE_NOT_MEMBER') return t('assigneeNotMember');
    return reason;
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('moveDialogTitle')}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border pb-2">
          <button
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              tab === 'workspace' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => { setTab('workspace'); setCheckResult(null); }}
          >
            <Building2 className="inline h-3 w-3 mr-1" />
            {t('moveToWorkspace')}
          </button>
          <button
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              tab === 'group' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => { setTab('group'); setCheckResult(null); }}
          >
            <Hash className="inline h-3 w-3 mr-1" />
            {t('moveToGroup')}
          </button>
        </div>

        {/* Check result / confirm view */}
        {checkResult ? (
          <div className="space-y-3">
            {checkResult.movable.length > 0 && (
              <div>
                <p className="text-xs font-medium text-green-500 mb-1">
                  <Check className="inline h-3 w-3 mr-1" />
                  {t('movableCount', { count: checkResult.movable.length })}
                </p>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {checkResult.movable.map((task) => (
                    <p key={task.id} className="text-xs text-muted-foreground truncate pl-4">{task.title}</p>
                  ))}
                </div>
              </div>
            )}
            {checkResult.blocked.length > 0 && (
              <div>
                <p className="text-xs font-medium text-yellow-500 mb-1">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  {t('blockedCount', { count: checkResult.blocked.length })}
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {checkResult.blocked.map(({ task, reason }) => (
                    <div key={task.id} className="pl-4">
                      <p className="text-xs text-muted-foreground truncate">{task.title}</p>
                      <p className="text-[10px] text-yellow-500">{reasonLabel(reason)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setCheckResult(null)}>
                {t('back')}
              </Button>
              <Button
                size="sm"
                disabled={checkResult.movable.length === 0 || isMoving}
                onClick={handleConfirmMove}
              >
                {isMoving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                {t('confirmMove', { count: checkResult.movable.length })}
              </Button>
            </div>
          </div>
        ) : (
          /* Target selection list */
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {isChecking && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isChecking && tab === 'workspace' && workspaces.map((ws) => (
              <button
                key={ws.id}
                disabled={ws.id === currentWorkspaceId}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  ws.id === currentWorkspaceId
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-accent/50 cursor-pointer',
                )}
                onClick={() => handleSelectTarget(ws.id)}
              >
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{ws.name}</span>
                {ws.id === currentWorkspaceId && (
                  <span className="text-[10px] text-muted-foreground ml-auto">current</span>
                )}
              </button>
            ))}
            {!isChecking && tab === 'group' && (
              <>
                <button
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    !currentGroupId ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent/50 cursor-pointer',
                  )}
                  disabled={!currentGroupId}
                  onClick={() => handleSelectTarget(undefined, null)}
                >
                  <span className="text-muted-foreground text-xs">{t('noGroup')}</span>
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    disabled={g.id === currentGroupId}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      g.id === currentGroupId
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-accent/50 cursor-pointer',
                    )}
                    onClick={() => handleSelectTarget(undefined, g.id)}
                  >
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{g.name}</span>
                    {g.id === currentGroupId && (
                      <span className="text-[10px] text-muted-foreground ml-auto">current</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
