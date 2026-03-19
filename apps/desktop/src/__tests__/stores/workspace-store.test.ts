import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorkspaceStore } from '@/stores/workspace-store';

vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '@/lib/api-client';

const mockedApi = vi.mocked(api);

const mockWorkspace = {
  id: 'ws1',
  name: 'Test Workspace',
  slug: 'test-workspace',
  _count: { members: 3 },
};

describe('workspace-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      workspaces: [],
      currentWorkspace: null,
      isLoading: true,
    });
  });

  describe('initial state', () => {
    it('should start with empty workspaces, no current workspace, loading true', () => {
      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toEqual([]);
      expect(state.currentWorkspace).toBeNull();
      expect(state.isLoading).toBe(true);
    });
  });

  describe('fetchWorkspaces', () => {
    it('should fetch workspaces and auto-select the first one', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockWorkspace] });

      await useWorkspaceStore.getState().fetchWorkspaces();

      expect(mockedApi.get).toHaveBeenCalledWith('/workspaces');
      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toEqual([mockWorkspace]);
      expect(state.currentWorkspace).toEqual(mockWorkspace);
      expect(state.isLoading).toBe(false);
    });

    it('should not override currentWorkspace if already set', async () => {
      const existing = { id: 'ws0', name: 'Existing', slug: 'existing' };
      useWorkspaceStore.setState({ currentWorkspace: existing });
      mockedApi.get.mockResolvedValueOnce({ data: [mockWorkspace] });

      await useWorkspaceStore.getState().fetchWorkspaces();

      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspace).toEqual(existing);
    });

    it('should not set current workspace when list is empty', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await useWorkspaceStore.getState().fetchWorkspaces();

      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspace).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should stop loading on error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('fail'));

      await useWorkspaceStore.getState().fetchWorkspaces();

      expect(useWorkspaceStore.getState().isLoading).toBe(false);
    });
  });

  describe('setCurrentWorkspace', () => {
    it('should set the current workspace', () => {
      useWorkspaceStore.getState().setCurrentWorkspace(mockWorkspace);

      expect(useWorkspaceStore.getState().currentWorkspace).toEqual(mockWorkspace);
    });
  });

  describe('createWorkspace', () => {
    it('should create workspace, add to list, and set as current', async () => {
      const newWs = { id: 'ws2', name: 'New WS', slug: 'new-ws' };
      mockedApi.post.mockResolvedValueOnce({ data: newWs });

      const result = await useWorkspaceStore.getState().createWorkspace('New WS', 'new-ws');

      expect(mockedApi.post).toHaveBeenCalledWith('/workspaces', { name: 'New WS', slug: 'new-ws' });
      expect(result).toEqual(newWs);

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toContainEqual(newWs);
      expect(state.currentWorkspace).toEqual(newWs);
    });
  });
});
