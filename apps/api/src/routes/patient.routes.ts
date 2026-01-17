import { Router } from 'express';
import { patientController } from '../controllers/patient.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All patient routes require authentication
router.use(authenticateToken);

// POST /api/patients - Create a new patient
router.post('/', (req, res) => patientController.create(req, res));

// GET /api/patients - List all patients for logged-in user
router.get('/', (req, res) => patientController.getAll(req, res));

// GET /api/patients/:id - Get patient by ID
router.get('/:id', (req, res) => patientController.getById(req, res));

// GET /api/patients/:id/summary - Get patient summary with document stats
router.get('/:id/summary', (req, res) => patientController.getSummary(req, res));

// GET /api/patients/:id/dashboard - Get patient dashboard with full details
router.get('/:id/dashboard', (req, res) => patientController.getDashboard(req, res));

// PUT /api/patients/:id - Update patient
router.put('/:id', (req, res) => patientController.update(req, res));

// DELETE /api/patients/:id - Delete patient
router.delete('/:id', (req, res) => patientController.delete(req, res));

export default router;
