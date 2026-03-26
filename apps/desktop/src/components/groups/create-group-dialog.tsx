'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useTaskGroupStore } from '@/stores/task-group-store';
import { useWorkspaceMembers } from '@/hooks/use-workspace-members';
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
import { Hash, X, Users, Loader2, Lock, Globe, UsersRound, Check } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface Team {
  id: string;
  name: string;
  members: Array<{ user: { id: string; name: string; avatarUrl?: string } }>;
  _count: { members: number };
}

interface CreateGroupDialogProps {
  workspaceId?: string;
  sharedSpaceId?: string;
  onClose: () => void;
}

export function CreateGroupDialog({ workspaceId, sharedSpaceId, onClose }: CreateGroupDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selected, setSelected] = useState<User[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();
  const { createGroup, createSharedSpaceGroup, addMember, inviteTeam } = useTaskGroupStore();
  const t = useTranslations('groups');

  const selectedIds = useMemo(() => new Set(selected.map((u) => u.id)), [selected]);
  const { members, search, setSearch } = useWorkspaceMembers({ excludeIds: selectedIds });

  // Fetch teams
  useEffect(() => {
    if (!currentWorkspace) return;
    api.get(`/workspaces/${currentWorkspace.id}/teams`)
      .then(({ data }) => setTeams(data))
      .catch(() => {});
  }, [currentWorkspace]);

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

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      let group;
      if (sharedSpaceId) {
        group = await createSharedSpaceGroup(sharedSpaceId, name.trim(), description.trim() || undefined);
      } else if (workspaceId) {
        group = await createGroup(workspaceId, name.trim(), description.trim() || undefined, isPrivate);
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

      // Invite selected teams
      for (const teamId of selectedTeamIds) {
        try {
          await inviteTeam(group.id, teamId);
        } catch {
          // Skip if team invite fails
        }
      }

      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 409) {
        toast.error(t('nameAlreadyExists'));
      } else {
        toast.error(t('createFailed'));
      }
    } finally {
      setIsCreating(false);
    }
  };

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
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label>{t('groupDescription')}</Label>
            <Textarea
              placeholder={t('groupDescription')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div className="flex items-center gap-2">
              {isPrivate ? (
                <Lock className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Globe className="h-3.5 w-3.5 text-green-500" />
              )}
              <span className="text-sm font-medium">
                {isPrivate ? t('privateGroup') : t('publicGroup')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className="text-xs text-primary hover:underline"
            >
              {isPrivate ? t('makePublic') : t('makePrivate')}
            </button>
          </div>

          {/* Team invite section */}
          {teams.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UsersRound className="h-3.5 w-3.5" />
                {t('inviteTeam')}
              </Label>
              <div className="space-y-1 rounded-md border border-border p-1">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => toggleTeam(team.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded border border-border shrink-0">
                      {selectedTeamIds.has(team.id) && <Check className="h-3 w-3 text-primary" />}
                    </span>
                    <UsersRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{team.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{team._count.members}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Members section */}
          <div className="space-y-2">
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
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Member list */}
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-border p-1">
              {members.map((user) => (
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
              {members.length === 0 && (
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
