'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Users, UserPlus, X, Search } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { useTaskGroupStore } from '@/stores/task-group-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { toast } from 'sonner';

interface Member {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

interface GroupMembersPopoverProps {
  groupId: string;
  memberCount: number;
}

export function GroupMembersPopover({ groupId, memberCount }: GroupMembersPopoverProps) {
  const t = useTranslations('groups');
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; avatarUrl?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { addMember, removeMember } = useTaskGroupStore();
  const { currentWorkspace } = useWorkspaceStore();

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/task-groups/${groupId}/members`);
      setMembers(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !currentWorkspace) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}&workspaceId=${currentWorkspace.id}`);
      const memberUserIds = new Set(members.map((m) => m.user.id));
      setSearchResults(data.filter((u: { id: string }) => !memberUserIds.has(u.id)));
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await addMember(groupId, userId);
      setSearchQuery('');
      setSearchResults([]);
      setShowAddMember(false);
      await fetchMembers();
      toast.success(t('addMember'));
    } catch {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember(groupId, userId);
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    } catch {
      toast.error('Failed to remove member');
    }
  };

  return (
    <Popover onOpenChange={(open) => { if (open) fetchMembers(); }}>
      <PopoverTrigger
        render={
          <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors" />
        }
      >
        <Users className="h-3.5 w-3.5" />
        <span>{memberCount}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">{t('members')}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowAddMember(!showAddMember)}
          >
            <UserPlus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Add member search */}
        {showAddMember && (
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder={t('searchMembers')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-7 pl-7 text-xs"
                autoFocus
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAddMember(user.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px] bg-secondary">
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && !isSearching && (
              <p className="text-xs text-muted-foreground px-2 py-1.5">{t('noMembersFound')}</p>
            )}
          </div>
        )}

        {/* Member list */}
        <div className="max-h-48 overflow-y-auto custom-scrollbar p-1.5">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t('noMembersFound')}</p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 group"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px] bg-secondary">
                    {member.user.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{member.user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{member.user.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.user.id)}
                  className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
