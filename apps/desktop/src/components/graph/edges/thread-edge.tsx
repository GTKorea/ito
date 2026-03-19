'use client';

import { memo } from 'react';
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  type Edge,
  EdgeLabelRenderer,
} from '@xyflow/react';

const LINK_STATUS_COLORS: Record<string, string> = {
  PENDING: '#EAB308',
  FORWARDED: '#3B82F6',
  COMPLETED: '#22C55E',
  CANCELLED: '#EF4444',
};

export type ThreadEdgeData = {
  linkStatus: string;
  label: string;
  isCollaboration: boolean;
};

function ThreadEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<Edge<ThreadEdgeData>>) {
  const linkStatus = data?.linkStatus || 'PENDING';
  const isCollaboration = data?.isCollaboration || false;
  const label = data?.label || '';

  const color = isCollaboration ? 'rgba(100,100,100,0.3)' : (LINK_STATUS_COLORS[linkStatus] || '#555');
  const strokeWidth = isCollaboration ? 1 : 2;
  const strokeDasharray = linkStatus === 'PENDING' && !isCollaboration ? '6 3' : undefined;
  const animated = linkStatus === 'PENDING' && !isCollaboration;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth,
          strokeDasharray,
          animation: animated ? 'dash-flow 1s linear infinite' : undefined,
        }}
      />
      {!isCollaboration && label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="rounded bg-background/80 px-1.5 py-0.5 text-[9px] text-muted-foreground"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const ThreadEdge = memo(ThreadEdgeComponent);
