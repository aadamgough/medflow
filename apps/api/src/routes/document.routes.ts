import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// All document routes require authentication
router.use(authenticateToken);

// POST /api/documents - Upload a document
router.post(
  '/',
  upload.single('file'),
  (req, res) => documentController.upload(req, res)
);

// GET /api/documents/:id - Get a specific document
router.get('/:id', (req, res) => documentController.getDocument(req, res));

// GET /api/documents/patient/:patientId - Get all documents for a patient
router.get(
  '/patient/:patientId',
  (req, res) => documentController.getPatientDocuments(req, res)
);

// DELETE /api/documents/:id - Delete a document
router.delete('/:id', (req, res) => documentController.deleteDocument(req, res));

export default router;
