import pgPromise from 'pg-promise';
import { DatabaseError } from './errors/DatabaseError';

const pgp = pgPromise();

const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const db = pgp(config);

// Add some helper methods
export const transaction = db.tx;
export const task = db.task;

export default {
  ...db,
  async saveDocument(document: any, content: string, metadata: any) {
    try {
      return await db.tx(async t => {
        const doc = await t.one(`
          INSERT INTO documents (
            project_id, file_name, file_type, file_size, content_hash, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          ) RETURNING id
        `, [
          document.projectId,
          document.fileName,
          document.fileType,
          document.fileSize,
          document.contentHash,
          'processed'
        ]);

        await t.none(`
          INSERT INTO document_metadata (
            document_id, title, author, page_count, creation_date, keywords, metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
          )
        `, [
          doc.id,
          metadata.title,
          metadata.author,
          metadata.pageCount,
          metadata.creationDate,
          metadata.keywords,
          metadata
        ]);

        await t.none(`
          INSERT INTO document_content (
            document_id, content, encrypted
          ) VALUES (
            $1, $2, $3
          )
        `, [
          doc.id,
          content,
          true
        ]);

        return doc.id;
      });
    } catch (error) {
      throw new DatabaseError(`Failed to save document: ${error.message}`);
    }
  },

  async deleteDocument(id: string) {
    return await db.none(`
      UPDATE documents
      SET deleted_at = NOW()
      WHERE id = $1
    `, [id]);
  }
};