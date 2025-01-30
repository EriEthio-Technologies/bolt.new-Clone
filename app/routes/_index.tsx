import type { MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Gobeze AI' },
    { name: 'description', content: 'Welcome to Gobeze AI' },
  ];
};

export default function Index() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to Gobeze AI</h1>
      <p className="mb-4">
        This is your AI-powered development environment.
      </p>
      <div className="flex gap-4">
        <Link
          to="/chat"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Start Chatting
        </Link>
        <Link
          to="/docs"
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          View Documentation
        </Link>
      </div>
    </div>
  );
}
