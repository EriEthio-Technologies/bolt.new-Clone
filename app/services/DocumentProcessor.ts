import { Encryption } from '../utils/encryption';
import { validateEnv } from '~/config/env.server';
import { Buffer } from 'buffer';
import PDFParser from 'pdf2json';

const env = validateEnv();

interface ProcessedDocument {
  content: string;
  metadata: {
    pageCount: number;
    author?: string;
    creationDate?: string;
    keywords?: string[];
  };
  validationResults: ValidationResult[];
}

interface ValidationResult {
  rule: string;
  passed: boolean;
  message?: string;
}

export class DocumentProcessor {
  private static async parsePDF(buffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        resolve(pdfData);
      });
      
      pdfParser.on('pdfParser_dataError', (error: Error) => {
        reject(error);
      });
      
      pdfParser.parseBuffer(buffer);
    });
  }

  private static validateDocument(content: string): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Validate document length
    results.push({
      rule: 'minimumLength',
      passed: content.length >= 100,
      message: content.length < 100 ? 'Document content too short' : undefined
    });
    
    // Validate content structure
    results.push({
      rule: 'contentStructure',
      passed: content.includes('Introduction') || content.includes('Summary'),
      message: !content.includes('Introduction') && !content.includes('Summary') 
        ? 'Document missing required sections' 
        : undefined
    });
    
    // Check for sensitive information patterns
    const sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{16}\b/,            // Credit card
      /password:\s*\S+/i       // Passwords
    ];
    
    const hasSensitiveInfo = sensitivePatterns.some(pattern => pattern.test(content));
    results.push({
      rule: 'sensitiveInfo',
      passed: !hasSensitiveInfo,
      message: hasSensitiveInfo ? 'Document contains sensitive information' : undefined
    });
    
    return results;
  }

  static async processDocument(
    buffer: Buffer, 
    encryptResult: boolean = true
  ): Promise<ProcessedDocument> {
    try {
      const pdfData = await this.parsePDF(buffer);
      
      // Extract text content
      const content = pdfData.Pages
        .map((page: any) => page.Texts
          .map((text: any) => decodeURIComponent(text.R[0].T))
          .join(' ')
        )
        .join('\n');
      
      // Extract metadata
      const metadata = {
        pageCount: pdfData.Pages.length,
        author: pdfData.Meta?.Author,
        creationDate: pdfData.Meta?.CreationDate,
        keywords: pdfData.Meta?.Keywords?.split(',').map((k: string) => k.trim())
      };
      
      // Validate document
      const validationResults = this.validateDocument(content);
      
      // Encrypt content if requested
      const processedContent = encryptResult 
        ? Encryption.encrypt(content, env.ENCRYPTION_KEY) 
        : content;
      
      return {
        content: processedContent,
        metadata,
        validationResults
      };
    } catch (error) {
      console.error('Error processing document:', error);
      throw new Error('Failed to process document');
    }
  }
}