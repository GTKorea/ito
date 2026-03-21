import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTaskStore } from '@/stores/task-store';

vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/stores/workspace-store', () => ({
  useWorkspaceStore: {
    getState: () => ({ currentWorkspace: { id: 'ws1' } }),
  },
}));

import { api } from '@/lib/api-client';

const mockedApi = vi.mocked(api, true);

const mockUser = { id: 'u1', name: 'Alice' };
const mockTask = {
  id: 't1',
  title: 'Test Task',
  status: 'OPEN',
  priority: 'MEDIUM',
  creator: mockUser,
  assignee: mockUser,
  threadLinks: [],
  createdAt: '2026-01-01T00:00:00Z',
};

describe('task-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTaskStore.setState({ actionRequired: [], waiting: [], completed: [], isLoading: false });
  });

  describe('initial state', () => {
    it('should start with empty categories and not loading', () => {
      const state = useTaskStore.getState();
      expect(state.actionRequired).toEqual([]);
      expect(state.waiting).toEqual([]);
      expect(state.completed).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchCategorizedTasks', () => {
    it('should fetch categorized tasks for a workspace', async () => {
      const data = {
        actionRequired: [mockTask],
        waiting: [],
        completed: [],
      };
      mockedApi.get.mockResolvedValueOnce({ data });

      await useTaskStore.getState().fetchCategorizedTasks('ws1');

      expect(mockedApi.get).toHaveBeenCalledWith('/workspaces/ws1/tasks/categorized');
      const state = useTaskStore.getState();
      expect(state.actionRequired).toEqual([mockTask]);
      expect(state.waiting).toEqual([]);
      expect(state.completed).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it('should stop loading on error', async () => {
      useTaskStore.setState({ isLoading: true });
      mockedApi.get.mockRejectedValueOnce(new Error('Network error'));

      await useTaskStore.getState().fetchCategorizedTasks('ws1');

      expect(useTaskStore.getState().isLoading).toBe(false);
    });
  });

  describe('createTask', () => {
    it('should create a task and prepend it to actionRequired', async () => {
      const newTask = { ...mockTask, id: 't2', title: 'New Task' };
      mockedApi.post.mockResolvedValueOnce({ data: newTask });

      const result = await useTaskStore.getState().createTask('ws1', 'New Task', 'desc', 'HIGH', '2026-12-31');

      expect(mockedApi.post).toHaveBeenCalledWith('/workspaces/ws1/tasks', {
        title: 'New Task',
        description: 'desc',
        priority: 'HIGH',
        dueDate: '2026-12-31',
      });
      expect(result).toEqual(newTask);
      expect(useTaskStore.getState().actionRequired[0]).toEqual(newTask);
    });
  });

  describe('updateTask', () => {
    it('should update a task in actionRequired', async () => {
      useTaskStore.setState({ actionRequired: [mockTask] });
      const updated = { ...mockTask, title: 'Updated' };
      mockedApi.patch.mockResolvedValueOnce({ data: updated });

      await useTaskStore.getState().updateTask('t1', { title: 'Updated' });

      expect(mockedApi.patch).toHaveBeenCalledWith('/tasks/t1', { title: 'Updated' });
      expect(useTaskStore.getState().actionRequired[0].title).toBe('Updated');
    });

    it('should move task to completed when status is COMPLETED', async () => {
      useTaskStore.setState({ actionRequired: [mockTask] });
      const updated = { ...mockTask, status: 'COMPLETED' };
      mockedApi.patch.mockResolvedValueOnce({ data: updated });

      await useTaskStore.getState().updateTask('t1', { status: 'COMPLETED' });

      expect(useTaskStore.getState().actionRequired).toHaveLength(0);
      expect(useTaskStore.getState().completed[0].status).toBe('COMPLETED');
    });
  });

  describe('deleteTask', () => {
    it('should remove the task from all lists', async () => {
      useTaskStore.setState({ actionRequired: [mockTask] });
      mockedApi.delete.mockResolvedValueOnce({});

      await useTaskStore.getState().deleteTask('t1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/tasks/t1');
      expect(useTaskStore.getState().actionRequired).toHaveLength(0);
    });
  });

  describe('connectThread', () => {
    it('should connect a thread and move task from actionRequired to waiting', async () => {
      useTaskStore.setState({ actionRequired: [mockTask] });
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await useTaskStore.getState().connectThread('t1', 'u2', 'Please handle this');

      expect(mockedApi.post).toHaveBeenCalledWith('/tasks/t1/connect', {
        toUserId: 'u2',
        message: 'Please handle this',
      });
      expect(useTaskStore.getState().actionRequired).toHaveLength(0);
      expect(useTaskStore.getState().waiting).toHaveLength(1);
    });
  });

  describe('resolveThread', () => {
    it('should resolve a thread link and remove from actionRequired', async () => {
      const taskWithLink = {
        ...mockTask,
        threadLinks: [
          { id: 'tl1', fromUser: mockUser, toUser: { id: 'u2', name: 'Bob' }, status: 'PENDING', chainIndex: 0, createdAt: '2026-01-01T00:00:00Z' },
        ],
      };
      useTaskStore.setState({ actionRequired: [taskWithLink] });
      // Mock resolve call
      mockedApi.post.mockResolvedValueOnce({});
      // Mock refetch call
      mockedApi.get.mockResolvedValueOnce({ data: { actionRequired: [], waiting: [], completed: [taskWithLink] } });

      await useTaskStore.getState().resolveThread('tl1');

      expect(mockedApi.post).toHaveBeenCalledWith('/thread-links/tl1/resolve');
    });

    it('should keep tasks without the resolved link', async () => {
      const task1 = {
        ...mockTask,
        threadLinks: [
          { id: 'tl1', fromUser: mockUser, toUser: { id: 'u2', name: 'Bob' }, status: 'PENDING', chainIndex: 0, createdAt: '2026-01-01T00:00:00Z' },
        ],
      };
      const task2 = { ...mockTask, id: 't2', title: 'Other Task', threadLinks: [] };
      useTaskStore.setState({ actionRequired: [task1, task2] });
      mockedApi.post.mockResolvedValueOnce({});
      // Mock refetch
      mockedApi.get.mockResolvedValueOnce({ data: { actionRequired: [task2], waiting: [], completed: [task1] } });

      await useTaskStore.getState().resolveThread('tl1');

      // After refetch, authoritative state applies
      const state = useTaskStore.getState();
      expect(state.actionRequired).toHaveLength(1);
      expect(state.actionRequired[0].id).toBe('t2');
      expect(state.completed).toHaveLength(1);
      expect(state.completed[0].id).toBe('t1');
    });
  });
});
