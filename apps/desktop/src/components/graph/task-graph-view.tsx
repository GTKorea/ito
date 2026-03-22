'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';

import { useGraphStore, type TaskGraphTask } from './task-graph-store';
import { useAuthStore } from '@/stores/auth-store';
import { TaskNode, type TaskNodeData } from './nodes/task-node';
import { ThreadEdge, type ThreadEdgeData } from './edges/thread-edge';
import { GraphFilters } from './panels/graph-filters';
import { TaskDetailPanel } from './panels/task-detail-panel';

const nodeTypes = { taskNode: TaskNode };
const edgeTypes = { threadEdge: ThreadEdge };

const TASK_NODE_WIDTH = 220;
const TASK_NODE_HEIGHT = 110;

// ──────────────── Dagre (hierarchy) layout ────────────────

function dagreLayout(
  nodes: Node<TaskNodeData>[],
  edges: Edge<ThreadEdgeData>[],
): Node<TaskNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: 60,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: TASK_NODE_WIDTH, height: TASK_NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: {
        x: pos.x - TASK_NODE_WIDTH / 2,
        y: pos.y - TASK_NODE_HEIGHT / 2,
      },
    };
  });
}

// ──────────────── d3-force layout ────────────────

interface ForceNode extends SimulationNodeDatum {
  id: string;
}

function forceLayout(
  nodes: Node<TaskNodeData>[],
  edges: Edge<ThreadEdgeData>[],
): Node<TaskNodeData>[] {
  if (nodes.length === 0) return nodes;

  const forceNodes: ForceNode[] = nodes.map((n) => ({
    id: n.id,
    x: Math.random() * 600,
    y: Math.random() * 400,
  }));

  const nodeIndex = new Map(forceNodes.map((n, i) => [n.id, i]));

  const forceEdges: SimulationLinkDatum<ForceNode>[] = edges
    .filter((e) => nodeIndex.has(e.source) && nodeIndex.has(e.target))
    .map((e) => ({
      source: nodeIndex.get(e.source)!,
      target: nodeIndex.get(e.target)!,
    }));

  const simulation = forceSimulation<ForceNode>(forceNodes)
    .force(
      'link',
      forceLink<ForceNode, SimulationLinkDatum<ForceNode>>(forceEdges).distance(200),
    )
    .force('charge', forceManyBody().strength(-400))
    .force('center', forceCenter(400, 300))
    .force('collide', forceCollide(TASK_NODE_WIDTH / 2 + 20))
    .stop();

  // Run synchronously
  for (let i = 0; i < 150; i++) {
    simulation.tick();
  }

  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: (forceNodes[i].x ?? 0) - TASK_NODE_WIDTH / 2,
      y: (forceNodes[i].y ?? 0) - TASK_NODE_HEIGHT / 2,
    },
  }));
}

// ──────────────── Build nodes & edges from tasks ────────────────

function buildGraph(
  tasks: TaskGraphTask[],
  userId: string | undefined,
  selectedTaskId: string | null,
  searchQuery: string,
): { nodes: Node<TaskNodeData>[]; edges: Edge<ThreadEdgeData>[] } {
  // Filter by search query
  const filtered = searchQuery
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.assignee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.creator.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : tasks;

  const nodes: Node<TaskNodeData>[] = [];
  const edges: Edge<ThreadEdgeData>[] = [];

  for (const task of filtered) {
    const chainTotal = task.threadLinks.length;
    const chainCompleted = task.threadLinks.filter((l) => l.status === 'COMPLETED').length;
    const sortedLinks = [...task.threadLinks].sort((a, b) => a.chainIndex - b.chainIndex);

    if (sortedLinks.length === 0) {
      // No thread chain — single node for the creator/assignee
      nodes.push({
        id: task.id,
        type: 'taskNode',
        position: { x: 0, y: 0 },
        data: {
          title: task.title,
          status: task.status,
          priority: task.priority,
          assigneeName: task.creator.name,
          assigneeInitial: task.creator.name?.charAt(0).toUpperCase() || '?',
          chainTotal,
          chainCompleted,
          dueDate: task.dueDate,
          hasPendingAction: false,
          isSelected: task.id === selectedTaskId,
        },
      });
    } else {
      // Build chain: creator → link[0].toUser → link[1].toUser → ...
      // First node: the creator (fromUser of the first link)
      const firstFrom = sortedLinks[0].fromUser;
      const creatorNodeId = `${task.id}::${firstFrom.id}`;
      nodes.push({
        id: creatorNodeId,
        type: 'taskNode',
        position: { x: 0, y: 0 },
        data: {
          title: task.title,
          status: task.status,
          priority: task.priority,
          assigneeName: firstFrom.name,
          assigneeInitial: firstFrom.name?.charAt(0).toUpperCase() || '?',
          chainTotal,
          chainCompleted,
          dueDate: task.dueDate,
          hasPendingAction: false,
          isSelected: task.id === selectedTaskId,
        },
      });

      let prevNodeId = creatorNodeId;

      for (const link of sortedLinks) {
        const isBlocker = link.type === 'BLOCKER';
        const toNodeId = isBlocker
          ? `${task.id}::blocker-${link.id}`
          : `${task.id}::${link.toUser!.id}`;

        // Only add node if not already added (handles A→B→A cycles)
        if (!nodes.find((n) => n.id === toNodeId)) {
          if (isBlocker) {
            // Blocker node
            nodes.push({
              id: toNodeId,
              type: 'taskNode',
              position: { x: 0, y: 0 },
              data: {
                title: task.title,
                status: 'BLOCKED',
                priority: task.priority,
                assigneeName: link.blockerNote || 'Blocker',
                assigneeInitial: '!',
                chainTotal,
                chainCompleted,
                dueDate: task.dueDate,
                hasPendingAction: link.fromUserId === userId && link.status === 'PENDING',
                isSelected: task.id === selectedTaskId,
              },
            });
          } else {
            nodes.push({
              id: toNodeId,
              type: 'taskNode',
              position: { x: 0, y: 0 },
              data: {
                title: task.title,
                status: task.status,
                priority: task.priority,
                assigneeName: link.toUser!.name,
                assigneeInitial: link.toUser!.name?.charAt(0).toUpperCase() || '?',
                chainTotal,
                chainCompleted,
                dueDate: task.dueDate,
                hasPendingAction: link.toUserId === userId && link.status === 'PENDING',
                isSelected: task.id === selectedTaskId,
              },
            });
          }
        }

        // Edge from previous person to this person/blocker
        const fromName = link.fromUser.name.split(' ')[0];
        const toName = isBlocker
          ? (link.blockerNote?.substring(0, 15) || 'Blocker')
          : link.toUser!.name.split(' ')[0];
        edges.push({
          id: `chain-${link.id}`,
          source: prevNodeId,
          target: toNodeId,
          type: 'threadEdge',
          data: {
            linkStatus: link.status,
            label: isBlocker ? `${fromName} → ⚠️` : `${fromName} → ${toName}`,
            isCollaboration: false,
          },
        });

        prevNodeId = toNodeId;
      }
    }
  }

  return { nodes, edges };
}

// ──────────────── Main component ────────────────

interface TaskGraphViewProps {
  workspaceId: string;
}

export function TaskGraphView({ workspaceId }: TaskGraphViewProps) {
  const {
    tasks,
    isLoading,
    layoutMode,
    selectedTaskId,
    searchQuery,
    selectTask,
    fetchGraphData,
  } = useGraphStore();
  const { user } = useAuthStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TaskNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ThreadEdgeData>>([]);
  const initialFetchDone = useRef(false);

  // Initial fetch
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchGraphData(workspaceId);
    }
  }, [workspaceId, fetchGraphData]);

  // Rebuild graph when data changes
  useEffect(() => {
    const { nodes: rawNodes, edges: rawEdges } = buildGraph(
      tasks,
      user?.id,
      selectedTaskId,
      searchQuery,
    );

    const layoutedNodes =
      layoutMode === 'hierarchy'
        ? dagreLayout(rawNodes, rawEdges)
        : forceLayout(rawNodes, rawEdges);

    setNodes(layoutedNodes);
    setEdges(rawEdges);
  }, [tasks, user?.id, selectedTaskId, searchQuery, layoutMode, setNodes, setEdges]);

  const onFiltersChange = useCallback(() => {
    // Re-fetch with new filters — use a small delay so the store updates first
    setTimeout(() => {
      fetchGraphData(workspaceId);
    }, 0);
  }, [workspaceId, fetchGraphData]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Node ID may be "{taskId}::{userId}" for chain nodes, extract taskId
      const taskId = node.id.includes('::') ? node.id.split('::')[0] : node.id;
      selectTask(taskId);
    },
    [selectTask],
  );

  const onPaneClick = useCallback(() => {
    selectTask(null);
  }, [selectTask]);

  return (
    <div className="flex h-full flex-col">
      <GraphFilters onFiltersChange={onFiltersChange} />

      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No tasks found for this view.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create tasks or adjust filters to see your task graph.
              </p>
            </div>
          </div>
        )}

        {(tasks.length > 0 || isLoading) && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.4 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={2}
            nodesConnectable={false}
            panOnScroll
            zoomOnScroll
            className="!bg-background"
          >
            <Background color="hsl(var(--border))" gap={24} size={1} />
            <Controls
              showInteractive={false}
              className="!bg-card !border-border !shadow-none [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-accent"
            />
            {nodes.length > 6 && (
              <MiniMap
                nodeColor="hsl(var(--muted))"
                maskColor="hsl(var(--background) / 0.7)"
                className="!bg-card !border-border"
              />
            )}
          </ReactFlow>
        )}

        <TaskDetailPanel />
      </div>

      {/* Global CSS for animations */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
          50% { box-shadow: 0 0 12px 4px rgba(234, 179, 8, 0.3); }
        }
        @keyframes dash-flow {
          to { stroke-dashoffset: -18; }
        }
      `}</style>
    </div>
  );
}
