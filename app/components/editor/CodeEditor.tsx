import React from 'react';
import { useStore } from '@nanostores/react';
import { editorStore } from '~/lib/stores/editor';

const CodeEditor: React.FC = () => {
  const editor = useStore(editorStore);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-auto">
          <pre className="p-4 font-mono text-sm">
            {editor.content}
          </pre>
        </div>
      </div>
      <div className="border-t border-gray-200 p-2 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {editor.language} • {editor.path}
        </div>
        <div className="flex gap-2">
          <button 
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => editor.save()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor; 