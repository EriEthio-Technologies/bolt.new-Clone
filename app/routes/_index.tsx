import { json, type MetaFunction } from "@remix-run/node";
import { lazy, Suspense } from 'react';
import { EnhancedChat } from '~/components/chat/EnhancedChat';
import { WorkspaceImport } from '~/components/workspace/WorkspaceImport';
import { CodeReview } from '~/components/review/CodeReview';
import LoadingSpinner from '../components/LoadingSpinner';

const CodeEditor = lazy(() => import('../components/editor/CodeEditor'));
const Preview = lazy(() => import('../components/workbench/Preview'));

export const meta: MetaFunction = () => {
  return [
    { title: "Gobeze AI" },
    { name: "description", content: "Talk with Gobeze AI, your AI assistant" }
  ];
};

export const loader = () => json({});

export default function Workbench() {
  return (
    <div className="flex h-screen">
      <div className="w-1/4 border-r">
        <WorkspaceImport />
      </div>
      
      <div className="flex-1 flex flex-col">
        <Suspense fallback={<LoadingSpinner />}>
          <div className="flex-1">
            <CodeEditor />
          </div>
          <div className="h-1/2">
            <Preview />
          </div>
        </Suspense>
      </div>
      
      <div className="w-1/4 border-l">
        <EnhancedChat />
        <CodeReview />
      </div>
    </div>
  );
}
