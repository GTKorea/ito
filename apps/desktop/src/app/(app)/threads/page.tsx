'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { useTodoStore } from '@/stores/todo-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Check,
  Link2,
  ArrowDownLeft,
  ArrowUpRight,
  Network,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ThreadLink {
  id: string;
  fromUser?: User;
  toUser?: User;
  fromUserId?: string;
  toUserId?: string;
  message?: string;
  status: string;
  chainIndex: number;
  createdAt: string;
  todo: {
    id: string;
    title: string;
    priority: string;
  };
}

interface MyThreads {
  incoming: ThreadLink[];
  outgoing: ThreadLink[];
}

// ── Graph helpers ───────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#EAB308',
  FORWARDED: '#3B82F6',
  COMPLETED: '#22C55E',
  CANCELLED: '#EF4444',
};

const NODE_W = 120;
const NODE_H = 80;

function layoutGraph(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 70, ranksep: 100, marginx: 30, marginy: 30 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: nodes.map((n) => {
      const p = g.node(n.id);
      return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } };
    }),
    edges,
  };
}

type OverviewNodeData = {
  label: string;
  isMe: boolean;
  pendingCount: number;
  forwardedCount: number;
};

function OverviewNode({ data }: NodeProps<Node<OverviewNodeData>>) {
  const { label, isMe, pendingCount, forwardedCount } = data;
  const initial = (label as string)?.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex flex-col items-center gap-1">
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <div
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold',
          'bg-card text-foreground',
          isMe ? 'border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'border-border',
        )}
      >
        {initial}
      </div>
      <span className="max-w-[100px] truncate text-[10px] text-muted-foreground font-medium">
        {label as string}
        {isMe && ' (me)'}
      </span>
      {(pendingCount > 0 || forwardedCount > 0) && (
        <div className="flex gap-1">
          {pendingCount > 0 && (
            <span className="rounded-full bg-yellow-500/20 px-1.5 py-0 text-[9px] text-yellow-500 font-medium">
              {pendingCount}
            </span>
          )}
          {forwardedCount > 0 && (
            <span className="rounded-full bg-blue-500/20 px-1.5 py-0 text-[9px] text-blue-500 font-medium">
              {forwardedCount}
            </span>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
    </div>
  );
}

const overviewNodeTypes = { overviewNode: OverviewNode };

// ── Main component ──────────────────────────

export default function ThreadsPage() {
  const [threads, setThreads] = useState<MyThreads>({ incoming: [], outgoing: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'incoming' | 'outgoing' | 'graph'>('incoming');
  const { resolveThread } = useTodoStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const t = useTranslations('threads');

  const fetchThreads = async () => {
    if (!currentWorkspace) return;
    try {
      const { data } = await api.get('/threads/mine', {
        params: { workspaceId: currentWorkspace.id },
      });
      setThreads(data);
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      fetchThreads();
    } else {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  const handleResolve = async (id: string) => {
    await resolveThread(id);
    fetchThreads();
  };

  // ── Build overview graph from all threads ──
  const { graphNodes, graphEdges } = useMemo(() => {
    const allLinks = [...threads.incoming, ...threads.outgoing];
    if (allLinks.length === 0) return { graphNodes: [], graphEdges: [] };

    const usersMap = new Map<string, { user: User; pending: number; forwarded: number }>();
    const edgeMap = new Map<string, { link: ThreadLink; count: number }>();

    for (const link of allLinks) {
      const from = link.fromUser;
      const to = link.toUser;
      if (!from || !to) continue;

      if (!usersMap.has(from.id)) usersMap.set(from.id, { user: from, pending: 0, forwarded: 0 });
      if (!usersMap.has(to.id)) usersMap.set(to.id, { user: to, pending: 0, forwarded: 0 });

      // Count statuses for the target user
      const toEntry = usersMap.get(to.id)!;
      if (link.status === 'PENDING') toEntry.pending++;
      if (link.status === 'FORWARDED') toEntry.forwarded++;

      // Dedupe edges by from→to pair, keep the most relevant status
      const edgeKey = `${from.id}->${to.id}`;
      const existing = edgeMap.get(edgeKey);
      if (!existing || link.status === 'PENDING') {
        edgeMap.set(edgeKey, { link, count: (existing?.count || 0) + 1 });
      } else {
        existing.count++;
      }
    }

    const nodes: Node<OverviewNodeData>[] = Array.from(usersMap.entries()).map(([id, entry]) => ({
      id,
      type: 'overviewNode',
      position: { x: 0, y: 0 },
      data: {
        label: entry.user.name,
        isMe: id === user?.id,
        pendingCount: entry.pending,
        forwardedCount: entry.forwarded,
      },
    }));

    const edges: Edge[] = Array.from(edgeMap.entries()).map(([key, { link, count }]) => {
      const color = STATUS_COLORS[link.status] || '#555';
      const isPending = link.status === 'PENDING';
      return {
        id: key,
        source: link.fromUser!.id,
        target: link.toUser!.id,
        label: link.todo.title.length > 20 ? link.todo.title.slice(0, 20) + '…' : link.todo.title,
        labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 9 },
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 3,
        style: {
          stroke: color,
          strokeWidth: Math.min(2 + count, 4),
          strokeDasharray: isPending ? '6 3' : undefined,
        },
        animated: isPending,
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
      };
    });

    const laid = layoutGraph(nodes, edges);
    return { graphNodes: laid.nodes, graphEdges: laid.edges };
  }, [threads, user?.id]);

  const list = view === 'incoming' ? threads.incoming : threads.outgoing;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border px-6">
        <button
          onClick={() => setView('incoming')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors',
            view === 'incoming'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <ArrowDownLeft className="h-3.5 w-3.5" />
          {t('incoming')}
          {threads.incoming.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
              {threads.incoming.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setView('outgoing')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors',
            view === 'outgoing'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          {t('outgoing')}
          {threads.outgoing.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
              {threads.outgoing.length}
            </Badge>
          )}
        </button>

        {/* Graph tab */}
        <button
          onClick={() => setView('graph')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ml-auto',
            view === 'graph'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Network className="h-3.5 w-3.5" />
          Graph
        </button>
      </div>

      {/* Content */}
      {view === 'graph' ? (
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : graphNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Network className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm">No threads to visualize</p>
            </div>
          ) : (
            <ReactFlow
              nodes={graphNodes}
              edges={graphEdges}
              nodeTypes={overviewNodeTypes}
              fitView
              fitViewOptions={{ padding: 0.4 }}
              proOptions={{ hideAttribution: true }}
              minZoom={0.3}
              maxZoom={2}
              nodesDraggable
              nodesConnectable={false}
              panOnScroll
              zoomOnScroll
            >
              <Background gap={20} size={1} className="!bg-background" />
              <Controls
                showInteractive={false}
                className="!bg-card !border-border !shadow-none [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-accent"
              />
              {graphNodes.length > 5 && (
                <MiniMap
                  nodeColor="hsl(var(--muted))"
                  maskColor="rgba(0,0,0,0.5)"
                  className="!bg-card !border-border"
                />
              )}
            </ReactFlow>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Link2 className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm">
                {view === 'incoming' ? t('noIncoming') : t('noOutgoing')}
              </p>
            </div>
          ) : (
            list.map((link) => (
              <div
                key={link.id}
                className="rounded-lg border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[9px] bg-secondary">
                        {((view === 'incoming' ? link.fromUser?.name : link.toUser?.name) || '?')
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {view === 'incoming' ? link.fromUser?.name : link.toUser?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {view === 'incoming' ? t('askedYouToHandle') : t('isHandlingYourRequest')}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      link.status === 'PENDING' && 'border-yellow-500/50 text-yellow-500',
                      link.status === 'COMPLETED' && 'border-green-500/50 text-green-500',
                      link.status === 'FORWARDED' && 'border-blue-500/50 text-blue-500',
                    )}
                  >
                    {link.status}
                  </Badge>
                </div>

                <div className="rounded-md bg-accent/50 px-3 py-2">
                  <p className="text-sm font-medium">{link.todo.title}</p>
                </div>

                {link.message && (
                  <p className="text-xs text-muted-foreground italic">
                    &quot;{link.message}&quot;
                  </p>
                )}

                {view === 'incoming' && link.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => handleResolve(link.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      {t('markDone')}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
