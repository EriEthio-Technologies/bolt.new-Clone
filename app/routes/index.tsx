import { lazy, Suspense } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

const CodeEditor = lazy(() => import('../components/editor/CodeEditor'));
const Preview = lazy(() => import('../components/workbench/Preview'));

export default function Workbench() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CodeEditor />
      <Preview />
    </Suspense>
  );
} 