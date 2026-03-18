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
} from 'lucide-react';
import { TeamCard } from '@/components/teams/team-card';
import { TeamDashboard } from '@/components/teams/team-dashboard';

interface TeamMember {
  id: string;
  role: string;
  user: { id: string; name: string; email: string; avatarUrl?: string };
}

interface Team {
  id: string;
  name: string;
  _count?: { members: number; todos: number };
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
    if (!currentWorkspace) return;
    await api.delete(`/workspaces/${currentWorkspace.id}/teams/${teamId}`);
    if (expandedTeam === teamId) setExpandedTeam(null);
    fetchTeams();
  };

  const handleToggleExpand = (teamId: string) => {
    setExpandedTeam((prev) => (prev === teamId ? null : teamId));
  };

  const handleAddMember = async () => {
    if (!addMemberEmail.trim() || !addMemberTeamId || !currentWorkspace) return;
    try {
      const { data: users } = await api.get('/users/search', {
        params: { email: addMemberEmail, workspaceId: currentWorkspace.id },
      });
      if (users.length > 0) {
        await api.post(
          `/workspaces/${currentWorkspace.id}/teams/${addMemberTeamId}/members`,
          { userId: users[0].id },
        );
        setAddMemberEmail('');
        setAddMemberTeamId(null);
        fetchTeams();
      }
    } catch {
      // handle
    }
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Teams</h1>
          <p className="text-xs text-muted-foreground">
            Manage your workspace teams and track workload
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Team
        </Button>
      </div>

      <div className="p-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">No teams yet</p>
            <p className="text-xs mt-1">
              Create teams to organize your workspace members
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setShowCreate(true)}
            >
              Create your first team
            </Button>
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center">
                <div className="flex-1">
                  <TeamCard
                    team={team}
                    isExpanded={expandedTeam === team.id}
                    onClick={() => handleToggleExpand(team.id)}
                  />
                </div>
                <div className="pr-2">
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
              </div>

              {/* Expanded: Show team dashboard */}
              {expandedTeam === team.id && currentWorkspace && (
                <div className="border-t border-border">
                  <TeamDashboard
                    teamId={team.id}
                    workspaceId={currentWorkspace.id}
                  />
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
