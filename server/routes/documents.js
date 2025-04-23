const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
const { isAuthenticated } = require('../middleware/auth');
const Grievance = require('../models/Grievance');

// Configure CORS for document routes
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

router.use(cors(corsOptions));

// Helper function to validate file access
const validateFileAccess = async (req, res, documentId) => {
  try {
    console.log('Validating access for document:', documentId);
    console.log('User:', req.user);

    // Find grievance containing this document
    const grievance = await Grievance.findOne({
      $or: [
        { 'attachments._id': documentId },
        { 'resolutionDocument._id': documentId }
      ]
    });

    if (!grievance) {
      console.log('Document not found for ID:', documentId);
      res.status(404).json({ message: 'Document not found' });
      return null;
    }

    // Check if user has access to this grievance
    if (grievance.petitioner.toString() !== req.user._id && req.user.role !== 'admin') {
      console.log('Access denied for user:', req.user._id);
      res.status(403).json({ message: 'Access denied' });
      return null;
    }

    // Find the document
    let document = grievance.attachments.find(att => att._id.toString() === documentId);
    if (!document && grievance.resolutionDocument) {
      if (grievance.resolutionDocument._id.toString() === documentId) {
        document = grievance.resolutionDocument;
      }
    }

    if (!document) {
      console.log('Document not found in grievance:', {
        documentId,
        hasResolutionDoc: !!grievance.resolutionDocument,
        resolutionDocId: grievance.resolutionDocument?._id
      });
      res.status(404).json({ message: 'Document not found in grievance' });
      return null;
    }

    console.log('Document found:', {
      filename: document.filename,
      path: document.path,
      type: document === grievance.resolutionDocument ? 'resolution' : 'attachment'
    });

    return document;
  } catch (error) {
    console.error('Error validating file access:', error);
    res.status(500).json({ message: 'Server error validating file access' });
    return null;
  }
};

// View document
router.get('/:id/view', isAuthenticated, async (req, res) => {
  try {
    console.log('View request for document:', req.params.id);
    const document = await validateFileAccess(req, res, req.params.id);
    if (!document) return;

    const filePath = path.resolve(__dirname, '..', document.path);
    console.log('Attempting to serve file:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).json({ message: 'Physical file not found' });
    }

    // Set appropriate content type and headers
    res.setHeader('Content-Type', document.mimetype);
    res.setHeader('Content-Disposition', 'inline; filename="' + document.filename + '"');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ message: 'Error serving file' });
  }
});

// Download document
router.get('/:id/download', isAuthenticated, async (req, res) => {
  try {
    console.log('Download request for document:', req.params.id);
    const document = await validateFileAccess(req, res, req.params.id);
    if (!document) return;

    const filePath = path.resolve(__dirname, '..', document.path);
    console.log('Attempting to download file:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).json({ message: 'Physical file not found' });
    }

    res.download(filePath, document.filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
});

// Proxy route for resolution documents from main portal
router.get('/resolution/:filename', isAuthenticated, async (req, res) => {
  try {
    const mainPortalUrl = `http://localhost:5000/uploads/resolution-docs/${req.params.filename}`;
    console.log('Proxying request to:', mainPortalUrl);

    const response = await axios({
      method: 'get',
      url: mainPortalUrl,
      responseType: 'stream'
    });

    // Forward the content type
    res.setHeader('Content-Type', response.headers['content-type']);
    
    // Pipe the response directly to our response
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying document:', error);
    res.status(500).json({ message: 'Error accessing document' });
  }
});

module.exports = router; 