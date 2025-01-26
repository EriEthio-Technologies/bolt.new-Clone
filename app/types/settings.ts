export interface ProjectSettings {
  projectId: string;
  general: {
    name: string;
    description: string;
    version: string;
  };
  development: {
    framework: string;
    language: string;
    nodeVersion: string;
  };
  deployment: {
    platform: string;
    region: string;
    environment: string;
  };
  security: {
    authEnabled: boolean;
    apiKeyRequired: boolean;
  };
  features: {
    analytics: boolean;
    monitoring: boolean;
    logging: boolean;
  };
}

export type SettingsUpdate = Partial<ProjectSettings>;

export interface SettingsValidation {
  isValid: boolean;
  errors: string[];
}

export interface SettingsHistory {
  settings: ProjectSettings;
  version: number;
  createdAt: Date;
} 