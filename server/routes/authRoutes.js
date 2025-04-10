import express from 'express';
import { loginPetitioner, loginOfficial, loginAdmin, refreshToken, getCurrentUser, registerPetitioner } from '../controllers/authController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Auth routes
router.post('/register', registerPetitioner);
router.post('/login/petitioner', loginPetitioner);
router.post('/login/official', loginOfficial);
router.post('/admin/login', loginAdmin);

// Protected routes
router.get('/me', auth, getCurrentUser);
router.post('/refresh', auth, refreshToken);

export default router;
