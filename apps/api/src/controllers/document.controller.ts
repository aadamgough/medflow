import { Response } from 'express';
import { documentService } from '../services/document.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';
import { DocumentType } from '@prisma/client';

export class DocumentController {
  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { patientId, documentType } = req.body;

      if (!patientId) {
        res.status(400).json({ error: 'Patient ID is required' });
        return;
      }

      // Validate document type if provided
      let validatedDocType: DocumentType | undefined;
      if (documentType) {
        if (!Object.values(DocumentType).includes(documentType as DocumentType)) {
          res.status(400).json({
            error: 'Invalid document type',
            validTypes: Object.values(DocumentType),
          });
          return;
        }
        validatedDocType = documentType as DocumentType;
      }

      const document = await documentService.uploadDocument(
        req.file,
        req.user.id,
        patientId,
        validatedDocType
      );

      res.status(201).json({
        message: 'Document uploaded successfully',
        document,
      });
    } catch (error) {
      logger.error('Document upload error', error);

      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('access denied')) {
          res.status(404).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Failed to upload document' });
    }
  }

  async getDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        res.status(400).json({ error: 'Document ID is required' });
        return;
      }

      const document = await documentService.getDocumentById(id, req.user.id);

      if (!document) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      res.status(200).json({ document });
    } catch (error) {
      logger.error('Get document error', error);
      res.status(500).json({ error: 'Failed to retrieve document' });
    }
  }

  async getPatientDocuments(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;

      if (!patientId) {
        res.status(400).json({ error: 'Patient ID is required' });
        return;
      }

      const documents = await documentService.getDocumentsByPatient(
        patientId,
        req.user.id
      );

      res.status(200).json({
        documents,
        count: documents.length,
      });
    } catch (error) {
      logger.error('Get patient documents error', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  }

  async deleteDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        res.status(400).json({ error: 'Document ID is required' });
        return;
      }

      await documentService.deleteDocument(id, req.user.id);

      res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
      logger.error('Delete document error', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  async getDocumentUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        res.status(400).json({ error: 'Document ID is required' });
        return;
      }

      const url = await documentService.getDocumentUrl(id, req.user.id);

      res.status(200).json({ url });
    } catch (error) {
      logger.error('Get document URL error', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Failed to get document URL' });
    }
  }
}

export const documentController = new DocumentController();
