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
    getOfficialFeedback,
    findNearestOfficeByCoordinates,
    uploadDocumentAndCreateGrievance,
    updateResourceManagement,
    getResourceManagement,
    updateTimelineStage,
    getTimelineStages,
    escalateGrievance,
    getEscalatedGrievances,
    respondToEscalation
} from '../controllers/grievanceController.js';
import { processDocument, upload } from '../controllers/documentController.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/resolution-docs');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadResolution = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and images are allowed.'));
        }
    }
});

// Create new grievance (Petitioner only)
router.post('/', auth, createGrievance);

// Process document and create grievance (Petitioner only)
router.post('/document', auth, upload.single('document'), processDocument);

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
router.post('/:id/upload-resolution', auth, uploadResolution.single('document'), uploadResolutionDocument);

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

// Find nearest office by coordinates
router.post('/find-nearest-office', findNearestOfficeByCoordinates);

// Upload document and create grievance
router.post('/upload-document', auth, upload.single('document'), uploadDocumentAndCreateGrievance);

// Resource Management routes
router.post('/:id/resource-management', auth, updateResourceManagement);
router.get('/:id/resource-management', auth, getResourceManagement);

// Timeline Stage routes
router.post('/:id/timeline-stage', auth, updateTimelineStage);
router.get('/:id/timeline-stages', getTimelineStages);

// Escalation routes
router.post('/:id/escalate', auth, escalateGrievance);
router.get('/escalated', auth, getEscalatedGrievances);
router.post('/:id/escalation-response', auth, respondToEscalation);

export default router;