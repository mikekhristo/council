import fs from 'fs/promises';
import path from 'path';

/**
 * Extract text content from a file based on its MIME type.
 * Supports plain text, PDF (via pdf-parse), and DOCX (via mammoth).
 */
export async function extractText(
  filePath: string,
  mimeType: string,
): Promise<string> {
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml'
  ) {
    return extractPlainText(filePath);
  }

  if (mimeType === 'application/pdf') {
    return extractPdfText(filePath);
  }

  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return extractDocxText(filePath);
  }

  return `[Unsupported file type: ${mimeType}. File: ${path.basename(filePath)}]`;
}

async function extractPlainText(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('utf-8');
}

async function extractPdfText(filePath: string): Promise<string> {
  try {
    // pdf-parse v2 uses a class-based API
    const { PDFParse } = await import('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[Failed to extract PDF text: ${message}]`;
  }
}

async function extractDocxText(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[Failed to extract DOCX text: ${message}]`;
  }
}
