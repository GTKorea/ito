import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTodoStore } from '@/stores/todo-store';

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
const mockTodo = {
  id: 't1',
  title: 'Test Todo',
  status: 'OPEN',
  priority: 'MEDIUM',
  creator: mockUser,
  assignee: mockUser,
  threadLinks: [],
  createdAt: '2026-01-01T00:00:00Z',
};

describe('todo-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTodoStore.setState({ actionRequired: [], waiting: [], completed: [], isLoading: false });
  });

  describe('initial state', () => {
    it('should start with empty categories and not loading', () => {
      const state = useTodoStore.getState();
      expect(state.actionRequired).toEqual([]);
      expect(state.waiting).toEqual([]);
      expect(state.completed).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchCategorizedTodos', () => {
    it('should fetch categorized todos for a workspace', async () => {
      const data = {
        actionRequired: [mockTodo],
        waiting: [],
        completed: [],
      };
      mockedApi.get.mockResolvedValueOnce({ data });

      await useTodoStore.getState().fetchCategorizedTodos('ws1');

      expect(mockedApi.get).toHaveBeenCalledWith('/workspaces/ws1/todos/categorized');
      const state = useTodoStore.getState();
      expect(state.actionRequired).toEqual([mockTodo]);
      expect(state.waiting).toEqual([]);
      expect(state.completed).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it('should stop loading on error', async () => {
      useTodoStore.setState({ isLoading: true });
      mockedApi.get.mockRejectedValueOnce(new Error('Network error'));

      await useTodoStore.getState().fetchCategorizedTodos('ws1');

      expect(useTodoStore.getState().isLoading).toBe(false);
    });
  });

  describe('createTodo', () => {
    it('should create a todo and prepend it to actionRequired', async () => {
      const newTodo = { ...mockTodo, id: 't2', title: 'New Todo' };
      mockedApi.post.mockResolvedValueOnce({ data: newTodo });

      const result = await useTodoStore.getState().createTodo('ws1', 'New Todo', 'desc', 'HIGH', '2026-12-31');

      expect(mockedApi.post).toHaveBeenCalledWith('/workspaces/ws1/todos', {
        title: 'New Todo',
        description: 'desc',
        priority: 'HIGH',
        dueDate: '2026-12-31',
      });
      expect(result).toEqual(newTodo);
      expect(useTodoStore.getState().actionRequired[0]).toEqual(newTodo);
    });
  });

  describe('updateTodo', () => {
    it('should update a todo in actionRequired', async () => {
      useTodoStore.setState({ actionRequired: [mockTodo] });
      const updated = { ...mockTodo, title: 'Updated' };
      mockedApi.patch.mockResolvedValueOnce({ data: updated });

      await useTodoStore.getState().updateTodo('t1', { title: 'Updated' });

      expect(mockedApi.patch).toHaveBeenCalledWith('/todos/t1', { title: 'Updated' });
      expect(useTodoStore.getState().actionRequired[0].title).toBe('Updated');
    });

    it('should move todo to completed when status is COMPLETED', async () => {
      useTodoStore.setState({ actionRequired: [mockTodo] });
      const updated = { ...mockTodo, status: 'COMPLETED' };
      mockedApi.patch.mockResolvedValueOnce({ data: updated });

      await useTodoStore.getState().updateTodo('t1', { status: 'COMPLETED' });

      expect(useTodoStore.getState().actionRequired).toHaveLength(0);
      expect(useTodoStore.getState().completed[0].status).toBe('COMPLETED');
    });
  });

  describe('deleteTodo', () => {
    it('should remove the todo from all lists', async () => {
      useTodoStore.setState({ actionRequired: [mockTodo] });
      mockedApi.delete.mockResolvedValueOnce({});

      await useTodoStore.getState().deleteTodo('t1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/todos/t1');
      expect(useTodoStore.getState().actionRequired).toHaveLength(0);
    });
  });

  describe('connectThread', () => {
    it('should connect a thread and move todo from actionRequired to waiting', async () => {
      useTodoStore.setState({ actionRequired: [mockTodo] });
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await useTodoStore.getState().connectThread('t1', 'u2', 'Please handle this');

      expect(mockedApi.post).toHaveBeenCalledWith('/todos/t1/connect', {
        toUserId: 'u2',
        message: 'Please handle this',
      });
      expect(useTodoStore.getState().actionRequired).toHaveLength(0);
      expect(useTodoStore.getState().waiting).toHaveLength(1);
    });
  });

  describe('resolveThread', () => {
    it('should resolve a thread link and remove from actionRequired', async () => {
      const todoWithLink = {
        ...mockTodo,
        threadLinks: [
          { id: 'tl1', fromUser: mockUser, toUser: { id: 'u2', name: 'Bob' }, status: 'PENDING', chainIndex: 0, createdAt: '2026-01-01T00:00:00Z' },
        ],
      };
      useTodoStore.setState({ actionRequired: [todoWithLink] });
      // Mock resolve call
      mockedApi.post.mockResolvedValueOnce({});
      // Mock refetch call
      mockedApi.get.mockResolvedValueOnce({ data: { actionRequired: [], waiting: [], completed: [todoWithLink] } });

      await useTodoStore.getState().resolveThread('tl1');

      expect(mockedApi.post).toHaveBeenCalledWith('/thread-links/tl1/resolve');
    });

    it('should keep todos without the resolved link', async () => {
      const todo1 = {
        ...mockTodo,
        threadLinks: [
          { id: 'tl1', fromUser: mockUser, toUser: { id: 'u2', name: 'Bob' }, status: 'PENDING', chainIndex: 0, createdAt: '2026-01-01T00:00:00Z' },
        ],
      };
      const todo2 = { ...mockTodo, id: 't2', title: 'Other Todo', threadLinks: [] };
      useTodoStore.setState({ actionRequired: [todo1, todo2] });
      mockedApi.post.mockResolvedValueOnce({});
      // Mock refetch
      mockedApi.get.mockResolvedValueOnce({ data: { actionRequired: [todo2], waiting: [], completed: [todo1] } });

      await useTodoStore.getState().resolveThread('tl1');

      // After refetch, authoritative state applies
      const state = useTodoStore.getState();
      expect(state.actionRequired).toHaveLength(1);
      expect(state.actionRequired[0].id).toBe('t2');
      expect(state.completed).toHaveLength(1);
      expect(state.completed[0].id).toBe('t1');
    });
  });
});
