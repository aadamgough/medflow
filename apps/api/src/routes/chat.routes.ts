import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/stream', (req, res) => chatController.streamMessage(req, res));

router.post('/', (req, res) => chatController.sendMessage(req, res));

router.get('/document/:documentId', (req, res) => chatController.getSession(req, res));

router.delete('/:sessionId', (req, res) => chatController.deleteSession(req, res));

export default router;
