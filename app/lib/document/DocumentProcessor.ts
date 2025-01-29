import { Service } from 'typedi';
import * as pdf from 'pdf-parse';
import { Encryption } from '../security/encryption';

import { ProcessingResult, ValidationResult, ProcessingOptions, DocumentMetadata } from './types';
import { PDFProcessor } from './PDFProcessor';

@Service()
export class DocumentProcessor {
  constructor(
    private encryption: Encryption,
    private pdfProcessor: PDFProcessor
  ) {}

  async processDocument(
    buffer: Buffer, 
    type: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const validationResult = await this.validateDocument(buffer, type, options);
    
    if (!validationResult.isValid) {
      throw new Error(`Document validation failed: ${validationResult.errors.join(', ')}`);
    }

    let result: ProcessingResult;

    switch (type.toLowerCase()) {
      case 'pdf':
        const pdfResult = await this.pdfProcessor.processPDF(buffer);
        result = {
          content: pdfResult.content,
          metadata: pdfResult.metadata
        };
        break;
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }

    if (options.validateContent && !result.content) {
      throw new Error('Document processing failed: No content extracted');
    }

    // Encrypt content if needed
    if (result.content) {
      result.content = await this.encryption.encrypt(result.content);
    }

    return result;
  }

  async validateDocument(
    buffer: Buffer, 
    type: string,
    options: ProcessingOptions = {}
  ): Promise<ValidationResult> {
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