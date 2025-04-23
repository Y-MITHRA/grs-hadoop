const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { isAuthenticated } = require('../middleware/auth');
const Grievance = require('../models/Grievance');

// Helper function to validate file access
const validateFileAccess = async (req, res, documentId) => {
  try {
    // Find grievance containing this document
    const grievance = await Grievance.findOne({
      $or: [
        { 'attachments._id': documentId },
        { 'resolutionDocument._id': documentId }
      ]
    });

    if (!grievance) {
      res.status(404).json({ message: 'Document not found' });
      return null;
    }

    // Check if user has access to this grievance
    if (grievance.petitioner.toString() !== req.user._id && req.user.role !== 'admin') {
      res.status(403).json({ message: 'Access denied' });
      return null;
    }

    // Find the document
    let document = grievance.attachments.find(att => att._id.toString() === documentId);
    if (!document) {
      document = grievance.resolutionDocument._id.toString() === documentId ? grievance.resolutionDocument : null;
    }

    if (!document) {
      res.status(404).json({ message: 'Document not found' });
      return null;
    }

    return document;
  } catch (error) {
    console.error('Error validating file access:', error);
    res.status(500).json({ message: 'Server error' });
    return null;
  }
};

// View document
router.get('/:id/view', isAuthenticated, async (req, res) => {
  const document = await validateFileAccess(req, res, req.params.id);
  if (!document) return;

  const filePath = path.resolve(__dirname, '..', document.path);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  // Set appropriate content type
  res.setHeader('Content-Type', document.mimetype);
  res.sendFile(filePath);
});

// Download document
router.get('/:id/download', isAuthenticated, async (req, res) => {
  const document = await validateFileAccess(req, res, req.params.id);
  if (!document) return;

  const filePath = path.resolve(__dirname, '..', document.path);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  res.download(filePath, document.filename);
});

module.exports = router; 