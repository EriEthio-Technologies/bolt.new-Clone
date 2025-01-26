export interface DependencyAnalysis {
  graph: {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
  };
  circularDependencies: CircularDependency[];
  metrics: DependencyMetrics;
  clusters: Array<{
    name: string;
    files: string[];
    cohesion: number;
  }>;
  timestamp: Date;
}

export interface DependencyNode {
  id: string;
  type: 'entity' | 'service' | 'util' | 'test' | 'config';
  imports: number;
  exports: number;
  size: number;
  complexity: number;
  stability: number;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: 'import' | 'extend' | 'implement' | 'use';
  weight: number;
}

export interface CircularDependency {
  files: string[];
  length: number;
  impact: number;
}

export interface DependencyMetrics {
  totalFiles: number;
  totalDependencies: number;
  averageDependencies: number;
  maxDependencies: number;
  dependencyCohesion: number;
  dependencyStability: number;
  clusters: number;
  circularDependencies: number;
} 