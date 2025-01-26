export interface CodeAnalysisResult {
  title: string;
  description: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high';
  location?: {
    file: string;
    line: number;
    column: number;
  };
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface CodeChange {
  userId: string;
  fileId: string;
  changes: {
    from: number;
    to: number;
    text: string;
  }[];
  timestamp: number;
}

export interface Comment {
  id: string;
  userId: string;
  fileId: string;
  line: number;
  text: string;
  timestamp: number;
  replies?: Comment[];
} 