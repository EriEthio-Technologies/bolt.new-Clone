import { map } from 'nanostores';

interface WorkspaceState {
  path: string;
  files: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  path: '',
  files: [],
  isLoading: false,
  error: null
};

export const workspaceStore = map<WorkspaceState>(initialState);

export const workspaceActions = {
  setPath: (path: string) => {
    workspaceStore.setKey('path', path);
  },

  setFiles: (files: string[]) => {
    workspaceStore.setKey('files', files);
  },

  setLoading: (isLoading: boolean) => {
    workspaceStore.setKey('isLoading', isLoading);
  },

  setError: (error: string | null) => {
    workspaceStore.setKey('error', error);
  },

  async loadWorkspace(path: string) {
    workspaceActions.setLoading(true);
    workspaceActions.setError(null);

    try {
      workspaceActions.setPath(path);
      // Here you would typically load files from the filesystem
      // For now, we'll just simulate it
      const files = ['package.json', 'README.md', 'src/index.ts'];
      workspaceActions.setFiles(files);
    } catch (error) {
      workspaceActions.setError(error instanceof Error ? error.message : 'Failed to load workspace');
    } finally {
      workspaceActions.setLoading(false);
    }
  }
}; 