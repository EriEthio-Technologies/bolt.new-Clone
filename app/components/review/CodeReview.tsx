import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { projectSettingsStore } from '~/lib/stores/projectSettings';
import { codeAnalysisService } from '~/lib/services/codeAnalysis';

export function CodeReview() {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<CodeAnalysisResult[]>([]);
  const settings = useStore(projectSettingsStore);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const analysisResults = await codeAnalysisService.analyzeCode({
        autoReview: settings.codeReviewSettings.autoReview,
        minReviewers: settings.codeReviewSettings.minReviewers
      });
      setResults(analysisResults);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Code Review</h2>
      <button
        onClick={runAnalysis}
        disabled={analyzing}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Run Analysis
      </button>

      <div className="mt-4 space-y-4">
        {results.map((result, index) => (
          <div key={index} className="p-4 border rounded">
            <h3 className="font-semibold">{result.title}</h3>
            <p className="text-gray-600">{result.description}</p>
            <div className="mt-2">
              {result.suggestions.map((suggestion, idx) => (
                <div key={idx} className="text-sm text-gray-500">
                  • {suggestion}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 