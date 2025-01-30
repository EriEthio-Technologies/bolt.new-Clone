import { AIServiceError } from '~/errors/AIServiceError';

interface AnalysisResult {
  complexity: number;
  maintainability: number;
  suggestions: string[];
}

class CodeAnalysisService {
  async analyzeCode(code: string): Promise<AnalysisResult> {
    try {
      // Basic analysis implementation
      const complexity = this.calculateComplexity(code);
      const maintainability = this.calculateMaintainability(code);
      const suggestions = this.generateSuggestions(code);

      return {
        complexity,
        maintainability,
        suggestions
      };
    } catch (error) {
      throw new AIServiceError('Failed to analyze code', error as Error);
    }
  }

  private calculateComplexity(code: string): number {
    // Simple complexity calculation based on code length and structure
    const lines = code.split('\n').length;
    const conditionals = (code.match(/if|else|switch|case|for|while/g) || []).length;
    return Math.min(10, Math.ceil((lines + conditionals * 2) / 10));
  }

  private calculateMaintainability(code: string): number {
    // Simple maintainability calculation
    const comments = (code.match(/\/\/|\/\*|\*\//g) || []).length;
    const codeLength = code.length;
    return Math.min(10, Math.ceil((comments * 100 / codeLength) + 5));
  }

  private generateSuggestions(code: string): string[] {
    const suggestions: string[] = [];

    // Basic code quality checks
    if (code.length > 1000) {
      suggestions.push('Consider breaking down the code into smaller functions');
    }
    if ((code.match(/console\.log/g) || []).length > 3) {
      suggestions.push('Remove unnecessary console.log statements');
    }
    if ((code.match(/TODO|FIXME/g) || []).length > 0) {
      suggestions.push('Address TODO and FIXME comments');
    }

    return suggestions;
  }
}

export const codeAnalysisService = new CodeAnalysisService(); 