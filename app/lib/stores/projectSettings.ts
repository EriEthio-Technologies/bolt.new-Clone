import { map } from 'nanostores';
import { db } from '../persistence/db';

export interface ProjectSettings {
  guidelines: string[];
  context: string;
  aiModel: string;
  collaborators: string[];
  codeReviewSettings: {
    autoReview: boolean;
    minReviewers: number;
  };
}

export const projectSettingsStore = map<ProjectSettings>({
  guidelines: [],
  context: '',
  aiModel: 'claude-3-sonnet',
  collaborators: [],
  codeReviewSettings: {
    autoReview: true,
    minReviewers: 1
  }
});

export async function saveProjectSettings(settings: Partial<ProjectSettings>) {
  await db.projectSettings.put(settings);
  projectSettingsStore.set({
    ...projectSettingsStore.get(),
    ...settings
  });
} 