'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useTaskGroupStore } from '@/stores/task-group-store';
import { api } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Hash, X, Users, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface CreateGroupDialogProps {
  workspaceId?: string;
  sharedSpaceId?: string;
  onClose: () => void;
}

export function CreateGroupDialog({ workspaceId, sharedSpaceId, onClose }: CreateGroupDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();
  const { createGroup, createSharedSpaceGroup, addMember } = useTaskGroupStore();
  const t = useTranslations('groups');
  const tc = useTranslations('common');

  // Load workspace members on mount
  useEffect(() => {
    if (!currentWorkspace) return;
    const loadMembers = async () => {
      try {
        const { data } = await api.get('/users/search', {
          params: { workspaceId: currentWorkspace.id },
        });
        setMembers(data);
      } catch {
        setMembers([]);
      }
    };
    loadMembers();
  }, [currentWorkspace]);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (!currentWorkspace) return;
    try {
      const { data } = await api.get('/users/search', {
        params: {
          workspaceId: currentWorkspace.id,
          ...(query.length > 0 ? { query } : {}),
        },
      });
      setMembers(data);
    } catch {
      setMembers([]);
    }
  };

  const toggleUser = (user: User) => {
    setSelected((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) return prev.filter((u) => u.id !== user.id);
      return [...prev, user];
    });
  };

  const removeUser = (userId: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      let group;
      if (sharedSpaceId) {
        group = await createSharedSpaceGroup(sharedSpaceId, name.trim(), description.trim() || undefined);
      } else if (workspaceId) {
        group = await createGroup(workspaceId, name.trim(), description.trim() || undefined);
      } else {
        return;
      }

      // Add selected members
      for (const user of selected) {
        try {
          await addMember(group.id, user.id);
        } catch {
          // Skip if member add fails (e.g. already a member)
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredMembers = members.filter(
    (m) => !selected.find((s) => s.id === m.id),
  );

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            {t('createGroup')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group name */}
          <div className="space-y-1.5">
            <Label>{t('groupName')}</Label>
            <Input
              placeholder={t('groupName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t('groupDescription')}</Label>
            <Textarea
              placeholder={t('groupDescription')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Members section */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t('inviteMembers')}
            </Label>

            {/* Selected members as chips */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="flex items-center gap-1 pl-1 pr-1 py-1"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[7px] bg-secondary">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{user.name}</span>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="ml-0.5 rounded-sm hover:bg-accent p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Search */}
            <Input
              placeholder={t('searchMembers')}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />

            {/* Member list */}
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-border p-1">
              {filteredMembers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px] bg-secondary">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </button>
              ))}
              {filteredMembers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  {t('noMembersFound')}
                </p>
              )}
            </div>
          </div>

          {/* Create button */}
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('creating')}
              </>
            ) : (
              t('createGroup')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
