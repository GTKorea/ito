'use client';

import { useMemo } from 'react';
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
  fromUser: User;
  toUser: User;
  fromUserId?: string;
  toUserId?: string;
  message?: string;
  status: string;
  chainIndex: number;
}

interface ThreadGraphProps {
  links: ThreadLink[];
  creator: User;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#EAB308',
  FORWARDED: '#3B82F6',
  COMPLETED: '#22C55E',
  CANCELLED: '#EF4444',
};

const NODE_WIDTH = 100;
const NODE_HEIGHT = 70;

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: 60,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

type UserNodeData = {
  label: string;
  isCreator: boolean;
  isCurrentAssignee: boolean;
};

function UserNode({ data }: NodeProps<Node<UserNodeData>>) {
  const { label, isCreator, isCurrentAssignee } = data;
  const initial = (label as string)?.charAt(0).toUpperCase() || '?';

  let borderClass = 'border-[#333]';
  let glowStyle = {};
  if (isCurrentAssignee) {
    borderClass = 'border-cyan-400';
    glowStyle = { boxShadow: '0 0 12px 2px rgba(34,211,238,0.4)' };
  } else if (isCreator) {
    borderClass = 'border-amber-500/70';
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <div
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 bg-[#1A1A1A] text-xs font-medium text-[#ECECEC] ${borderClass}`}
        style={glowStyle}
      >
        {initial}
        {isCreator && (
          <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none text-amber-400">
            &#9733;
          </span>
        )}
      </div>
      <span className="max-w-[80px] truncate text-[10px] text-[#999]">
        {label as string}
      </span>
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
    </div>
  );
}

const nodeTypes = { userNode: UserNode };

export function ThreadGraph({ links, creator }: ThreadGraphProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!links || links.length === 0) return { initialNodes: [], initialEdges: [] };

    // Determine the current assignee: toUser of the last PENDING link
    const pendingLinks = links.filter((l) => l.status === 'PENDING');
    const currentAssigneeId = pendingLinks.length > 0
      ? pendingLinks[pendingLinks.length - 1].toUser.id
      : null;

    // Collect unique users
    const usersMap = new Map<string, User>();
    usersMap.set(creator.id, creator);
    links.forEach((link) => {
      if (!usersMap.has(link.fromUser.id)) usersMap.set(link.fromUser.id, link.fromUser);
      if (!usersMap.has(link.toUser.id)) usersMap.set(link.toUser.id, link.toUser);
    });

    const nodes: Node<UserNodeData>[] = Array.from(usersMap.values()).map((user) => ({
      id: user.id,
      type: 'userNode',
      position: { x: 0, y: 0 },
      data: {
        label: user.name,
        isCreator: user.id === creator.id,
        isCurrentAssignee: user.id === currentAssigneeId,
      },
    }));

    const edges: Edge[] = links.map((link) => {
      const color = STATUS_COLORS[link.status] || '#555';
      const isPending = link.status === 'PENDING';

      return {
        id: link.id,
        source: link.fromUser.id,
        target: link.toUser.id,
        label: `${link.chainIndex}`,
        labelStyle: { fill: '#999', fontSize: 10 },
        labelBgStyle: { fill: '#0A0A0A', fillOpacity: 0.8 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 3,
        style: {
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: isPending ? '6 3' : undefined,
        },
        animated: isPending,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 16,
          height: 16,
        },
      };
    });

    const layouted = getLayoutedElements(nodes, edges);
    return { initialNodes: layouted.nodes, initialEdges: layouted.edges };
  }, [links, creator]);

  if (!links || links.length === 0) return null;

  return (
    <div className="h-[300px] w-full rounded-lg border border-[#222] bg-[#0A0A0A]">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.5}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        className="thread-graph"
      >
        <Background color="#222" gap={20} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-[#1A1A1A] !border-[#333] !shadow-none [&>button]:!bg-[#1A1A1A] [&>button]:!border-[#333] [&>button]:!text-[#999] [&>button:hover]:!bg-[#252525]"
        />
        {initialNodes.length > 4 && (
          <MiniMap
            nodeColor="#333"
            maskColor="rgba(0,0,0,0.7)"
            className="!bg-[#111] !border-[#333]"
          />
        )}
      </ReactFlow>
    </div>
  );
}
