import express from 'express';
import { loginPetitioner, loginOfficial, loginAdmin, refreshToken, getCurrentUser, registerPetitioner, verifyToken } from '../controllers/authController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Auth routes
router.post('/register', registerPetitioner);
router.post('/petitioner/login', loginPetitioner);
router.post('/official/login', loginOfficial);
router.post('/admin/login', loginAdmin);

// Protected routes
router.get('/me', auth, getCurrentUser);
router.post('/refresh', auth, refreshToken);
router.get('/verify', auth, verifyToken);

export default router;
