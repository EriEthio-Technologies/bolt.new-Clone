export interface VersionDiff {
  entities: {
    added: any[];
    modified: any[];
    removed: any[];
  };
  services: {
    added: any[];
    modified: any[];
    removed: any[];
  };
  dependencies: {
    added: any[];
    removed: any[];
  };
}

export interface VersionMetadata {
  branches: Record<string, string | null>;
  tags: Record<string, string>;
  lastUpdated: Date;
}

export interface VersionBranch {
  name: string;
  head: string;
  base: string;
  created: Date;
  author: string;
}

export interface ContextVersion {
  version: string;
  branch: string;
  timestamp: Date;
  context: DomainContext;
  diff: VersionDiff | null;
  metadata: {
    author: string;
    message: string;
    tags: string[];
    parent: string | null;
  };
}

export interface VersionMergeResult {
  success: boolean;
  version: string;
  conflicts: string[];
} 