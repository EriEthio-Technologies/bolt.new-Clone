import { Service } from 'typedi';
import * as pdf from 'pdf-parse';
import { Buffer } from 'buffer';

export interface PDFProcessingResult {
  content: string;
  metadata: {
    pageCount: number;
    title?: string;
    author?: string;
    creationDate?: Date;
    keywords?: string[];
  };
}

@Service()
export class PDFProcessor {
  async processPDF(buffer: Buffer): Promise<PDFProcessingResult> {
    try {
      const data = await pdf(buffer);
      
      return {
        content: data.text,
        metadata: {
          pageCount: data.numpages,
          title: data.info.Title,
          author: data.info.Author,
          creationDate: data.info.CreationDate ? new Date(data.info.CreationDate) : undefined,
          keywords: data.info.Keywords?.split(',').map(k => k.trim()),
        },
      };
    } catch (error) {
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }
}