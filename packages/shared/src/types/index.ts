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

export interface VoteConfig {
  mode: 'approve_reject' | 'custom';
  options: string[];
  allowChange?: boolean;
  anonymous?: boolean;
}

export interface Reminder {
  id: string;
  remindAt: string;
  sent: boolean;
}

export interface OAuthProfile {
  id: string;
  displayName?: string;
  username?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}
