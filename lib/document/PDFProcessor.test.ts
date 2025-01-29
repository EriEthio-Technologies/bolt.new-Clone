import { describe, it, expect, beforeEach } from 'vitest';
import { PDFProcessor } from './PDFProcessor';
import * as pdf from 'pdf-parse';
import { Buffer } from 'buffer';

describe('PDFProcessor', () => {
  let processor: PDFProcessor;

  beforeEach(() => {
    processor = new PDFProcessor();
  });

  it('should successfully process a valid PDF', async () => {
    const mockPdfData = {
      text: 'Sample PDF content',
      numpages: 2,
      info: {
        Title: 'Test Document',
        Author: 'Test Author',
        CreationDate: '2023-01-01',
        Keywords: 'test, pdf, document'
      }
    };

    vi.spyOn(pdf, 'default').mockResolvedValueOnce(mockPdfData);

    const buffer = Buffer.from('mock pdf content');
    const result = await processor.processPDF(buffer);

    expect(result).toEqual({
      content: 'Sample PDF content',
      metadata: {
        pageCount: 2,
        title: 'Test Document',
        author: 'Test Author',
        creationDate: new Date('2023-01-01'),
        keywords: ['test', 'pdf', 'document']
      }
    });
  });

  it('should handle invalid PDF data', async () => {
    vi.spyOn(pdf, 'default').mockRejectedValueOnce(new Error('Invalid PDF'));

    const buffer = Buffer.from('invalid pdf content');
    await expect(processor.processPDF(buffer)).rejects.toThrow('Failed to process PDF: Invalid PDF');
  });

  it('should extract metadata correctly with missing fields', async () => {
    const mockPdfData = {
      text: 'Sample content',
      numpages: 1,
      info: {}
    };

    vi.spyOn(pdf, 'default').mockResolvedValueOnce(mockPdfData);

    const buffer = Buffer.from('mock pdf content');
    const result = await processor.processPDF(buffer);

    expect(result).toEqual({
      content: 'Sample content',
      metadata: {
        pageCount: 1,
        title: undefined,
        author: undefined,
        creationDate: undefined,
        keywords: undefined
      }
    });
  });
});