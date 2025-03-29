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
}).array('attachments', 5); // Allow up to 5 files

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
      const { title, department, description, location, coordinates } = req.body;

      // Validate required fields
      if (!title || !department || !description || !location) {
        return res.status(400).json({ 
          message: 'Missing required fields. Please provide title, department, description, and location.' 
        });
      }

      // Validate department
      const validDepartments = ['License', 'Registration', 'Vehicle', 'Permits', 'Enforcement', 'Other'];
      if (!validDepartments.includes(department)) {
        return res.status(400).json({ 
          message: 'Invalid department. Must be one of: License, Registration, Vehicle, Permits, Enforcement, Other' 
        });
      }

      // Create new grievance
      const grievance = new Grievance({
        title: title.trim(),
        department,
        description: description.trim(),
        location: location.trim(),
        coordinates: coordinates ? JSON.parse(coordinates) : null,
        user: req.user._id
      });

      // Add attachments if files were uploaded
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          grievance.attachments.push({
            filename: file.originalname,
            path: file.path,
            mimetype: file.mimetype
          });
        });
      }

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
});

// Get all grievances for the logged-in user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const grievances = await Grievance.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(grievances);
  } catch (error) {
    console.error('Error fetching grievances:', error);
    res.status(500).json({ message: 'Failed to fetch grievances' });
  }
});

// Get a single grievance by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const grievance = await Grievance.findOne({
      _id: req.params.id,
      user: req.user._id
    }).lean();

    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    res.json(grievance);
  } catch (error) {
    console.error('Error fetching grievance:', error);
    res.status(500).json({ message: 'Failed to fetch grievance' });
  }
});

// Add a response to a grievance
router.post('/:id/responses', isAuthenticated, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Response message is required' });
    }

    const grievance = await Grievance.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    grievance.responses.push({
      message,
      user: req.user._id
    });

    await grievance.save();
    res.json({ message: 'Response added successfully', grievance });
  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({ message: 'Failed to add response' });
  }
});

module.exports = router; 