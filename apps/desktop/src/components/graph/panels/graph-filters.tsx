'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, LayoutGrid, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGraphStore } from '../task-graph-store';

const SCOPES = [
  { key: 'active' as const, label: 'Active' },
  { key: 'all' as const, label: 'All' },
  { key: 'completed' as const, label: 'Completed' },
];

const STATUSES = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Med',
  LOW: 'Low',
};

interface GraphFiltersProps {
  onFiltersChange: () => void;
}

export function GraphFilters({ onFiltersChange }: GraphFiltersProps) {
  const {
    scope,
    statusFilter,
    priorityFilter,
    searchQuery,
    layoutMode,
    setScope,
    setStatusFilter,
    setPriorityFilter,
    setSearchQuery,
    setLayoutMode,
  } = useGraphStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  const toggleStatus = useCallback(
    (s: string) => {
      const next = statusFilter.includes(s)
        ? statusFilter.filter((v) => v !== s)
        : [...statusFilter, s];
      setStatusFilter(next);
      onFiltersChange();
    },
    [statusFilter, setStatusFilter, onFiltersChange],
  );

  const togglePriority = useCallback(
    (p: string) => {
      const next = priorityFilter.includes(p)
        ? priorityFilter.filter((v) => v !== p)
        : [...priorityFilter, p];
      setPriorityFilter(next);
      onFiltersChange();
    },
    [priorityFilter, setPriorityFilter, onFiltersChange],
  );

  const handleScopeChange = useCallback(
    (s: 'active' | 'all' | 'completed') => {
      setScope(s);
      onFiltersChange();
    },
    [setScope, onFiltersChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2">
      {/* Scope toggle */}
      <div className="flex rounded-md border border-border">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => handleScopeChange(s.key)}
            className={cn(
              'px-2.5 py-1 text-xs font-medium transition-colors',
              scope === s.key
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-border" />

      {/* Status chips */}
      <div className="flex gap-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors border',
              statusFilter.includes(s)
                ? 'bg-accent text-accent-foreground border-accent'
                : 'text-muted-foreground border-border hover:border-accent',
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-border" />

      {/* Priority chips */}
      <div className="flex gap-1">
        {PRIORITIES.map((p) => (
          <button
            key={p}
            onClick={() => togglePriority(p)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors border',
              priorityFilter.includes(p)
                ? 'bg-accent text-accent-foreground border-accent'
                : 'text-muted-foreground border-border hover:border-accent',
            )}
          >
            {PRIORITY_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-border" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search..."
          className="h-7 w-36 rounded-md border border-border bg-background pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Layout toggle */}
      <div className="ml-auto flex rounded-md border border-border">
        <button
          onClick={() => setLayoutMode('force')}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors',
            layoutMode === 'force'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          title="Force layout"
        >
          <LayoutGrid className="h-3 w-3" />
          Force
        </button>
        <button
          onClick={() => setLayoutMode('hierarchy')}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors',
            layoutMode === 'hierarchy'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          title="Hierarchy layout"
        >
          <GitBranch className="h-3 w-3" />
          Hierarchy
        </button>
      </div>
    </div>
  );
}
