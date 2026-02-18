import { Response } from 'express';
import { chatService } from '../services/chat.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

export class ChatController {
  async streamMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { documentId, message } = req.body;

      if (!documentId) {
        res.status(400).json({ error: 'Document ID is required' });
        return;
      }

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      logger.info('Starting streaming chat message', {
        userId: req.user.id,
        documentId,
        messageLength: message.length,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      let sessionId = '';
      let userMessageId = '';
      let assistantMessageId = '';

      for await (const chunk of chatService.streamMessage(req.user.id, documentId, message)) {
        if (chunk.type === 'chunk') {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk.content })}\n\n`);
        } else if (chunk.type === 'done') {
          sessionId = chunk.sessionId || '';
          userMessageId = chunk.userMessage?.id || '';
          assistantMessageId = chunk.assistantMessage?.id || '';
          res.write(`data: ${JSON.stringify({ 
            type: 'done', 
            sessionId,
            userMessageId,
            assistantMessageId,
          })}\n\n`);
        }
      }

      res.end();
    } catch (error) {
      logger.error('Chat stream message error', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
      res.end();
    }
  }

  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { documentId, message } = req.body;

      if (!documentId) {
        res.status(400).json({ error: 'Document ID is required' });
        return;
      }

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      logger.info('Sending chat message', {
        userId: req.user.id,
        documentId,
        messageLength: message.length,
      });

      const result = await chatService.sendMessage(req.user.id, documentId, message);

      res.status(201).json({
        sessionId: result.sessionId,
        userMessage: result.userMessage,
        assistantMessage: result.assistantMessage,
      });
    } catch (error) {
      logger.error('Chat send message error', error);
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('access denied')) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message.includes('not complete') || error.message.includes('no extraction')) {
          res.status(400).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const documentIdParam = req.params.documentId;
      const documentId = Array.isArray(documentIdParam) ? documentIdParam[0] : documentIdParam;

      if (!documentId) {
        res.status(400).json({ error: 'Document ID is required' });
        return;
      }

      const session = await chatService.getSession(req.user.id, documentId);

      res.json({ session });
    } catch (error) {
      logger.error('Chat get session error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sessionIdParam = req.params.sessionId;
      const sessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      await chatService.deleteSession(req.user.id, sessionId);

      res.json({ message: 'Session deleted successfully' });
    } catch (error) {
      logger.error('Chat delete session error', error);
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('access denied')) {
          res.status(404).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const chatController = new ChatController();
