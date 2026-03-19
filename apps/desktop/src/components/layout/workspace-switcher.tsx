'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronsUpDown, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace } =
    useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const t = useTranslations('sidebar');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const slug = newName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    await createWorkspace(newName, slug);
    setNewName('');
    setCreating(false);
    setOpen(false);
  };

  const handleSelect = (ws: (typeof workspaces)[0]) => {
    setCurrentWorkspace(ws);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button className="flex h-12 w-full items-center gap-2 border-b border-border px-4 hover:bg-accent/50 transition-colors" />
        }
      >
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground shrink-0">
          糸
        </div>
        <span className="text-sm font-semibold truncate flex-1 text-left">
          {currentWorkspace?.name || 'ito'}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" sideOffset={0} className="w-56 p-1.5">
        <div className="space-y-0.5">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSelect(ws)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                ws.id === currentWorkspace?.id
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50 text-foreground',
              )}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[9px] font-bold text-primary shrink-0">
                {ws.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate flex-1 text-left">{ws.name}</span>
              {ws.id === currentWorkspace?.id && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>

        <Separator className="my-1.5" />

        {creating ? (
          <div className="px-1 pb-1 space-y-1.5">
            <Input
              placeholder={t('workspaceName')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setCreating(false);
                  setNewName('');
                }
              }}
              autoFocus
              className="h-7 text-xs"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                className="h-6 text-xs flex-1"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                {t('create')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => {
                  setCreating(false);
                  setNewName('');
                }}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('createWorkspace')}
          </button>
        )}

        <Link
          href="/workspace-settings"
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          {t('workspaceSettings')}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
