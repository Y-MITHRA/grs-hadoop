const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Grievance = require('../models/Grievance');
const { isAuthenticated } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve(__dirname, '..', 'uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only specific file types
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Create new grievance with error handling
router.post('/', isAuthenticated, upload.array('attachments', 5), async (req, res) => {
  try {
    const { title, description, district, division, taluk } = req.body;

    // Enforce RTO department
    const department = 'RTO';

    // Validate required fields
    if (!title || !description || !district || !division || !taluk) {
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide title, description, district, division, and taluk.' 
      });
    }

    // Create new grievance
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const attachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      path: path.relative(path.resolve(__dirname, '..'), file.path),
      mimetype: file.mimetype
    })) : [];

    const grievance = new Grievance({
      title: title.trim(),
      department,
      description: description.trim(),
      district: district.trim(),
      division: division.trim(),
      taluk: taluk.trim(),
      petitioner: req.session.userId,
      portal_type: 'RTO',
      attachments
    });

    await grievance.save();
    res.status(201).json({ 
      message: 'Grievance created successfully',
      grievance 
    });
  } catch (error) {
    // Clean up uploaded files if there was an error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    console.error('Error creating grievance:', error);
    res.status(400).json({ 
      message: error.message || 'Failed to create grievance'
    });
  }
});

// Get all grievances for the logged-in user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const grievances = await Grievance.find({
      petitioner: req.session.userId,
      department: 'RTO'
    }).sort({ createdAt: -1 }).lean();
    res.json(grievances);
  } catch (error) {
    console.error('Error fetching grievances:', error);
    res.status(500).json({ message: 'Failed to fetch grievances' });
  }
});

// Get a single grievance by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find the grievance and populate necessary fields
    const grievance = await Grievance.findOne({
      _id: req.params.id,
      petitioner: req.session.userId
    })
    .select({
      title: 1,
      description: 1,
      status: 1,
      department: 1,
      district: 1,
      division: 1,
      taluk: 1,
      createdAt: 1,
      updatedAt: 1,
      attachments: 1,
      resolutionDocument: 1,
      resolution: 1
    })
    .lean();

    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    // Log for debugging
    console.log('Found grievance:', {
      id: grievance._id,
      status: grievance.status,
      hasResolutionDoc: !!grievance.resolutionDocument
    });

    res.json(grievance);
  } catch (error) {
    console.error('Error fetching grievance:', error);
    res.status(500).json({ message: 'Failed to fetch grievance' });
  }
});

// Upload resolution document
router.post('/:id/resolution', isAuthenticated, upload.single('document'), async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Delete old resolution document if exists
    if (grievance.resolutionDocument && grievance.resolutionDocument.path) {
      const oldPath = path.resolve(__dirname, '..', grievance.resolutionDocument.path);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    grievance.resolutionDocument = {
      filename: req.file.originalname,
      path: path.relative(path.resolve(__dirname, '..'), req.file.path),
      mimetype: req.file.mimetype
    };

    grievance.status = 'RESOLVED';
    await grievance.save();
    res.json(grievance);
  } catch (error) {
    console.error('Error uploading resolution document:', error);
    res.status(500).json({ message: 'Error uploading resolution document' });
  }
});

module.exports = router; 