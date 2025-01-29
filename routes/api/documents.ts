import { type ActionFunctionArgs, json, unstable_parseMultipartFormData } from '@remix-run/node';
import { Container } from 'typedi';
import { DocumentProcessor } from '~/lib/document/DocumentProcessor';
import { validateDocumentUploadRequest } from '~/utils/validation';
import { DocumentError } from '~/errors/DocumentError';
import { rateLimitMiddleware } from '~/middleware/rateLimit';
import { authMiddleware } from '~/middleware/auth';

import { LoaderFunctionArgs } from '@remix-run/node';
import { db } from '~/lib/db.server';

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  await authMiddleware(request, context);

  const url = new URL(request.url);
  const documentId = url.searchParams.get('id');

  if (documentId) {
    const document = await db.one(`
      SELECT d.*, dm.*, dc.content, dc.encrypted
      FROM documents d
      LEFT JOIN document_metadata dm ON d.id = dm.document_id
      LEFT JOIN document_content dc ON d.id = dc.document_id
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `, [documentId]);

    if (!document) {
      return json({ error: 'Document not found' }, { status: 404 });
    }

    return json({ document });
  }

  // List documents
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  const documents = await db.many(`
    SELECT d.*, dm.title, dm.author, dm.page_count
    FROM documents d
    LEFT JOIN document_metadata dm ON d.id = dm.document_id
    WHERE d.project_id = $1 AND d.deleted_at IS NULL
    ORDER BY d.created_at DESC
  `, [projectId]);

  return json({ documents });
}

export async function action({ request, context }: ActionFunctionArgs) {
  // Apply middleware
  await rateLimitMiddleware(request, context);
  await authMiddleware(request, context);

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await unstable_parseMultipartFormData(request, async ({ data, filename, contentType }) => {
      // Basic validation
      if (!filename || !contentType) {
        throw new DocumentError('Invalid file upload');
      }

      return {
        filename,
        contentType,
        data: Buffer.from(await data),
      };
    });

    const documentProcessor = Container.get(DocumentProcessor);
    const file = formData.get('file') as any;

    if (!file || !file.data) {
      throw new DocumentError('No file provided');
    }

    const result = await documentProcessor.processDocument(file.data, file.contentType, {
      validateContent: true,
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf']
    });

    // Save to database
    const documentId = await db.saveDocument({
      projectId: context.project.id,
      fileName: file.filename,
      fileType: file.contentType,
      fileSize: file.data.length,
      contentHash: await calculateHash(file.data)
    }, result.content, result.metadata);

    return json({ success: true, documentId, result });
  } catch (error) {
    if (error instanceof DocumentError) {
      return json({ error: error.message }, { status: 400 });
    }
    if (error instanceof DatabaseError) {
      return json({ error: 'Failed to save document' }, { status: 500 });
    }
    throw error;
  }
}