export const statusColors: Record<string, string> = {
  OPEN: 'text-foreground',
  IN_PROGRESS: 'text-blue-400',
  BLOCKED: 'text-yellow-400',
  COMPLETED: 'text-green-400',
  CANCELLED: 'text-muted-foreground',
};

export const priorityColors: Record<string, string> = {
  URGENT: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-foreground',
  LOW: 'text-muted-foreground',
};
