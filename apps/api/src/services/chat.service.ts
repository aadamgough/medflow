import { z } from 'zod';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.mjs';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { MessageRole } from '@prisma/client';
import { getMistralClient } from '../config/mistral';
import { getAnthropicClient, ANTHROPIC_MODEL } from '../config/anthropic';
import { searchDocumentChunks } from './chunking.service';

const sendMessageSchema = z.object({
  documentId: z.string().cuid('Invalid document ID'),
  message: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long'),
});

const MAX_CONTEXT_TOKENS = 12000;
const TOP_K_CHUNKS = 5;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatChatHistory(messages: { role: MessageRole; content: string }[]): string {
  return messages
    .map((msg) => {
      const role = msg.role === 'USER' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    })
    .join('\n\n');
}

export class ChatService {
  async createOrGetSession(userId: string, documentId: string) {
    const existingSession = await prisma.chatSession.findUnique({
      where: {
        userId_documentId: { userId, documentId },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        document: {
          include: {
            extraction: true,
          },
        },
      },
    });

    if (existingSession) {
      return existingSession;
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      include: { extraction: true },
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    logger.info('Document status check', { documentId, status: document.status, hasExtraction: !!document.extraction });

    if (document.status !== 'COMPLETED') {
      throw new Error('Document processing not complete. Cannot chat with document until processing is finished.');
    }

    return prisma.chatSession.create({
      data: {
        userId,
        documentId,
        title: 'New conversation',
      },
      include: {
        messages: true,
        document: {
          include: {
            extraction: true,
          },
        },
      },
    });
  }

  async prepareSession(userId: string, documentId: string, userMessage?: string) {
    const session = await this.createOrGetSession(userId, documentId);
    const document = session.document;
    const extraction = document.extraction;

    if (!extraction) {
      throw new Error('Document has no extraction data');
    }

    const relevantChunks = userMessage 
      ? await searchDocumentChunks(documentId, userMessage, TOP_K_CHUNKS)
      : [];

    const chunksText = relevantChunks
      .map((chunk, i) => `[Chunk ${i + 1}]\n${chunk.content}`)
      .join('\n\n');

    const chunksTokens = estimateTokens(chunksText);

    const recentMessages = session.messages.slice(-30);
    let historyTokens = estimateTokens(formatChatHistory(recentMessages));

    let trimmedHistory: { role: MessageRole; content: string }[] = recentMessages;
    while (
      chunksTokens + historyTokens > MAX_CONTEXT_TOKENS &&
      trimmedHistory.length > 0
    ) {
      trimmedHistory = trimmedHistory.slice(1);
      const historyText = formatChatHistory(trimmedHistory);
      const newHistoryTokens = estimateTokens(historyText);
      if (newHistoryTokens >= historyTokens) break;
      historyTokens = newHistoryTokens;
    }

    return { session, chunksText, chunksTokens, trimmedHistory };
  }

  async sendMessage(userId: string, documentId: string, userMessage: string) {
    const validated = sendMessageSchema.parse({ documentId, message: userMessage });

    const { session, chunksText, trimmedHistory } = await this.prepareSession(userId, validated.documentId, validated.message);

    const userMessageRecord = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: validated.message,
      },
    });

    try {
      const response = await this.callAnthropic(
        validated.message,
        chunksText,
        trimmedHistory
      );

      const assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: response,
        },
      });

      if (!session.title || session.title === 'New conversation') {
        const title = this.generateTitle(validated.message);
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { title },
        });
      }

      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });

      return {
        sessionId: session.id,
        userMessage: userMessageRecord,
        assistantMessage,
      };
    } catch (error) {
      await prisma.chatMessage.delete({ where: { id: userMessageRecord.id } });
      throw error;
    }
  }

  async *streamMessage(userId: string, documentId: string, userMessage: string) {
    const validated = sendMessageSchema.parse({ documentId, message: userMessage });

    const { session, chunksText, trimmedHistory } = await this.prepareSession(userId, validated.documentId, validated.message);

    const userMessageRecord = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: validated.message,
      },
    });

    let fullResponse = '';
    let assistantMessageRecord = null;

    try {
      for await (const chunk of this.streamAnthropic(
        validated.message,
        chunksText,
        trimmedHistory
      )) {
        fullResponse += chunk;
        yield { type: 'chunk', content: chunk };
      }

      assistantMessageRecord = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: fullResponse,
        },
      });

      if (!session.title || session.title === 'New conversation') {
        const title = this.generateTitle(validated.message);
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { title },
        });
      }

      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });

      yield { 
        type: 'done', 
        sessionId: session.id,
        userMessage: userMessageRecord,
        assistantMessage: assistantMessageRecord,
      };
    } catch (error) {
      await prisma.chatMessage.delete({ where: { id: userMessageRecord.id } });
      throw error;
    }
  }

  private extractTextFromData(extractedData: unknown): string {
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

  private async *streamAnthropic(
    userMessage: string,
    chunksText: string,
    history: { role: MessageRole; content: string }[]
  ): AsyncGenerator<string> {
    const client = getAnthropicClient();

    const historyText = history.length > 0
      ? `Conversation history:\n${formatChatHistory(history)}\n\n`
      : '';

    const systemPrompt = `You are a helpful medical assistant. You help clinicians understand and extract information from medical documents.
    
The document contains extracted structured data from a medical document (such as a discharge summary, lab result, prescription, consultation note, etc.).

Provide accurate, helpful answers based ONLY on the information in the provided document chunks. If you're unsure about something or the information isn't in the provided chunks, say so clearly.

Be concise but thorough. When relevant, cite specific sections or fields from the document.`;

    const userPrompt = `${historyText}Relevant document chunks:
${chunksText}

User question: ${userMessage}`;

    const messages: MessageParam[] = [
      { role: 'user', content: [{ type: 'text', text: userPrompt }] },
    ];

    try {
      const stream = await client.messages.stream({
        model: ANTHROPIC_MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        messages,
        temperature: 0.3,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'text_delta') {
            yield chunk.delta.text;
          }
        }
      }
    } catch (error) {
      logger.error('Anthropic streaming error', error);
      throw new Error('Failed to generate response');
    }
  }

  private async callAnthropic(
    userMessage: string,
    chunksText: string,
    history: { role: MessageRole; content: string }[]
  ): Promise<string> {
    const client = getAnthropicClient();

    const historyText = history.length > 0
      ? `Conversation history:\n${formatChatHistory(history)}\n\n`
      : '';

    const systemPrompt = `You are a helpful medical assistant. You help clinicians understand and extract information from medical documents.
    
The document contains extracted structured data from a medical document (such as a discharge summary, lab result, prescription, consultation note, etc.).

Provide accurate, helpful answers based ONLY on the information in the provided document chunks. If you're unsure about something or the information isn't in the provided chunks, say so clearly.

Be concise but thorough. When relevant, cite specific sections or fields from the document.`;

    const userPrompt = `${historyText}Relevant document chunks:
${chunksText}

User question: ${userMessage}`;

    const messages: MessageParam[] = [
      { role: 'user', content: [{ type: 'text', text: userPrompt }] },
    ];

    try {
      const response = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        messages,
        temperature: 0.3,
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      return 'No response generated';
    } catch (error) {
      logger.error('Anthropic chat error', error);
      throw new Error('Failed to generate response');
    }
  }

  private generateTitle(firstMessage: string): string {
    const cleaned = firstMessage.replace(/[^\w\s]/gi, '').trim();
    const words = cleaned.split(/\s+/);
    if (words.length <= 5) {
      return words.join(' ');
    }
    return words.slice(0, 5).join(' ') + '...';
  }

  async getSession(userId: string, documentId: string) {
    const session = await prisma.chatSession.findUnique({
      where: {
        userId_documentId: { userId, documentId },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return null;
    }

    return session;
  }

  async getSessionsByDocument(userId: string, documentId: string) {
    return prisma.chatSession.findMany({
      where: { userId, documentId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error('Session not found or access denied');
    }

    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return { message: 'Session deleted successfully' };
  }
}

export const chatService = new ChatService();
