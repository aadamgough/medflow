import { Router } from 'express';
import { patientController } from '../controllers/patient.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', (req, res) => patientController.create(req, res));

router.get('/', (req, res) => patientController.getAll(req, res));

router.get('/:id', (req, res) => patientController.getById(req, res));

router.get('/:id/summary', (req, res) => patientController.getSummary(req, res));

router.get('/:id/dashboard', (req, res) => patientController.getDashboard(req, res));

router.put('/:id', (req, res) => patientController.update(req, res));

router.delete('/:id', (req, res) => patientController.delete(req, res));

export default router;
