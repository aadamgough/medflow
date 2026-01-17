import { Response } from 'express';
import { patientService } from '../services/patient.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

export class PatientController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, dateOfBirth, externalId, metadata } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      const patient = await patientService.create(req.user.id, {
        name,
        dateOfBirth,
        externalId,
        metadata,
      });

      res.status(201).json({ patient });
    } catch (error) {
      logger.error('Create patient error', error);

      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Failed to create patient' });
    }
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Parse query parameters
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      // Validate pagination params
      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({ error: 'Limit must be between 1 and 100' });
        return;
      }

      if (isNaN(offset) || offset < 0) {
        res.status(400).json({ error: 'Offset must be a non-negative number' });
        return;
      }

      const result = await patientService.findAllByUser(req.user.id, {
        search,
        limit,
        offset,
      });

      res.status(200).json({
        patients: result.data,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      });
    } catch (error) {
      logger.error('Get patients error', error);
      res.status(500).json({ error: 'Failed to retrieve patients' });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        res.status(400).json({ error: 'Patient ID is required' });
        return;
      }

      const patient = await patientService.findById(id, req.user.id);

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      res.status(200).json({ patient });
    } catch (error) {
      logger.error('Get patient error', error);
      res.status(500).json({ error: 'Failed to retrieve patient' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        res.status(400).json({ error: 'Patient ID is required' });
        return;
      }

      const { name, dateOfBirth, externalId, metadata } = req.body;

      // Check if at least one field is provided
      if (name === undefined && dateOfBirth === undefined && externalId === undefined && metadata === undefined) {
        res.status(400).json({ error: 'At least one field must be provided for update' });
        return;
      }

      const patient = await patientService.update(id, req.user.id, {
        name,
        dateOfBirth,
        externalId,
        metadata,
      });

      res.status(200).json({ patient });
    } catch (error) {
      logger.error('Update patient error', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Failed to update patient' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        res.status(400).json({ error: 'Patient ID is required' });
        return;
      }

      await patientService.delete(id, req.user.id);

      res.status(200).json({ message: 'Patient deleted successfully' });
    } catch (error) {
      logger.error('Delete patient error', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Failed to delete patient' });
    }
  }

  async getSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        res.status(400).json({ error: 'Patient ID is required' });
        return;
      }

      const summary = await patientService.getSummary(id, req.user.id);

      if (!summary) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      res.status(200).json({ patient: summary });
    } catch (error) {
      logger.error('Get patient summary error', error);
      res.status(500).json({ error: 'Failed to retrieve patient summary' });
    }
  }

  async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        res.status(400).json({ error: 'Patient ID is required' });
        return;
      }

      const dashboard = await patientService.getPatientDashboard(id, req.user.id);

      if (!dashboard) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      res.status(200).json(dashboard);
    } catch (error) {
      logger.error('Get patient dashboard error', error);
      res.status(500).json({ error: 'Failed to retrieve patient dashboard' });
    }
  }
}

export const patientController = new PatientController();
