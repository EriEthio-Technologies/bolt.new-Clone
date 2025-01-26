import { Service } from 'typedi';
import { readFile } from 'fs/promises';
import * as ts from 'typescript';
import { validateEnv } from '~/config/env.server';
import { DomainContextExtractor } from '../context/DomainContextExtractor';
import type { 
  DependencyAnalysis,
  DependencyNode,
  DependencyEdge,
  CircularDependency,
  DependencyMetrics 
} from '~/types/dependencies';

@Service()
export class FileDependencyAnalyzer {
  private readonly env: ReturnType<typeof validateEnv>;
  private readonly typeChecker: ts.TypeChecker;

  constructor(
    private readonly contextExtractor: DomainContextExtractor
  ) {
    this.env = validateEnv();
    const program = ts.createProgram(
      this.getProjectFiles(),
      { allowJs: true, checkJs: true }
    );
    this.typeChecker = program.getTypeChecker();
  }

  async analyzeDependencies(rootPath: string): Promise<DependencyAnalysis> {
    try {
      const context = await this.contextExtractor.extractContext(rootPath);
      const { nodes, edges } = context.dependencies;

      // Build dependency graph
      const graph = this.buildDependencyGraph(nodes, edges);

      // Analyze dependencies
      const [
        circularDependencies,
        metrics,
        clusters
      ] = await Promise.all([
        this.findCircularDependencies(graph),
        this.calculateMetrics(graph),
        this.identifyDependencyClusters(graph)
      ]);

      return {
        graph,
        circularDependencies,
        metrics,
        clusters,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to analyze dependencies:', error);
      throw new Error(`Dependency analysis failed: ${error.message}`);
    }
  }

  private buildDependencyGraph(
    nodes: Map<string, any>,
    edges: any[]
  ): { nodes: DependencyNode[]; edges: DependencyEdge[] } {
    const dependencyNodes: DependencyNode[] = [];
    const dependencyEdges: DependencyEdge[] = [];

    // Convert nodes
    nodes.forEach((data, file) => {
      dependencyNodes.push({
        id: file,
        type: data.type,
        imports: data.imports.length,
        exports: data.exports.length,
        size: this.calculateFileSize(file),
        complexity: this.calculateFileComplexity(file),
        stability: this.calculateStability(file, edges)
      });
    });

    // Convert edges
    edges.forEach(edge => {
      dependencyEdges.push({
        source: edge.from,
        target: edge.to,
        type: edge.type,
        weight: this.calculateDependencyWeight(edge)
      });
    });

    return { nodes: dependencyNodes, edges: dependencyEdges };
  }

  private async findCircularDependencies(
    graph: { nodes: DependencyNode[]; edges: DependencyEdge[] }
  ): Promise<CircularDependency[]> {
    const circularDeps: CircularDependency[] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    function dfs(
      node: string,
      path: string[],
      adjacencyList: Map<string, string[]>
    ) {
      if (stack.has(node)) {
        const cycle = path.slice(path.indexOf(node));
        circularDeps.push({
          files: cycle,
          length: cycle.length,
          impact: calculateCycleImpact(cycle, graph)
        });
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      stack.add(node);
      path.push(node);

      const neighbors = adjacencyList.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, path, adjacencyList);
      }

      path.pop();
      stack.delete(node);
    }

    // Build adjacency list
    const adjacencyList = new Map<string, string[]>();
    graph.edges.forEach(edge => {
      if (!adjacencyList.has(edge.source)) {
        adjacencyList.set(edge.source, []);
      }
      adjacencyList.get(edge.source)!.push(edge.target);
    });

    // Find cycles starting from each node
    graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id, [], adjacencyList);
      }
    });

    return circularDeps;
  }

  private calculateMetrics(
    graph: { nodes: DependencyNode[]; edges: DependencyEdge[] }
  ): DependencyMetrics {
    const metrics: DependencyMetrics = {
      totalFiles: graph.nodes.length,
      totalDependencies: graph.edges.length,
      averageDependencies: 0,
      maxDependencies: 0,
      dependencyCohesion: 0,
      dependencyStability: 0,
      clusters: 0,
      circularDependencies: 0
    };

    // Calculate dependency metrics
    const dependencyCounts = graph.nodes.map(node => 
      graph.edges.filter(e => e.source === node.id).length
    );

    metrics.averageDependencies = 
      dependencyCounts.reduce((a, b) => a + b, 0) / graph.nodes.length;
    metrics.maxDependencies = Math.max(...dependencyCounts);

    // Calculate cohesion
    metrics.dependencyCohesion = this.calculateCohesion(graph);

    // Calculate stability
    metrics.dependencyStability = this.calculateOverallStability(graph);

    return metrics;
  }

  private identifyDependencyClusters(
    graph: { nodes: DependencyNode[]; edges: DependencyEdge[] }
  ): Array<{ name: string; files: string[]; cohesion: number }> {
    const clusters: Array<{ name: string; files: string[]; cohesion: number }> = [];
    const visited = new Set<string>();

    function findCluster(node: string): string[] {
      if (visited.has(node)) return [];

      const cluster: string[] = [node];
      visited.add(node);

      const neighbors = graph.edges
        .filter(e => e.source === node)
        .map(e => e.target);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          cluster.push(...findCluster(neighbor));
        }
      }

      return cluster;
    }

    // Find connected components
    graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const clusterFiles = findCluster(node.id);
        if (clusterFiles.length > 1) {
          clusters.push({
            name: this.generateClusterName(clusterFiles),
            files: clusterFiles,
            cohesion: this.calculateClusterCohesion(clusterFiles, graph)
          });
        }
      }
    });

    return clusters;
  }

  private calculateFileSize(file: string): number {
    try {
      const content = ts.sys.readFile(file);
      return content ? content.length : 0;
    } catch {
      return 0;
    }
  }

  private calculateFileComplexity(file: string): number {
    try {
      const content = ts.sys.readFile(file);
      if (!content) return 0;

      const sourceFile = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      let complexity = 0;
      function visit(node: ts.Node) {
        switch (node.kind) {
          case ts.SyntaxKind.IfStatement:
          case ts.SyntaxKind.WhileStatement:
          case ts.SyntaxKind.ForStatement:
          case ts.SyntaxKind.ForInStatement:
          case ts.SyntaxKind.ForOfStatement:
          case ts.SyntaxKind.ConditionalExpression:
          case ts.SyntaxKind.CatchClause:
          case ts.SyntaxKind.SwitchCase:
            complexity++;
            break;
        }
        ts.forEachChild(node, visit);
      }
      visit(sourceFile);

      return complexity;
    } catch {
      return 0;
    }
  }

  private calculateStability(file: string, edges: any[]): number {
    const incomingDeps = edges.filter(e => e.to === file).length;
    const outgoingDeps = edges.filter(e => e.from === file).length;
    const totalDeps = incomingDeps + outgoingDeps;

    return totalDeps === 0 ? 1 : outgoingDeps / totalDeps;
  }

  private calculateDependencyWeight(edge: any): number {
    // Weight based on dependency type and usage
    const typeWeights: Record<string, number> = {
      import: 1,
      extend: 2,
      implement: 1.5,
      use: 0.5
    };

    return typeWeights[edge.type] || 1;
  }

  private calculateCohesion(
    graph: { nodes: DependencyNode[]; edges: DependencyEdge[] }
  ): number {
    const actualConnections = graph.edges.length;
    const possibleConnections = 
      (graph.nodes.length * (graph.nodes.length - 1)) / 2;

    return possibleConnections === 0 ? 
      1 : 
      actualConnections / possibleConnections;
  }

  private calculateOverallStability(
    graph: { nodes: DependencyNode[]; edges: DependencyEdge[] }
  ): number {
    const stabilities = graph.nodes.map(node => node.stability);
    return stabilities.reduce((a, b) => a + b, 0) / stabilities.length;
  }

  private calculateClusterCohesion(
    files: string[],
    graph: { nodes: DependencyNode[]; edges: DependencyEdge[] }
  ): number {
    const clusterEdges = graph.edges.filter(e => 
      files.includes(e.source) && files.includes(e.target)
    );

    const possibleConnections = (files.length * (files.length - 1)) / 2;
    return possibleConnections === 0 ? 
      1 : 
      clusterEdges.length / possibleConnections;
  }

  private generateClusterName(files: string[]): string {
    // Find common path prefix
    const paths = files.map(f => f.split('/'));
    const minLength = Math.min(...paths.map(p => p.length));
    
    let commonPrefix = [];
    for (let i = 0; i < minLength; i++) {
      const segment = paths[0][i];
      if (paths.every(p => p[i] === segment)) {
        commonPrefix.push(segment);
      } else {
        break;
      }
    }

    return commonPrefix.join('/') || 'root';
  }

  private getProjectFiles(): string[] {
    const tsconfigPath = ts.findConfigFile(
      process.cwd(),
      ts.sys.fileExists,
      'tsconfig.json'
    );

    if (!tsconfigPath) {
      throw new Error('Could not find tsconfig.json');
    }

    const { config } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const { fileNames } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      process.cwd()
    );

    return fileNames;
  }
} 