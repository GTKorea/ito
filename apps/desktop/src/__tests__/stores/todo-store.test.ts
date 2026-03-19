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
    useTodoStore.setState({ todos: [], isLoading: false });
  });

  describe('initial state', () => {
    it('should start with empty todos and not loading', () => {
      const state = useTodoStore.getState();
      expect(state.todos).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchTodos', () => {
    it('should fetch todos for a workspace', async () => {
      const todos = [mockTodo];
      mockedApi.get.mockResolvedValueOnce({ data: todos });

      await useTodoStore.getState().fetchTodos('ws1');

      expect(mockedApi.get).toHaveBeenCalledWith('/workspaces/ws1/todos', {
        params: { assignedToMe: 'true' },
      });
      const state = useTodoStore.getState();
      expect(state.todos).toEqual(todos);
      expect(state.isLoading).toBe(false);
    });

    it('should pass assignedToMe=false when specified', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await useTodoStore.getState().fetchTodos('ws1', false);

      expect(mockedApi.get).toHaveBeenCalledWith('/workspaces/ws1/todos', {
        params: { assignedToMe: 'false' },
      });
    });

    it('should stop loading on error', async () => {
      useTodoStore.setState({ isLoading: true });
      mockedApi.get.mockRejectedValueOnce(new Error('Network error'));

      await useTodoStore.getState().fetchTodos('ws1');

      expect(useTodoStore.getState().isLoading).toBe(false);
    });
  });

  describe('createTodo', () => {
    it('should create a todo and prepend it to the list', async () => {
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
      expect(useTodoStore.getState().todos[0]).toEqual(newTodo);
    });
  });

  describe('updateTodo', () => {
    it('should update a todo in the list', async () => {
      useTodoStore.setState({ todos: [mockTodo] });
      const updated = { ...mockTodo, title: 'Updated' };
      mockedApi.patch.mockResolvedValueOnce({ data: updated });

      await useTodoStore.getState().updateTodo('t1', { title: 'Updated' });

      expect(mockedApi.patch).toHaveBeenCalledWith('/todos/t1', { title: 'Updated' });
      expect(useTodoStore.getState().todos[0].title).toBe('Updated');
    });
  });

  describe('deleteTodo', () => {
    it('should remove the todo from the list', async () => {
      useTodoStore.setState({ todos: [mockTodo] });
      mockedApi.delete.mockResolvedValueOnce({});

      await useTodoStore.getState().deleteTodo('t1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/todos/t1');
      expect(useTodoStore.getState().todos).toHaveLength(0);
    });
  });

  describe('connectThread', () => {
    it('should connect a thread and remove todo from local state', async () => {
      useTodoStore.setState({ todos: [mockTodo] });
      mockedApi.post.mockResolvedValueOnce({});

      await useTodoStore.getState().connectThread('t1', 'u2', 'Please handle this');

      expect(mockedApi.post).toHaveBeenCalledWith('/todos/t1/connect', {
        toUserId: 'u2',
        message: 'Please handle this',
      });
      expect(useTodoStore.getState().todos).toHaveLength(0);
    });
  });

  describe('resolveThread', () => {
    it('should resolve a thread link and update local state', async () => {
      const todoWithLink = {
        ...mockTodo,
        threadLinks: [
          { id: 'tl1', fromUser: mockUser, toUser: { id: 'u2', name: 'Bob' }, status: 'PENDING', chainIndex: 0, createdAt: '2026-01-01T00:00:00Z' },
        ],
      };
      useTodoStore.setState({ todos: [todoWithLink] });
      mockedApi.post.mockResolvedValueOnce({});

      await useTodoStore.getState().resolveThread('tl1');

      expect(mockedApi.post).toHaveBeenCalledWith('/thread-links/tl1/resolve');
      // The todo with the resolved link should be removed (snap-back)
      expect(useTodoStore.getState().todos).toHaveLength(0);
    });

    it('should keep todos without the resolved link', async () => {
      const todo1 = {
        ...mockTodo,
        threadLinks: [
          { id: 'tl1', fromUser: mockUser, toUser: { id: 'u2', name: 'Bob' }, status: 'PENDING', chainIndex: 0, createdAt: '2026-01-01T00:00:00Z' },
        ],
      };
      const todo2 = { ...mockTodo, id: 't2', title: 'Other Todo', threadLinks: [] };
      useTodoStore.setState({ todos: [todo1, todo2] });
      mockedApi.post.mockResolvedValueOnce({});

      await useTodoStore.getState().resolveThread('tl1');

      const remaining = useTodoStore.getState().todos;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('t2');
    });
  });
});
