import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { profilePictureUpload } from '../middleware/upload.middleware';

const router = Router();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

// Protected routes
router.get('/me', authenticateToken, (req, res) => authController.me(req, res));
router.post('/refresh', authenticateToken, (req, res) => authController.refreshToken(req, res));

// Profile picture routes
router.post('/profile-picture', authenticateToken, profilePictureUpload.single('file'), (req, res) => authController.uploadProfilePicture(req, res));
router.delete('/profile-picture', authenticateToken, (req, res) => authController.removeProfilePicture(req, res));

export default router;
