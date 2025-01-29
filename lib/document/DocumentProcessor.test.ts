import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentProcessor } from './DocumentProcessor';
import { PDFProcessor } from './PDFProcessor';
import { Encryption } from '../security/encryption';
import { Buffer } from 'buffer';

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;
  let pdfProcessor: PDFProcessor;
  let encryption: Encryption;

  beforeEach(() => {
    pdfProcessor = new PDFProcessor();
    encryption = {
      encrypt: vi.fn().mockResolvedValue('encrypted-content')
    } as any;
    processor = new DocumentProcessor(encryption, pdfProcessor);
  });

  describe('processDocument', () => {
    it('should successfully process a PDF document', async () => {
      const buffer = Buffer.from('test pdf content');
      const mockPdfResult = {
        content: 'test content',
        metadata: {
          pageCount: 1,
          title: 'Test Doc',
          author: 'Test Author'
        }
      };

      vi.spyOn(pdfProcessor, 'processPDF').mockResolvedValueOnce(mockPdfResult);

      const result = await processor.processDocument(buffer, 'application/pdf');

      expect(result).toEqual({
        content: 'encrypted-content',
        metadata: mockPdfResult.metadata
      });
    });

    it('should fail for unsupported document types', async () => {
      const buffer = Buffer.from('test content');
      await expect(processor.processDocument(buffer, 'text/plain')).rejects.toThrow('Unsupported document type');
    });

    it('should validate file size when maxSizeBytes option is provided', async () => {
      const buffer = Buffer.from('large content');
      await expect(
        processor.processDocument(buffer, 'application/pdf', { maxSizeBytes: 5 })
      ).rejects.toThrow('File size exceeds maximum allowed size');
    });
  });
});