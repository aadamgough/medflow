import { PrismaClient } from '@prisma/client';
import { generateEmbeddings } from '../src/services/embedding.service';

const logger = {
  info: (msg: string, meta?: object) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg: string, meta?: object) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg: string, meta?: object) => console.error(`[ERROR] ${msg}`, meta || ''),
};

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;

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

async function chunkDocument(prisma: PrismaClient, documentId: string, extractedData: unknown): Promise<void> {
  const text = extractTextFromData(extractedData);
  
  if (!text.trim()) {
    logger.warn('No text content to chunk', { documentId });
    return;
  }

  const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
  
  logger.info('Created text chunks', { 
    documentId, 
    chunkCount: chunks.length,
    totalTextLength: text.length 
  });

  if (chunks.length === 0) {
    return;
  }

  const embeddings = await generateEmbeddings(chunks);

  await prisma.$executeRaw`DELETE FROM "document_chunks" WHERE "documentId" = ${documentId}`;

  for (let i = 0; i < chunks.length; i++) {
    const id = crypto.randomUUID();
    const embeddingStr = `[${embeddings[i].join(',')}]`;
    const tokenCount = estimateTokens(chunks[i]);
    
    await prisma.$executeRaw`
      INSERT INTO "document_chunks" (id, "documentId", content, position, "tokenCount", embedding, "createdAt")
      VALUES (${id}, ${documentId}, ${chunks[i]}, ${i}, ${tokenCount}, ${embeddingStr}::vector, NOW())
    `;
  }

  logger.info('Saved document chunks with embeddings', { 
    documentId, 
    chunkCount: chunks.length 
  });
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const documents = await prisma.document.findMany({
      where: {
        status: 'COMPLETED',
      },
      include: {
        extraction: true,
      },
    });

    logger.info(`Found ${documents.length} completed documents`);

    for (const doc of documents) {
      if (!doc.extraction) {
        logger.warn('Document has no extraction', { documentId: doc.id });
        continue;
      }

      const existingChunks = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "document_chunks" WHERE "documentId" = ${doc.id}
      `;

      if (Number(existingChunks[0]?.count || 0) > 0) {
        logger.info('Document already has chunks, skipping', { documentId: doc.id });
        continue;
      }

      try {
        await chunkDocument(prisma, doc.id, doc.extraction.extractedData);
      } catch (error) {
        logger.error('Failed to chunk document', { documentId: doc.id, error });
      }
    }

    logger.info('Chunking complete');
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { 
    console.error(e); 
    process.exit(1); 
  });
