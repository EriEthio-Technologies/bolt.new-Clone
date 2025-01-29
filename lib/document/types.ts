export interface DocumentMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  creationDate?: Date;
  keywords?: string[];
}

export interface ProcessingResult {
  content: string;
  metadata: DocumentMetadata;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  metadata?: DocumentMetadata;
}

export interface ProcessingOptions {
  validateContent?: boolean;
  extractMetadata?: boolean;
  maxSizeBytes?: number;
  allowedTypes?: string[];
}