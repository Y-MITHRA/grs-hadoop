const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Grievance = require('../models/Grievance');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and DOC files are allowed.'));
    }
});

// Submit a new grievance
router.post('/submit', auth, upload.single('attachment'), async (req, res) => {
    try {
        const { title, department, description } = req.body;
        
        if (!title || !department || !description) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                details: {
                    title: !title ? 'Title is required' : null,
                    department: !department ? 'Department is required' : null,
                    description: !description ? 'Description is required' : null
                }
            });
        }

        // Generate a unique petition ID (e.g., PET-2024-001)
        const count = await Grievance.countDocuments();
        const petitionId = `PET-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;
        
        const grievance = new Grievance({
            petitionId,
            title,
            department,
            description,
            attachment: req.file ? req.file.path : null,
            petitioner: {
                name: req.user.name,
                email: req.user.email,
                userId: req.user._id
            },
            status: 'pending'
        });

        await grievance.save();
        
        console.log('Grievance submitted successfully:', {
            petitionId: grievance.petitionId,
            title: grievance.title,
            department: grievance.department,
            petitioner: grievance.petitioner.name
        });

        res.status(201).json({ 
            message: 'Grievance submitted successfully',
            petitionId: grievance.petitionId 
        });
    } catch (error) {
        console.error('Error submitting grievance:', error);
        
        // Check for validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation error',
                details: Object.keys(error.errors).reduce((acc, key) => {
                    acc[key] = error.errors[key].message;
                    return acc;
                }, {})
            });
        }
        
        res.status(500).json({ message: 'Error submitting grievance. Please try again later.' });
    }
});

// Get all grievances for a petitioner
router.get('/petitioner', auth, async (req, res) => {
    try {
        const grievances = await Grievance.find({
            'petitioner.userId': req.user._id
        }).sort({ createdAt: -1 });

        res.json(grievances);
    } catch (error) {
        console.error('Error fetching grievances:', error);
        res.status(500).json({ message: 'Error fetching grievances' });
    }
});

// Get a specific grievance by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const grievance = await Grievance.findOne({
            petitionId: req.params.id,
            'petitioner.userId': req.user._id
        });

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        res.json(grievance);
    } catch (error) {
        console.error('Error fetching grievance:', error);
        res.status(500).json({ message: 'Error fetching grievance' });
    }
});

module.exports = router; 