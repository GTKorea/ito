export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
export type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ThreadLinkStatus = 'PENDING' | 'COMPLETED' | 'FORWARDED' | 'CANCELLED';
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
export type TeamRole = 'LEAD' | 'MEMBER';
export type NotificationType =
  | 'THREAD_RECEIVED'
  | 'THREAD_SNAPPED'
  | 'THREAD_COMPLETED'
  | 'WORKSPACE_INVITE'
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED';
