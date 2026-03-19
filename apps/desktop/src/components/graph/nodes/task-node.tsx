'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

const STATUS_BORDER_COLORS: Record<string, string> = {
  OPEN: '#666666',
  IN_PROGRESS: '#3B82F6',
  BLOCKED: '#EF4444',
  COMPLETED: '#22C55E',
  CANCELLED: '#666666',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#3B82F6',
  LOW: '#9CA3AF',
};

export type TaskNodeData = {
  title: string;
  status: string;
  priority: string;
  assigneeName: string;
  assigneeInitial: string;
  chainTotal: number;
  chainCompleted: number;
  dueDate?: string;
  hasPendingAction: boolean;
  isSelected: boolean;
};

function TaskNodeComponent({ data }: NodeProps<Node<TaskNodeData>>) {
  const {
    title,
    status,
    priority,
    assigneeName,
    assigneeInitial,
    chainTotal,
    chainCompleted,
    dueDate,
    hasPendingAction,
    isSelected,
  } = data;

  const borderColor = isSelected ? '#22D3EE' : STATUS_BORDER_COLORS[status] || '#666';
  const priorityColor = PRIORITY_COLORS[priority] || '#9CA3AF';

  // Check if due date is near or overdue
  let dueDateDisplay: string | null = null;
  let dueDateIsOverdue = false;
  if (dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      dueDateDisplay = 'Overdue';
      dueDateIsOverdue = true;
    } else if (diffDays <= 7) {
      dueDateDisplay = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays}d`;
      dueDateIsOverdue = false;
    }
  }

  return (
    <div
      className="relative w-[220px] rounded-lg border-2 bg-card p-3 shadow-sm transition-shadow hover:shadow-lg"
      style={{
        borderColor,
        animation: hasPendingAction ? 'pulse-border 2s ease-in-out infinite' : undefined,
      }}
      title={title}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-1.5 !rounded-sm !border-none !bg-muted-foreground/40"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-1.5 !rounded-sm !border-none !bg-muted-foreground/40"
      />

      {/* Top row: priority dot + title */}
      <div className="flex items-start gap-2">
        <span
          className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: priorityColor }}
        />
        <span className="flex-1 truncate text-sm font-medium text-foreground">
          {title}
        </span>
      </div>

      {/* Middle row: status pill + chain progress */}
      <div className="mt-2 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: STATUS_BORDER_COLORS[status] || '#666' }}
        >
          {STATUS_LABELS[status] || status}
        </span>
        {chainTotal > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {chainCompleted}/{chainTotal}
          </span>
        )}
      </div>

      {/* Bottom row: assignee + due date */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
            {assigneeInitial}
          </span>
          <span className="max-w-[100px] truncate text-[11px] text-muted-foreground">
            {assigneeName}
          </span>
        </div>
        {dueDateDisplay && (
          <span
            className="text-[10px] font-medium"
            style={{ color: dueDateIsOverdue ? '#EF4444' : '#F59E0B' }}
          >
            {dueDateDisplay}
          </span>
        )}
      </div>
    </div>
  );
}

export const TaskNode = memo(TaskNodeComponent);
