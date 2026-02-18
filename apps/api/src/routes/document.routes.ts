import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticateToken);

router.post(
  '/',
  upload.single('file'),
  (req, res) => documentController.upload(req, res)
);

router.get('/:id', (req, res) => documentController.getDocument(req, res));

router.get('/:id/url', (req, res) => documentController.getDocumentUrl(req, res));

router.get(
  '/patient/:patientId',
  (req, res) => documentController.getPatientDocuments(req, res)
);

router.delete('/:id', (req, res) => documentController.deleteDocument(req, res));

export default router;
