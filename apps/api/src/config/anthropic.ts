import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

export const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

export function validateAnthropicConfig(): boolean {
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn('Anthropic API key not configured. Anthropic chat will not be available.');
    return false;
  }
  
  logger.info('Anthropic configuration validated', {
    model: ANTHROPIC_MODEL,
  });
  
  return true;
}

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.');
  }
  return anthropicClient;
}
