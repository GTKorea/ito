const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

export async function requestNotificationPermission(): Promise<boolean> {
  if (isTauri()) {
    const { isPermissionGranted, requestPermission } = await import(
      '@tauri-apps/plugin-notification'
    );
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    return granted;
  } else {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
}

export async function sendDesktopNotification(
  title: string,
  body: string,
): Promise<void> {
  if (isTauri()) {
    const { sendNotification } = await import(
      '@tauri-apps/plugin-notification'
    );
    sendNotification({ title, body });
  } else {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }
}

interface NotificationData {
  type: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export function formatNotification(notification: NotificationData): {
  title: string;
  body: string;
} {
  const data = notification.data || {};
  const taskTitle = data.taskTitle || data.title || '';

  switch (notification.type) {
    case 'THREAD_RECEIVED':
      return {
        title: `New Thread: ${taskTitle}`,
        body: data.fromUserName
          ? `${data.fromUserName} connected a task to you`
          : 'A task was connected to you',
      };
    case 'THREAD_SNAPPED':
      return {
        title: `Thread Snap-back: ${taskTitle}`,
        body: 'Task returned to you',
      };
    case 'THREAD_COMPLETED':
      return {
        title: `Thread Complete: ${taskTitle}`,
        body: 'A thread chain has been completed',
      };
    case 'WORKSPACE_INVITE':
      return {
        title: 'Workspace Invite',
        body: data.workspaceName
          ? `You've been invited to ${data.workspaceName}`
          : "You've been invited to a workspace",
      };
    case 'TASK_ASSIGNED':
      return {
        title: `Task Assigned: ${taskTitle}`,
        body: 'A task has been assigned to you',
      };
    case 'TASK_COMPLETED':
      return {
        title: `Task Complete: ${taskTitle}`,
        body: 'A task has been completed',
      };
    case 'CHAT_MESSAGE':
      return {
        title: data.senderName
          ? `${data.senderName}`
          : 'New Message',
        body: notification.title || `New message in "${taskTitle}"`,
      };
    case 'THREAD_PULLED':
      return {
        title: data.pullerName
          ? `${data.pullerName}님이 실을 당겼습니다`
          : '실이 당겨졌습니다',
        body: `"${taskTitle}" 태스크를 확인해주세요`,
      };
    case 'TASK_REMINDER':
      return {
        title: '리마인더',
        body: `"${taskTitle}" 태스크를 확인할 시간입니다`,
      };
    case 'VOTE_COMPLETE':
      return {
        title: `Vote Complete: ${taskTitle}`,
        body: notification.body || 'All votes have been collected',
      };
    default:
      return {
        title: notification.title || 'ito',
        body: notification.body || '',
      };
  }
}
