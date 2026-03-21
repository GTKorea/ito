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

  const nodes: Node<TaskNodeData>[] = filtered.map((task) => {
    const chainTotal = task.threadLinks.length;
    const chainCompleted = task.threadLinks.filter((l) => l.status === 'COMPLETED').length;
    const hasPendingAction = task.threadLinks.some(
      (l) => l.toUserId === userId && l.status === 'PENDING',
    );

    return {
      id: task.id,
      type: 'taskNode',
      position: { x: 0, y: 0 },
      data: {
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeName: task.assignee.name,
        assigneeInitial: task.assignee.name?.charAt(0).toUpperCase() || '?',
        chainTotal,
        chainCompleted,
        dueDate: task.dueDate,
        hasPendingAction,
        isSelected: task.id === selectedTaskId,
      },
    };
  });

  const edges: Edge<ThreadEdgeData>[] = [];
  const taskIds = new Set(filtered.map((t) => t.id));

  // Within each task, create edges between consecutive thread link users
  for (const task of filtered) {
    for (const link of task.threadLinks) {
      // Only create intra-task edges if both source/target tasks are the same
      // We create edges from taskId perspective — each link creates an edge to this task
      // from a conceptual "chain step" perspective, but since our nodes are tasks,
      // we skip intra-task link edges (they are shown in the detail panel).
    }
  }

  // Between tasks: create edges if they share users in the thread chain
  const taskUserMap = new Map<string, Set<string>>();
  for (const task of filtered) {
    const users = new Set<string>();
    users.add(task.creatorId);
    users.add(task.assigneeId);
    for (const link of task.threadLinks) {
      users.add(link.fromUserId);
      users.add(link.toUserId);
    }
    taskUserMap.set(task.id, users);
  }

  // Create thread chain edges: connect tasks linked through thread chains
  // For each task with thread links, create edges to represent the task flow
  for (const task of filtered) {
    if (task.threadLinks.length === 0) continue;

    // Find other tasks that share the last link's toUser as creator or have a chain from them
    for (const otherTask of filtered) {
      if (otherTask.id === task.id) continue;

      // Connect if the assignee of one task is the creator of another
      // (suggesting a workflow relationship)
      for (const link of task.threadLinks) {
        if (
          link.toUserId === otherTask.creatorId &&
          link.status !== 'CANCELLED'
        ) {
          const edgeId = `collab-${task.id}-${otherTask.id}`;
          if (!edges.find((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: task.id,
              target: otherTask.id,
              type: 'threadEdge',
              data: {
                linkStatus: link.status,
                label: '',
                isCollaboration: true,
              },
            });
          }
        }
      }
    }
  }

  // Also create explicit thread edges between tasks in the same chain
  // For each thread link, find if the toUser has tasks that are linked
  for (const task of filtered) {
    for (const link of task.threadLinks) {
      // Find any other task where this link connects meaningfully
      for (const otherTask of filtered) {
        if (otherTask.id === task.id) continue;
        // If the linked user is the assignee of another task
        if (link.toUserId === otherTask.assigneeId && link.status !== 'CANCELLED') {
          const edgeId = `thread-${link.id}-${otherTask.id}`;
          if (!edges.find((e) => e.id === edgeId)) {
            const fromName = link.fromUser.name.split(' ')[0];
            const toName = link.toUser.name.split(' ')[0];
            edges.push({
              id: edgeId,
              source: task.id,
              target: otherTask.id,
              type: 'threadEdge',
              data: {
                linkStatus: link.status,
                label: `${fromName} → ${toName}`,
                isCollaboration: false,
              },
            });
          }
        }
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
      selectTask(node.id);
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
