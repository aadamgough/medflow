import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { generateEmbeddings } from './embedding.service';
import { Prisma } from '@prisma/client';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;

export interface ChunkResult {
  documentId: string;
  chunks: {
    content: string;
    position: number;
    tokenCount: number;
    embedding: number[];
  }[];
}

function extractTextFromData(extractedData: unknown): string {
  if (!extractedData || typeof extractedData !== 'object') {
    return JSON.stringify(extractedData);
  }

  const data = extractedData as Record<string, unknown>;
  const textParts: string[] = [];

  const extractValues = (obj: unknown, prefix = ''): void => {
    if (obj === null || obj === undefined) return;
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      if (prefix) {
        textParts.push(`${prefix}: ${obj}`);
      }
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => extractValues(item, `${prefix}[${index}]`));
      return;
    }
    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        extractValues(value, newPrefix);
      }
    }
  };

  extractValues(data);
  return textParts.join('\n');
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  if (text.length <= chunkSize) {
    return text ? [text] : [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    if (start > 0) {
      start = start - overlap;
    }
    
    if (end > text.length) {
      end = text.length;
    }

    let chunk = text.slice(start, end);
    
    const lastNewline = chunk.lastIndexOf('\n');
    const lastComma = chunk.lastIndexOf(', ');
    const lastSpace = chunk.lastIndexOf(' ');
    
    const breakPoint = Math.max(lastNewline, lastComma, lastSpace);
    
    if (breakPoint > chunk.length * 0.5 && end < text.length) {
      chunk = chunk.slice(0, breakPoint);
    }

    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }

    start = end;
  }

  return chunks;
}

export async function createDocumentChunks(
  documentId: string,
  extractedData: unknown
): Promise<ChunkResult> {
  const text = extractTextFromData(extractedData);
  
  if (!text.trim()) {
    logger.warn('No text content to chunk', { documentId });
    return { documentId, chunks: [] };
  }

  const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
  
  logger.info('Created text chunks', { 
    documentId, 
    chunkCount: chunks.length,
    totalTextLength: text.length 
  });

  if (chunks.length === 0) {
    return { documentId, chunks: [] };
  }

  const embeddings = await generateEmbeddings(chunks);

  const chunkData = chunks.map((content, index) => ({
    content,
    position: index,
    tokenCount: estimateTokens(content),
    embedding: embeddings[index],
  }));

  await prisma.documentChunk.deleteMany({
    where: { documentId },
  });

  for (const chunk of chunkData) {
    const id = crypto.randomUUID();
    const embeddingStr = `[${chunk.embedding.join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO "document_chunks" (id, "documentId", content, position, "tokenCount", embedding)
      VALUES (${id}, ${documentId}, ${chunk.content}, ${chunk.position}, ${chunk.tokenCount}, ${embeddingStr}::vector)
    `;
  }

  logger.info('Saved document chunks with embeddings', { 
    documentId, 
    chunkCount: chunkData.length 
  });

  return {
    documentId,
    chunks: chunkData,
  };
}

export async function searchDocumentChunks(
  documentId: string,
  query: string,
  topK: number = 5
): Promise<{ content: string; tokenCount: number }[]> {
  const { generateEmbedding } = await import('./embedding.service');
  
  const queryEmbedding = await generateEmbedding(query);

  const chunks = await prisma.$queryRaw<{
    id: string;
    content: string;
    position: number;
    token_count: number;
    similarity: number;
  }[]>`
    SELECT 
      id,
      content,
      position,
      "tokenCount" as token_count,
      1 - ("embedding" <=> ${queryEmbedding}::vector) as similarity
    FROM "document_chunks"
    WHERE "documentId" = ${documentId}
    ORDER BY "embedding" <=> ${queryEmbedding}::vector
    LIMIT ${topK}
  `;

  logger.info('Vector search completed', { 
    documentId, 
    queryLength: query.length,
    resultsCount: chunks.length 
  });

  return chunks.map((chunk) => ({
    content: chunk.content,
    tokenCount: Number(chunk.token_count),
  }));
}
