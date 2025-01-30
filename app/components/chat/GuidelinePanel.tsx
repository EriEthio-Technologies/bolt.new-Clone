import React from 'react';

export const GuidelinePanel: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
      <h2 className="text-lg font-semibold">Guidelines</h2>
      <ul className="list-disc list-inside space-y-2">
        <li>Be clear and specific in your requests</li>
        <li>Provide context when needed</li>
        <li>Use code blocks for code snippets</li>
        <li>Ask follow-up questions if needed</li>
        <li>Report any issues or bugs</li>
      </ul>
      <div className="mt-4 text-sm text-gray-600">
        For more information, please refer to the documentation.
      </div>
    </div>
  );
}; 