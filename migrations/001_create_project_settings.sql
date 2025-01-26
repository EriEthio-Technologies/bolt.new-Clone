CREATE TABLE project_settings (
  project_id VARCHAR(50) PRIMARY KEY,
  settings JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE project_settings_history (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  settings JSONB NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES project_settings(project_id)
);

CREATE INDEX idx_project_settings_history_project_id ON project_settings_history(project_id);
CREATE INDEX idx_project_settings_history_version ON project_settings_history(version); 