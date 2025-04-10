import express from 'express';
import { generateToken } from '../controllers/chatController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
    console.log('Chat test route hit');
    res.json({ message: 'Chat routes are working' });
});

// Get Stream Chat token - protected route
router.post('/token', auth, async (req, res, next) => {
    try {
        console.log('Token route hit');
        console.log('Request body:', req.body);
        await generateToken(req, res);
    } catch (error) {
        console.error('Error in token route:', error);
        next(error);
    }
});

export default router; 