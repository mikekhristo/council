import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { FileAttachment } from '../types';
import { extractText } from './extract';

const UPLOADS_DIR =
  process.env.COUNCIL_UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');

/**
 * Ensure the uploads directory exists.
 */
async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

/**
 * Save an uploaded file to disk and extract its text content.
 * Returns a FileAttachment object with metadata and extracted text.
 */
export async function handleFileUpload(
  file: File,
): Promise<FileAttachment> {
  await ensureUploadsDir();

  const id = nanoid();
  const ext = path.extname(file.name) || '';
  const storageName = `${id}${ext}`;
  const storagePath = path.join(UPLOADS_DIR, storageName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storagePath, buffer);

  let extractedText: string | undefined;
  try {
    extractedText = await extractText(storagePath, file.type);
  } catch {
    extractedText = undefined;
  }

  return {
    id,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    storagePath,
    extractedText,
    createdAt: new Date(),
  };
}
