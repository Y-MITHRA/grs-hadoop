import express from 'express';
import auth from '../middleware/auth.js';
import Grievance from '../models/Grievance.js';
import Counter from '../models/Counter.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Official from '../models/Official.js';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, and DOCX files are allowed.'));
        }
    }
});

// Function to get next sequence
const getNextSequence = async (name) => {
    const counter = await Counter.findOneAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

// Submit a new grievance
router.post('/submit', auth, upload.single('attachment'), async (req, res) => {
    try {
        const { title, description, department } = req.body;

        // Debug logging
        console.log('Request body:', req.body);
        console.log('User object:', req.user);
        console.log('File:', req.file);

        // Validate required fields
        if (!title || !description || !department) {
            return res.status(400).json({
                message: 'Please provide all required fields',
                missingFields: {
                    title: !title,
                    description: !description,
                    department: !department
                }
            });
        }

        // Validate department
        const validDepartments = ['Water', 'RTO', 'Electricity'];
        if (!validDepartments.includes(department)) {
            return res.status(400).json({
                message: 'Invalid department',
                validDepartments
            });
        }

        // Validate user data
        if (!req.user || !req.user.id || !req.user.email) {
            console.error('Missing user data:', req.user);
            return res.status(400).json({
                message: 'User data is incomplete',
                userData: req.user
            });
        }

        // Generate unique IDs
        const [petitionSequence, grievanceSequence] = await Promise.all([
            getNextSequence('petitionId'),
            getNextSequence('grievanceId')
        ]);
        
        const petitionId = `PET${String(petitionSequence).padStart(6, '0')}`;
        const grievanceId = `GRV${String(grievanceSequence).padStart(6, '0')}`;

        // Ensure we have the user's name
        const petitionerName = req.user.name || req.user.email.split('@')[0];

        // Handle file path
        let attachmentPath = null;
        if (req.file) {
            // Convert Windows path to URL format
            attachmentPath = req.file.path.replace(/\\/g, '/');
            // Remove the 'server/' prefix if it exists
            attachmentPath = attachmentPath.replace(/^server\//, '');
        }

        // Create grievance object
        const grievanceData = {
            grievanceId,
            petitionId,
            title: title.trim(),
            description: description.trim(),
            department,
            petitioner: {
                name: petitionerName,
                email: req.user.email,
                userId: req.user.id
            },
            attachment: attachmentPath,
            status: 'unassigned'
        };

        console.log('Creating grievance with data:', grievanceData);

        const newGrievance = new Grievance(grievanceData);

        // Validate before saving
        const validationError = newGrievance.validateSync();
        if (validationError) {
            console.error('Validation error:', validationError);
            return res.status(400).json({
                message: 'Validation error',
                errors: validationError.errors
            });
        }

        await newGrievance.save();
        console.log('Grievance saved successfully:', newGrievance._id);

        res.status(201).json({
            message: 'Grievance submitted successfully',
            grievance: {
                grievanceId,
                petitionId,
                title: newGrievance.title,
                status: newGrievance.status
            }
        });
    } catch (error) {
        console.error('Error submitting grievance:', error);
        
        // Handle duplicate ID errors
        if (error.code === 11000) {
            // If we somehow get a duplicate, try one more time with new IDs
            try {
                const [petitionSequence, grievanceSequence] = await Promise.all([
                    getNextSequence('petitionId'),
                    getNextSequence('grievanceId')
                ]);
                
                const petitionId = `PET${String(petitionSequence).padStart(6, '0')}`;
                const grievanceId = `GRV${String(grievanceSequence).padStart(6, '0')}`;
                
                const grievanceData = {
                    grievanceId,
                    petitionId,
                    ...req.body,
                    petitioner: {
                        name: req.user.name || req.user.email.split('@')[0],
                        email: req.user.email,
                        userId: req.user.id
                    },
                    attachment: req.file ? req.file.path.replace(/\\/g, '/') : null,
                    status: 'unassigned'
                };

                const newGrievance = new Grievance(grievanceData);
                await newGrievance.save();

                return res.status(201).json({
                    message: 'Grievance submitted successfully (retry)',
                    grievance: {
                        grievanceId,
                        petitionId,
                        title: newGrievance.title,
                        status: newGrievance.status
                    }
                });
            } catch (retryError) {
                console.error('Error in retry attempt:', retryError);
                return res.status(500).json({
                    message: 'Failed to submit grievance after retry',
                    error: retryError.message
                });
            }
        }

        // Handle multer errors
        if (error.name === 'MulterError') {
            return res.status(400).json({
                message: 'File upload error',
                error: error.message
            });
        }

        res.status(500).json({
            message: 'Error submitting grievance',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get grievances for a department
router.get('/department/:dept/:status', auth, async (req, res) => {
    try {
        const { dept, status } = req.params;
        const query = { department: dept.toLowerCase() };

        if (status === 'unassigned') {
            query.status = 'unassigned';
            query.declinedBy = { $not: { $elemMatch: { officialId: req.user._id } } };
        } else if (status === 'assigned') {
            query.status = 'assigned';
            query.assignedTo = req.user._id;
        } else if (status === 'closed') {
            query.status = 'closed';
            query.assignedTo = req.user._id;
        } else if (status === 'myQueries') {
            query.$or = [
                { assignedTo: req.user._id },
                { 'declinedBy.officialId': req.user._id }
            ];
        }

        const grievances = await Grievance.find(query)
            .populate('petitioner', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });

        // Get statistics
        const stats = {
            unassigned: await Grievance.countDocuments({
                department: dept.toLowerCase(),
                status: 'unassigned',
                declinedBy: { $not: { $elemMatch: { officialId: req.user._id } } }
            }),
            assigned: await Grievance.countDocuments({
                department: dept.toLowerCase(),
                status: 'assigned',
                assignedTo: req.user._id
            }),
            closed: await Grievance.countDocuments({
                department: dept.toLowerCase(),
                status: 'closed',
                assignedTo: req.user._id
            }),
            myQueries: await Grievance.countDocuments({
                department: dept.toLowerCase(),
                $or: [
                    { assignedTo: req.user._id },
                    { 'declinedBy.officialId': req.user._id }
                ]
            })
        };

        res.json({ grievances, stats });
    } catch (error) {
        console.error('Error fetching grievances:', error);
        res.status(500).json({ message: 'Error fetching grievances' });
    }
});

// Accept a grievance
router.post('/:petitionId/accept', auth, async (req, res) => {
    try {
        const grievance = await Grievance.findOne({ petitionId: req.params.petitionId });

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        if (grievance.status !== 'unassigned') {
            return res.status(400).json({ message: 'Grievance is already assigned or closed' });
        }

        grievance.status = 'assigned';
        grievance.assignedTo = req.user._id;
        grievance.assignedAt = new Date();
        grievance.notifications.push({
            message: `Grievance assigned to ${req.user.name}`,
            timestamp: new Date()
        });

        await grievance.save();
        res.json({ message: 'Grievance accepted successfully' });
    } catch (error) {
        console.error('Error accepting grievance:', error);
        res.status(500).json({ message: 'Error accepting grievance' });
    }
});

// Decline a grievance
router.post('/:petitionId/decline', auth, async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ message: 'Please provide a reason for declining' });
        }

        const grievance = await Grievance.findOne({ petitionId: req.params.petitionId });

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        if (grievance.status !== 'unassigned') {
            return res.status(400).json({ message: 'Grievance is already assigned or closed' });
        }

        grievance.declinedBy.push({
            officialId: req.user._id,
            name: req.user.name,
            reason,
            timestamp: new Date()
        });

        grievance.notifications.push({
            message: `Grievance declined by ${req.user.name}: ${reason}`,
            timestamp: new Date()
        });

        // Find next available official
        const nextOfficial = await Official.findOne({
            department: grievance.department,
            _id: { $nin: grievance.declinedBy.map(d => d.officialId) }
        });

        if (!nextOfficial) {
            grievance.status = 'escalated';
            grievance.notifications.push({
                message: 'Grievance escalated: No available officials',
                timestamp: new Date()
            });
        }

        await grievance.save();
        res.json({ message: 'Grievance declined successfully' });
    } catch (error) {
        console.error('Error declining grievance:', error);
        res.status(500).json({ message: 'Error declining grievance' });
    }
});

// Add chat message
router.post('/:petitionId/chat', auth, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Please provide a message' });
        }

        const grievance = await Grievance.findOne({ petitionId: req.params.petitionId });

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        grievance.chatMessages.push({
            sender: {
                id: req.user._id,
                name: req.user.name,
                role: req.user.role
            },
            message,
            timestamp: new Date()
        });

        await grievance.save();
        res.json({ message: 'Chat message added successfully' });
    } catch (error) {
        console.error('Error adding chat message:', error);
        res.status(500).json({ message: 'Error adding chat message' });
    }
});

// Get chat messages
router.get('/:petitionId/chat', auth, async (req, res) => {
    try {
        const grievance = await Grievance.findOne({ petitionId: req.params.petitionId });

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Mark messages as read
        grievance.chatMessages = grievance.chatMessages.map(msg => {
            if (msg.sender.id.toString() !== req.user._id.toString()) {
                msg.read = true;
            }
            return msg;
        });

        await grievance.save();
        res.json({ messages: grievance.chatMessages });
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({ message: 'Error fetching chat messages' });
    }
});

// Get grievance details
router.get('/:petitionId', auth, async (req, res) => {
    try {
        const grievance = await Grievance.findOne({ petitionId: req.params.petitionId })
            .populate('petitioner', 'name email')
            .populate('assignedTo', 'name email');

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        res.json(grievance);
    } catch (error) {
        console.error('Error fetching grievance details:', error);
        res.status(500).json({ message: 'Error fetching grievance details' });
    }
});

// Get grievances for a specific user
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.query;

        // Build query
        const query = { 'petitioner.userId': userId };
        if (status && status !== 'all') {
            query.status = status;
        }

        // Fetch grievances with populated fields
        const grievances = await Grievance.find(query)
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });

        // Calculate statistics
        const stats = {
            total: await Grievance.countDocuments({ 'petitioner.userId': userId }),
            pending: await Grievance.countDocuments({ 
                'petitioner.userId': userId,
                status: { $in: ['unassigned', 'pending'] }
            }),
            inProgress: await Grievance.countDocuments({ 
                'petitioner.userId': userId,
                status: { $in: ['assigned', 'in-progress'] }
            }),
            resolved: await Grievance.countDocuments({ 
                'petitioner.userId': userId,
                status: 'resolved'
            })
        };

        // Format grievances for frontend
        const formattedGrievances = grievances.map(grievance => ({
            petitionId: grievance.petitionId,
            title: grievance.title,
            department: grievance.department,
            status: grievance.status,
            assignedTo: grievance.assignedTo ? {
                name: grievance.assignedTo.name,
                email: grievance.assignedTo.email
            } : null,
            submittedDate: grievance.createdAt,
            lastUpdated: grievance.updatedAt,
            description: grievance.description,
            attachment: grievance.attachment
        }));

        res.json({
            grievances: formattedGrievances,
            stats
        });
    } catch (error) {
        console.error('Error fetching user grievances:', error);
        res.status(500).json({ 
            message: 'Error fetching grievances',
            error: error.message
        });
    }
});

export default router; 