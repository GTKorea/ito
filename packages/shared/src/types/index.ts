export type TodoStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
export type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ThreadLinkStatus = 'PENDING' | 'COMPLETED' | 'FORWARDED' | 'CANCELLED';
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type TeamRole = 'LEAD' | 'MEMBER';
export type NotificationType =
  | 'THREAD_RECEIVED'
  | 'THREAD_SNAPPED'
  | 'THREAD_COMPLETED'
  | 'WORKSPACE_INVITE'
  | 'TODO_ASSIGNED'
  | 'TODO_COMPLETED';
