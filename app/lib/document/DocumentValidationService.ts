import { Service } from 'typedi';
import { DocumentProcessor } from './DocumentProcessor';
import { SecurityAuditService } from '../security/SecurityAuditService';

export interface ValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  validateContent?: boolean;
  scanForMalware?: boolean;
}

const DEFAULT_OPTIONS: ValidationOptions = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['pdf', 'docx'],
  validateContent: true,
  scanForMalware: true
};

@Service()
export class DocumentValidationService {
  constructor(
    private documentProcessor: DocumentProcessor,
    private securityAudit: SecurityAuditService
  ) {}

  async validateDocument(
    buffer: Buffer,
    type: string,
    options: ValidationOptions = {}
  ): Promise<{ 
    valid: boolean; 
    errors: string[]; 
    metadata?: any;
  }> {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];

    // Check file size
    if (buffer.length > finalOptions.maxSizeBytes) {
      errors.push(`File size exceeds maximum allowed size of ${finalOptions.maxSizeBytes} bytes`);
    }

    // Check file type
    if (!finalOptions.allowedTypes.includes(type.toLowerCase())) {
      errors.push(`File type '${type}' is not allowed. Allowed types: ${finalOptions.allowedTypes.join(', ')}`);
    }

    // Security scan if enabled
    if (finalOptions.scanForMalware) {
      const securityScan = await this.securityAudit.runSecurityScan();
      if (securityScan.overallRisk === 'high') {
        errors.push('Security scan detected potential risks in the document');
      }
    }

    // Process and validate document content
    if (finalOptions.validateContent && errors.length === 0) {
      const processResult = await this.documentProcessor.validateDocument(buffer, type);
      if (!processResult.isValid) {
        errors.push(...processResult.errors);
      }
      
      return {
        valid: errors.length === 0,
        errors,
        metadata: processResult.metadata
      };
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}