'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface UseWorkspaceMembersOptions {
  /** User IDs to exclude from results (e.g., already-selected users) */
  excludeIds?: Set<string>;
}

export function useWorkspaceMembers(options?: UseWorkspaceMembersOptions) {
  const [members, setMembers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();

  const fetchMembers = useCallback(
    async (query?: string) => {
      if (!currentWorkspace) return;
      setIsLoading(true);
      try {
        const { data } = await api.get('/users/search', {
          params: {
            workspaceId: currentWorkspace.id,
            ...(query && query.length > 0 ? { query } : {}),
          },
        });
        setMembers(data);
      } catch {
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentWorkspace],
  );

  // Load members on mount
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearch(query);
      fetchMembers(query);
    },
    [fetchMembers],
  );

  const filteredMembers = options?.excludeIds
    ? members.filter((m) => !options.excludeIds!.has(m.id))
    : members;

  return {
    members: filteredMembers,
    allMembers: members,
    search,
    setSearch: handleSearch,
    isLoading,
    refetch: fetchMembers,
  };
}
