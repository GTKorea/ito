'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Plus,
  MoreHorizontal,
  Trash2,
  UserPlus,
  ChevronRight,
} from 'lucide-react';

interface TeamMember {
  id: string;
  role: string;
  user: { id: string; name: string; email: string; avatarUrl?: string };
}

interface Team {
  id: string;
  name: string;
  _count?: { members: number };
  members?: TeamMember[];
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspaceStore();

  const fetchTeams = async () => {
    if (!currentWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${currentWorkspace.id}/teams`);
      setTeams(data);
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      fetchTeams();
    } else {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  const handleCreate = async () => {
    if (!newTeamName.trim() || !currentWorkspace) return;
    await api.post(`/workspaces/${currentWorkspace.id}/teams`, { name: newTeamName });
    setNewTeamName('');
    setShowCreate(false);
    fetchTeams();
  };

  const handleDelete = async (teamId: string) => {
    await api.delete(`/teams/${teamId}`);
    fetchTeams();
  };

  const handleExpand = async (teamId: string) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null);
      return;
    }
    try {
      const { data } = await api.get(`/teams/${teamId}`);
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, members: data.members } : t)),
      );
      setExpandedTeam(teamId);
    } catch {
      // handle
    }
  };

  const handleAddMember = async () => {
    if (!addMemberEmail.trim() || !addMemberTeamId || !currentWorkspace) return;
    try {
      const { data: users } = await api.get('/users/search', {
        params: { email: addMemberEmail, workspaceId: currentWorkspace.id },
      });
      if (users.length > 0) {
        await api.post(`/teams/${addMemberTeamId}/members`, { userId: users[0].id });
        setAddMemberEmail('');
        setAddMemberTeamId(null);
        handleExpand(addMemberTeamId);
      }
    } catch {
      // handle
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    await api.delete(`/teams/${teamId}/members/${userId}`);
    handleExpand(teamId);
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Teams</h1>
          <p className="text-xs text-muted-foreground">
            Manage your workspace teams
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Team
        </Button>
      </div>

      <div className="p-6 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">No teams yet</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowCreate(true)}
            >
              Create your first team
            </Button>
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-border bg-card">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => handleExpand(team.id)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {team._count?.members || 0} members
                  </p>
                </div>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedTeam === team.id ? 'rotate-90' : ''
                  }`}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setAddMemberTeamId(team.id)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Member
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(team.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Expanded members */}
              {expandedTeam === team.id && team.members && (
                <div className="border-t border-border px-3 py-2 space-y-1">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/30 group"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[9px] bg-secondary">
                          {member.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{member.user.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {member.user.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {member.role}
                      </Badge>
                      {member.role !== 'LEAD' && (
                        <button
                          onClick={() => handleRemoveMember(team.id, member.user.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Team Dialog */}
      {showCreate && (
        <Dialog open onOpenChange={() => setShowCreate(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <Button onClick={handleCreate} className="w-full" disabled={!newTeamName.trim()}>
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Member Dialog */}
      {addMemberTeamId && (
        <Dialog open onOpenChange={() => setAddMemberTeamId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Search by email..."
                value={addMemberEmail}
                onChange={(e) => setAddMemberEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                autoFocus
              />
              <Button onClick={handleAddMember} className="w-full" disabled={!addMemberEmail.trim()}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
