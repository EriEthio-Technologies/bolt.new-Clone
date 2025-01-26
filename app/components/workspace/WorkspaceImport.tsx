import { useState } from 'react';
import { workspaceStore } from '~/lib/stores/workspace';

export function WorkspaceImport() {
  const [importing, setImporting] = useState(false);

  const handleVSCodeImport = async () => {
    setImporting(true);
    try {
      await workspaceStore.importVSCodeWorkspace();
    } finally {
      setImporting(false);
    }
  };

  const handleGitClone = async (url: string) => {
    setImporting(true);
    try {
      await workspaceStore.cloneRepository(url);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Import VSCode Workspace</h3>
        <button
          onClick={handleVSCodeImport}
          disabled={importing}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Import from VSCode
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Clone Repository</h3>
        <input
          type="text"
          placeholder="Repository URL"
          className="w-full p-2 border rounded"
        />
        <button
          onClick={() => handleGitClone(repoUrl)}
          disabled={importing}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Clone Repository
        </button>
      </div>
    </div>
  );
} 