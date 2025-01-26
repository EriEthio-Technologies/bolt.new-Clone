export interface DomainContext {
  entities: EntityDefinition[];
  services: ServiceDefinition[];
  dependencies: DependencyGraph;
  metadata: ContextMetadata;
  timestamp: Date;
}

export interface EntityDefinition {
  name: string;
  type: 'interface' | 'class';
  properties: Array<{
    name: string;
    type: string;
    optional: boolean;
    documentation: string;
  }>;
  relations: Array<{
    type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
    target: string;
    propertyName: string;
    isOptional: boolean;
  }>;
  documentation: string;
  file: string;
  metadata: {
    isAbstract: boolean;
    decorators: Array<{
      name: string;
      arguments: any[];
    }>;
  };
}

export interface ServiceDefinition {
  name: string;
  methods: Array<{
    name: string;
    returnType: string;
    parameters: Array<{
      name: string;
      type: string;
      optional: boolean;
    }>;
    documentation: string;
    isAsync: boolean;
    visibility: 'public' | 'private' | 'protected';
  }>;
  dependencies: Array<{
    service: string;
    type: 'required' | 'optional';
  }>;
  documentation: string;
  file: string;
  metadata: {
    isAsync: boolean;
    hasTests: boolean;
    metrics: {
      complexity: number;
      coverage: number;
      dependencies: number;
    };
  };
}

export interface DependencyGraph {
  nodes: Map<string, {
    imports: Array<{
      name: string;
      path: string;
      type: 'type' | 'value' | 'namespace';
    }>;
    exports: Array<{
      name: string;
      type: 'type' | 'value' | 'namespace';
    }>;
    type: 'entity' | 'service' | 'util' | 'test' | 'config';
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: 'import' | 'extend' | 'implement' | 'use';
  }>;
}

export interface ContextMetadata {
  totalFiles: number;
  totalLines: number;
  fileTypes: Record<string, number>;
  complexity: {
    average: number;
    highest: number;
    distribution: Record<string, number>;
  };
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  lastUpdated: Date;
  version: string;
}

export interface ContextChange {
  type: 'entity' | 'service' | 'dependency';
  action: 'added' | 'modified' | 'removed' | 'dependencies_changed';
  name: string;
  file?: string;
  details: any;
  git?: {
    commit: string;
    author: string;
    email: string;
    timestamp: Date;
    message: string;
  };
}

export interface ContextVersion {
  version: string;
  timestamp: Date;
  changes: number;
  significant: boolean;
}

export interface ContextDiff {
  from: string;
  to: string;
  timestamp: Date;
  changes: ContextChange[];
}

export interface ContextSnapshot {
  context: DomainContext;
  changes: ContextChange[];
  timestamp: Date;
  version: string;
} 