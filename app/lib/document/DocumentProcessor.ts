import { Service } from 'typedi';
import * as pdf from 'pdf-parse';
import { Encryption } from '../security/encryption';

interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  metadata?: {
    pageCount?: number;
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

@Service()
export class DocumentProcessor {
  constructor(private encryption: Encryption) {}

  async processPDF(buffer: Buffer): Promise<DocumentValidationResult> {
    try {
      const pdfProcessor = new PDFProcessor();
      const result = await pdfProcessor.processPDF(buffer);
      
      return {
        isValid: true,
        errors: [],
        metadata: {
          pageCount: result.metadata.pageCount,
          title: result.metadata.title,
          author: result.metadata.author,
          creationDate: result.metadata.creationDate,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to process PDF: ${error.message}`],
      };
    }
    try {
      const data = await pdf(buffer);
      
      // Basic validation checks
      const errors: string[] = [];
      
      if (!data.text || data.text.length === 0) {
        errors.push('PDF contains no extractable text');
      }
      
      if (data.pages <= 0) {
        errors.push('Invalid page count');
      }

      // Extract and encrypt sensitive metadata
      const metadata = {
        pageCount: data.pages,
        title: data.info?.Title || undefined,
        author: this.encryption.encrypt(data.info?.Author || 'unknown'),
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined
      };

      return {
        isValid: errors.length === 0,
        errors,
        metadata
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to process PDF: ${error.message}`]
      };
    }
  }

  async validateDocument(buffer: Buffer, type: string): Promise<DocumentValidationResult> {
    if (type.toLowerCase() !== 'application/pdf') {
      return {
        isValid: false,
        errors: ['Unsupported document type. Only PDF files are supported.'],
      };
    }

    try {
      const pdfProcessor = new PDFProcessor();
      const result = await pdfProcessor.processPDF(buffer);
      
      const validationErrors: string[] = [];
      
      if (!result.content || result.content.trim().length === 0) {
        validationErrors.push('Document appears to be empty');
      }
      
      if (!result.metadata.pageCount || result.metadata.pageCount === 0) {
        validationErrors.push('Document contains no pages');
      }
      
      return {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
        metadata: {
          pageCount: result.metadata.pageCount,
          title: result.metadata.title,
          author: result.metadata.author,
          creationDate: result.metadata.creationDate,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Document validation failed: ${error.message}`],
      };
    }
    switch (type.toLowerCase()) {
      case 'pdf':
        return this.processPDF(buffer);
      
      case 'docx':
        return {
          isValid: false,
          errors: ['DOCX processing not yet implemented']
        };
      
      default:
        return {
          isValid: false,
          errors: [`Unsupported document type: ${type}`]
        };
    }
  }
}