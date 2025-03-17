import express from 'express';
import auth from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
    createGrievance,
    getDepartmentGrievances,
    acceptGrievance,
    declineGrievance,
    updateGrievanceStatus,
    getGrievanceStatus,
    getUserGrievances,
    getChatMessages,
    sendChatMessage,
    resolveGrievance,
    startProgress,
    uploadResolutionDocument,
    submitFeedback,
    getOfficialFeedback
} from '../controllers/grievanceController.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/resolution-docs/'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and images are allowed.'));
        }
    }
});

// Create new grievance (Petitioner only)
router.post('/', auth, createGrievance);

// Get user's grievances (Petitioner only)
router.get('/user/:userId', auth, getUserGrievances);

// Get department-specific grievances (Official only)
router.get('/department/:department/:status', auth, getDepartmentGrievances);

// Accept grievance (Official only)
router.post('/:id/accept', auth, acceptGrievance);

// Decline grievance (Official only)
router.post('/:id/decline', auth, declineGrievance);

// Update grievance status (Official only)
router.patch('/:id/status', auth, updateGrievanceStatus);

// Get grievance status (Public)
router.get('/:id/status', getGrievanceStatus);

// Upload resolution document (Official only)
router.post('/:id/upload-resolution', auth, upload.single('document'), uploadResolutionDocument);

// Resolve grievance (Official only)
router.post('/:id/resolve', auth, resolveGrievance);

// Start progress on grievance (Official only)
router.post('/:id/start-progress', auth, startProgress);

// Submit feedback (Petitioner only)
router.post('/:id/feedback', auth, submitFeedback);

// Get official's feedback (Official only)
router.get('/official/:id/feedback', auth, getOfficialFeedback);

// Chat routes
router.get('/:id/chat', auth, getChatMessages);
router.post('/:id/chat', auth, sendChatMessage);

export default router; 