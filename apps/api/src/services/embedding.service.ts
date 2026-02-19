import OpenAI from 'openai';
import { logger } from '../utils/logger';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export function isEmbeddingConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI');
    }

    logger.info('Generated embedding', { textLength: text.length, dimensions: embedding.length });
    return embedding;
  } catch (error) {
    logger.error('Failed to generate embedding', error);
    throw new Error('Failed to generate embedding');
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);

    logger.info('Generated embeddings', { count: texts.length });
    return embeddings;
  } catch (error) {
    logger.error('Failed to generate embeddings', error);
    throw new Error('Failed to generate embeddings');
  }
}

export function embeddingToVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export function validateEmbedding(embedding: number[]): boolean {
  return embedding.length === EMBEDDING_DIMENSIONS;
}
