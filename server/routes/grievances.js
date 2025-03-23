const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Grievance = require('../models/Grievance');
const { isAuthenticated } = require('../middleware/auth');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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
}).single('attachment'); // Changed from 'file' to 'attachment' to match frontend

// Create new grievance with error handling
router.post('/', isAuthenticated, async (req, res) => {
  upload(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    } else if (err) {
      // An unknown error occurred when uploading
      return res.status(400).json({ message: err.message });
    }

    try {
      const { title, department, description, location } = req.body;

      // Validate required fields
      if (!title || !department || !description || !location) {
        return res.status(400).json({ 
          message: 'Missing required fields. Please provide title, department, description, and location.' 
        });
      }

      // Create new grievance
      const grievance = new Grievance({
        title,
        department,
        description,
        location,
        user: req.user._id
      });

      // Add attachment if file was uploaded
      if (req.file) {
        grievance.attachments.push({
          filename: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype
        });
      }

      await grievance.save();
      res.status(201).json(grievance);
    } catch (error) {
      // Clean up uploaded file if there was an error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Error creating grievance:', error);
      res.status(400).json({ 
        message: error.message || 'Failed to create grievance'
      });
    }
  });
});

// Get all grievances
router.get('/', isAuthenticated, async (req, res) => {
  try {
    let grievances;
    if (req.user.role === 'admin') {
      // Admins can see all grievances
      grievances = await Grievance.find().populate('user', 'name email');
    } else {
      // Regular users can only see their own grievances
      grievances = await Grievance.find({ user: req.user._id }).populate('user', 'name email');
    }
    res.json(grievances);
  } catch (err) {
    console.error('Error fetching grievances:', err);
    res.status(500).json({ message: 'Error fetching grievances' });
  }
});

// Get single grievance
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id)
      .populate('user', 'name email')
      .lean();
    
    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    // Check if user has permission to view this grievance
    if (req.user.role !== 'admin' && grievance.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this grievance' });
    }

    // Format dates
    grievance.createdAt = new Date(grievance.createdAt).toISOString();
    grievance.updatedAt = new Date(grievance.updatedAt).toISOString();

    res.json(grievance);
  } catch (err) {
    console.error('Error fetching grievance:', err);
    res.status(500).json({ message: 'Error fetching grievance details' });
  }
});

// Update grievance status (admin only)
router.patch('/:id/status', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update grievance status' });
    }

    const { status } = req.body;
    const grievance = await Grievance.findById(req.params.id);

    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    grievance.status = status;
    await grievance.save();
    res.json(grievance);
  } catch (err) {
    console.error('Error updating grievance status:', err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router; 