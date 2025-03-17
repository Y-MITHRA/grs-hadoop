import Grievance from '../models/Grievance.js';
import { mapCategoryToDepartment } from '../utils/departmentMapper.js';

// Create new grievance
export const createGrievance = async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        console.log('User from auth middleware:', req.user);

        const { title, description, department } = req.body;
        const petitioner = req.user.id; // From auth middleware

        // Validate required fields
        if (!title || !description || !department) {
            console.log('Missing required fields:', { title, description, department });
            return res.status(400).json({
                error: 'Missing required fields',
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
            console.log('Invalid department:', department);
            return res.status(400).json({
                error: 'Invalid department',
                validDepartments
            });
        }

        // Create new grievance
        const grievance = new Grievance({
            petitionId: `GRV${Date.now().toString().slice(-6)}`,
            title,
            description,
            department,
            petitioner,
            status: 'pending',
            statusHistory: [{
                status: 'pending',
                updatedBy: petitioner,
                updatedByType: 'petitioner',
                comment: 'Grievance submitted'
            }]
        });

        await grievance.save();
        console.log('Grievance saved successfully:', grievance);

        res.status(201).json({
            message: 'Grievance created successfully',
            grievance
        });
    } catch (error) {
        console.error('Error creating grievance:', error);
        res.status(500).json({
            error: 'Failed to create grievance',
            details: error.message
        });
    }
};

// Get department-specific grievances
export const getDepartmentGrievances = async (req, res) => {
    try {
        const { department, status } = req.params;
        const officialId = req.user.id;

        console.log('Fetching department grievances:', {
            department,
            status,
            officialId
        });

        // Build query
        const query = { department };
        if (status === 'pending') {
            query.status = 'pending';
            query.assignedTo = null;
        } else if (status === 'assigned') {
            query.status = 'assigned';
            query.assignedTo = officialId;
        } else if (status === 'inProgress') {
            query.status = 'in-progress';
            query.assignedTo = officialId;
        } else if (status === 'resolved') {
            query.status = 'resolved';
            query.assignedTo = officialId;
        }

        console.log('Query parameters:', query);

        // Get grievances
        const grievances = await Grievance.find(query)
            .populate('petitioner', 'name email')
            .populate('assignedTo', 'firstName lastName email')
            .sort({ createdAt: -1 });

        console.log('Found grievances:', grievances.length);

        // Get stats
        const stats = await Grievance.aggregate([
            { $match: { department } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('Stats:', stats);

        // Format stats
        const formattedStats = {
            pending: 0,
            assigned: 0,
            inProgress: 0,
            resolved: 0
        };

        stats.forEach(stat => {
            if (stat._id === 'pending') formattedStats.pending = stat.count;
            if (stat._id === 'assigned') formattedStats.assigned = stat.count;
            if (stat._id === 'in-progress') formattedStats.inProgress = stat.count;
            if (stat._id === 'resolved') formattedStats.resolved = stat.count;
        });

        console.log('Formatted stats:', formattedStats);

        res.json({
            grievances,
            stats: formattedStats
        });
    } catch (error) {
        console.error('Error fetching department grievances:', error);
        res.status(500).json({ error: 'Failed to fetch grievances' });
    }
};

// Accept grievance
export const acceptGrievance = async (req, res) => {
    try {
        const { id } = req.params;
        const officialId = req.user.id;
        const officialDepartment = req.user.department;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        if (grievance.status !== 'pending') {
            return res.status(400).json({ error: 'Grievance is not pending' });
        }

        if (grievance.department !== officialDepartment) {
            return res.status(403).json({ error: 'Not authorized to accept grievances from other departments' });
        }

        // Update grievance
        grievance.status = 'assigned';
        grievance.assignedTo = officialId;
        grievance.statusHistory.push({
            status: 'assigned',
            updatedBy: officialId,
            updatedByType: 'official',
            comment: 'Grievance accepted'
        });

        await grievance.save();

        res.json({
            message: 'Grievance accepted successfully',
            grievance
        });
    } catch (error) {
        console.error('Error accepting grievance:', error);
        res.status(500).json({ error: 'Failed to accept grievance' });
    }
};

// Decline grievance
export const declineGrievance = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const officialId = req.user.id;
        const officialDepartment = req.user.department;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        if (grievance.status !== 'pending') {
            return res.status(400).json({ error: 'Grievance is not pending' });
        }

        if (grievance.department !== officialDepartment) {
            return res.status(403).json({ error: 'Not authorized to decline grievances from other departments' });
        }

        // Update grievance status history
        grievance.statusHistory.push({
            status: 'pending',
            updatedBy: officialId,
            updatedByType: 'Official',
            comment: `Declined: ${reason}`
        });

        await grievance.save();

        res.json({
            message: 'Grievance declined successfully',
            grievance
        });
    } catch (error) {
        console.error('Error declining grievance:', error);
        res.status(500).json({ error: 'Failed to decline grievance' });
    }
};

// Update grievance status
export const updateGrievanceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.body;
        const officialId = req.user.id;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        if (grievance.assignedTo.toString() !== officialId) {
            return res.status(403).json({ error: 'Not authorized to update this grievance' });
        }

        // Update grievance
        grievance.status = status;
        grievance.statusHistory.push({
            status,
            updatedBy: officialId,
            updatedByType: 'Official',
            comment
        });

        await grievance.save();

        res.json({
            message: 'Grievance status updated successfully',
            grievance
        });
    } catch (error) {
        console.error('Error updating grievance status:', error);
        res.status(500).json({ error: 'Failed to update grievance status' });
    }
};

// Get grievance status
export const getGrievanceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const grievance = await Grievance.findById(id)
            .populate('petitioner', 'name email')
            .populate('assignedTo', 'firstName lastName email')
            .select('status statusHistory');

        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        res.json({
            status: grievance.status,
            history: grievance.statusHistory
        });
    } catch (error) {
        console.error('Error fetching grievance status:', error);
        res.status(500).json({ error: 'Failed to fetch grievance status' });
    }
};

// Get user's grievances
export const getUserGrievances = async (req, res) => {
    try {
        const { userId } = req.params;

        // Find all grievances for the user
        const grievances = await Grievance.find({ petitioner: userId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'assignedTo',
                select: 'firstName lastName email designation department',
                model: 'Official'
            });

        // Transform the data to ensure all fields are properly formatted
        const transformedGrievances = grievances.map(grievance => ({
            ...grievance.toObject(),
            assignedTo: grievance.assignedTo ? {
                firstName: grievance.assignedTo.firstName || '',
                lastName: grievance.assignedTo.lastName || '',
                email: grievance.assignedTo.email || '',
                designation: grievance.assignedTo.designation || '',
                department: grievance.assignedTo.department || ''
            } : null
        }));

        res.json({
            success: true,
            grievances: transformedGrievances
        });
    } catch (error) {
        console.error('Error fetching user grievances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch grievances'
        });
    }
};

// Get chat messages for a grievance
export const getChatMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const grievance = await Grievance.findById(id)
            .populate('petitioner', 'name email')
            .populate('assignedTo', 'firstName lastName email');

        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        // Check if user is authorized to view chat messages
        if (req.user.role === 'official' && grievance.assignedTo?._id.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized to view chat messages' });
        }

        if (req.user.role === 'petitioner' && grievance.petitioner.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized to view chat messages' });
        }

        res.json({
            messages: grievance.chatMessages,
            grievance: {
                id: grievance._id,
                title: grievance.title,
                status: grievance.status,
                petitioner: grievance.petitioner,
                assignedTo: grievance.assignedTo
            }
        });
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
};

// Send chat message
export const sendChatMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        // Check if user is authorized to send messages
        if (userRole === 'official' && grievance.assignedTo?.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized to send messages' });
        }

        if (userRole === 'petitioner' && grievance.petitioner.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized to send messages' });
        }

        // Add message to chat
        grievance.chatMessages.push({
            sender: userId,
            senderType: userRole === 'official' ? 'Official' : 'Petitioner',
            message
        });

        await grievance.save();

        res.json({
            message: 'Message sent successfully',
            chatMessage: grievance.chatMessages[grievance.chatMessages.length - 1]
        });
    } catch (error) {
        console.error('Error sending chat message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

// Upload resolution document
export const uploadResolutionDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const officialId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        if (grievance.assignedTo.toString() !== officialId) {
            return res.status(403).json({ error: 'Not authorized to upload resolution document' });
        }

        // Update grievance with document details
        grievance.resolutionDocument = {
            filename: req.file.originalname,
            path: req.file.path,
            uploadedAt: new Date()
        };

        await grievance.save();

        res.json({
            message: 'Resolution document uploaded successfully',
            document: grievance.resolutionDocument
        });
    } catch (error) {
        console.error('Error uploading resolution document:', error);
        res.status(500).json({ error: 'Failed to upload resolution document' });
    }
};

// Submit feedback for resolved grievance
export const submitFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const petitionerId = req.user.id;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        if (grievance.petitioner.toString() !== petitionerId) {
            return res.status(403).json({ error: 'Not authorized to submit feedback' });
        }

        if (grievance.status !== 'resolved') {
            return res.status(400).json({ error: 'Can only submit feedback for resolved grievances' });
        }

        if (grievance.feedbackRating) {
            return res.status(400).json({ error: 'Feedback already submitted' });
        }

        // Add feedback
        grievance.feedbackRating = rating;
        grievance.feedbackComment = comment;
        grievance.feedbackDate = new Date();

        await grievance.save();

        res.json({
            message: 'Feedback submitted successfully',
            feedback: {
                rating: grievance.feedbackRating,
                comment: grievance.feedbackComment,
                date: grievance.feedbackDate
            }
        });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
};

// Get official's feedback
export const getOfficialFeedback = async (req, res) => {
    try {
        const { id } = req.params;

        const grievances = await Grievance.find({
            assignedTo: id,
            'feedbackRating': { $exists: true }
        })
            .populate('petitioner', 'name email')
            .select('title feedbackRating feedbackComment feedbackDate resolutionDocument');

        res.json({
            feedback: grievances.map(g => ({
                title: g.title,
                feedback: {
                    rating: g.feedbackRating,
                    comment: g.feedbackComment,
                    date: g.feedbackDate
                },
                resolutionDocument: g.resolutionDocument,
                petitioner: g.petitioner
            }))
        });
    } catch (error) {
        console.error('Error fetching official feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
};

// Modify the existing resolveGrievance function to require document
export const resolveGrievance = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution } = req.body;
        const officialId = req.user.id;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        if (grievance.assignedTo.toString() !== officialId) {
            return res.status(403).json({ error: 'Not authorized to resolve this grievance' });
        }

        if (grievance.status !== 'in-progress') {
            return res.status(400).json({ error: 'Grievance must be in progress to be resolved' });
        }

        if (!grievance.resolutionDocument) {
            return res.status(400).json({ error: 'Resolution document must be uploaded before marking as resolved' });
        }

        // Update grievance
        grievance.status = 'resolved';
        grievance.resolution = {
            text: resolution,
            date: new Date()
        };
        grievance.statusHistory.push({
            status: 'resolved',
            updatedBy: officialId,
            updatedByType: 'official',
            comment: `Resolved: ${resolution}`
        });

        await grievance.save();

        res.json({
            message: 'Grievance resolved successfully',
            grievance
        });
    } catch (error) {
        console.error('Error resolving grievance:', error);
        res.status(500).json({ error: 'Failed to resolve grievance' });
    }
};

// Start progress on grievance
export const startProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const officialId = req.user.id;
        const officialDepartment = req.user.department;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        if (grievance.assignedTo.toString() !== officialId) {
            return res.status(403).json({ error: 'Not authorized to update this grievance' });
        }

        if (grievance.department !== officialDepartment) {
            return res.status(403).json({ error: 'Not authorized to handle grievances from other departments' });
        }

        if (grievance.status !== 'assigned') {
            return res.status(400).json({ error: 'Grievance must be assigned to start progress' });
        }

        // Update grievance
        grievance.status = 'in-progress';
        grievance.statusHistory.push({
            status: 'in-progress',
            updatedBy: officialId,
            updatedByType: 'official',
            comment: `Started progress: ${comment}`
        });

        await grievance.save();

        res.json({
            message: 'Grievance progress started successfully',
            grievance
        });
    } catch (error) {
        console.error('Error starting grievance progress:', error);
        res.status(500).json({ error: 'Failed to start grievance progress' });
    }
}; 