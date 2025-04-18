import Grievance from '../models/Grievance.js';
import { mapCategoryToDepartment } from '../utils/departmentMapper.js';
import Official from '../models/Official.js';
import Admin from '../models/Admin.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Notification from '../models/Notification.js';
import { createNotification } from './notificationController.js';

// Update resource management
export const updateResourceManagement = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, requirementsNeeded, fundsRequired, resourcesRequired, manpowerNeeded } = req.body;

        // Validate required fields
        if (!startDate || !endDate || !requirementsNeeded || !fundsRequired || !resourcesRequired || !manpowerNeeded) {
            return res.status(400).json({ error: 'All resource management fields are required' });
        }

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        // Update resource management details
        grievance.resourceManagement = {
            startDate,
            endDate,
            requirementsNeeded,
            fundsRequired,
            resourcesRequired,
            manpowerNeeded,
            taluk: grievance.taluk,
            division: grievance.division,
            district: grievance.district
        };

        // Update status to in-progress if not already
        if (grievance.status !== 'in-progress') {
            grievance.status = 'in-progress';
            grievance.statusHistory.push({
                status: 'in-progress',
                updatedBy: req.user.id,
                updatedByType: 'official',
                comment: 'Resource management details added and work started'
            });
        }

        await grievance.save();

        res.status(200).json({
            message: 'Resource management details updated successfully',
            grievance
        });
    } catch (error) {
        console.error('Error updating resource management:', error);
        res.status(500).json({
            error: 'Failed to update resource management',
            details: error.message
        });
    }
};

// Get resource management details
export const getResourceManagement = async (req, res) => {
    try {
        const { id } = req.params;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        res.status(200).json({
            resourceManagement: grievance.resourceManagement
        });
    } catch (error) {
        console.error('Error getting resource management:', error);
        res.status(500).json({
            error: 'Failed to get resource management details',
            details: error.message
        });
    }
};

// Update timeline stage
export const updateTimelineStage = async (req, res) => {
    try {
        const { id } = req.params;
        const { stageName, date, description } = req.body;

        // Validate required fields
        if (!stageName || !date || !description) {
            return res.status(400).json({ error: 'All timeline stage fields are required' });
        }

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        // Add new timeline stage
        grievance.timelineStages.push({
            stageName,
            date,
            description
        });

        await grievance.save();

        res.status(200).json({
            message: 'Timeline stage added successfully',
            timelineStages: grievance.timelineStages
        });
    } catch (error) {
        console.error('Error updating timeline stage:', error);
        res.status(500).json({
            error: 'Failed to update timeline stage',
            details: error.message
        });
    }
};

// Get timeline stages
export const getTimelineStages = async (req, res) => {
    try {
        const { id } = req.params;

        const grievance = await Grievance.findOne({ petitionId: id });
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        // Start with the initial "Grievance Filed" stage
        let stages = [{
            stageName: 'Grievance Filed',
            date: grievance.createdAt,
            description: 'Grievance submitted to the system'
        }];

        // Add all other stages from the grievance
        if (grievance.timelineStages && grievance.timelineStages.length > 0) {
            stages = stages.concat(grievance.timelineStages);
        }

        // Sort stages by date
        stages.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            timelineStages: stages
        });
    } catch (error) {
        console.error('Error getting timeline stages:', error);
        res.status(500).json({
            error: 'Failed to get timeline stages',
            details: error.message
        });
    }
};

// Helper function to calculate distance between two points using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Add this function before the createGrievance function
const analyzePriorityLocally = (grievance) => {
    const description = grievance.description?.toLowerCase() || '';
    const title = grievance.title?.toLowerCase() || '';
    const combinedText = `${title} ${description}`;
    const department = grievance.department?.toLowerCase() || '';

    // Department-specific high priority keywords
    const highPriorityKeywords = {
        rto: [
            'accident', 'emergency', 'death', 'injury', 'fatal', 'collision',
            'drunk driving', 'hit and run', 'illegal', 'safety hazard',
            'dangerous driving', 'road rage', 'traffic violation'
        ],
        water: [
            'contamination', 'sewage overflow', 'flood', 'burst pipe', 'no water',
            'water quality', 'health hazard', 'drinking water', 'main break',
            'water pollution', 'toxic', 'sewage backup'
        ],
        electricity: [
            'live wire', 'electrocution', 'fire', 'power outage', 'transformer explosion',
            'electric shock', 'short circuit', 'sparking', 'fallen wire', 'emergency',
            'hospital power', 'school power'
        ]
    };

    // Department-specific medium priority keywords
    const mediumPriorityKeywords = {
        rto: [
            'license renewal', 'registration renewal', 'permit',
            'vehicle fitness', 'tax payment', 'route deviation',
            'parking violation', 'traffic congestion'
        ],
        water: [
            'low pressure', 'leakage', 'water meter', 'billing issue',
            'pipe repair', 'drainage problem', 'water connection',
            'maintenance', 'water supply'
        ],
        electricity: [
            'voltage fluctuation', 'power surge', 'frequent outages', 'meter issue',
            'connection problem', 'billing error', 'transformer noise', 'maintenance'
        ]
    };

    // Get department-specific keywords
    const deptHighPriority = highPriorityKeywords[department] || [];
    const deptMediumPriority = mediumPriorityKeywords[department] || [];

    // Check for matches
    const hasHighPriority = deptHighPriority.some(keyword => combinedText.includes(keyword));
    const hasMediumPriority = deptMediumPriority.some(keyword => combinedText.includes(keyword));

    if (hasHighPriority) {
        return {
            priority: 'High',
            explanation: 'This grievance requires immediate attention due to critical issues or safety concerns.',
            impactAssessment: 'High impact on public safety and essential services.',
            recommendedResponseTime: '24 hours'
        };
    } else if (hasMediumPriority) {
        return {
            priority: 'Medium',
            explanation: 'This grievance needs attention but is not critical.',
            impactAssessment: 'Moderate impact on services.',
            recommendedResponseTime: '3-5 working days'
        };
    } else {
        return {
            priority: 'Low',
            explanation: 'This is a routine grievance that can be handled through standard procedures.',
            impactAssessment: 'Limited impact on services.',
            recommendedResponseTime: '7-10 working days'
        };
    }
};

// Update the createGrievance function's Gemini integration
export const createGrievance = async (req, res) => {
    try {
        const {
            title,
            description,
            department,
            location,
            taluk,
            district,
            division,
            coordinates
        } = req.body;

        // Validate required fields
        if (!title || !description || !department || !location || !taluk || !district || !division) {
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields: {
                    title: !title,
                    description: !description,
                    department: !department,
                    location: !location,
                    taluk: !taluk,
                    district: !district,
                    division: !division
                }
            });
        }

        // Validate department enum
        if (!['Water', 'RTO', 'Electricity'].includes(department)) {
            return res.status(400).json({
                error: 'Invalid department',
                message: 'Department must be one of: Water, RTO, Electricity'
            });
        }

        // Find matching officials based on department, taluk, district, and division
        const matchingOfficials = await Official.find({
            department,
            taluk,
            district,
            division
        });

        if (!matchingOfficials.length) {
            return res.status(404).json({
                error: 'No officials found in the specified taluk, district, and division'
            });
        }

        // Create new grievance with all required fields
        const grievance = new Grievance({
            title: title.trim(),
            description: description.trim(),
            department,
            location: location.trim(),
            taluk: taluk.trim(),
            district: district.trim(),
            division: division.trim(),
            coordinates: coordinates || null,
            petitioner: req.user.id,
            assignedOfficials: matchingOfficials.map(official => official._id),
            status: 'pending',
            portal_type: 'GRS',
            priority: 'Medium', // Default priority
            priorityExplanation: 'Initial priority set to Medium',
            impactAssessment: 'Impact assessment pending',
            recommendedResponseTime: 'Standard response time',
            statusHistory: [{
                status: 'pending',
                updatedBy: req.user.id,
                updatedByType: 'petitioner',
                comment: 'Grievance submitted'
            }]
        });

        await grievance.save();

        // Notify all matching officials
        for (const official of matchingOfficials) {
            await Notification.create({
                recipient: official._id,
                recipientType: 'Official',
                type: 'NEW_GRIEVANCE',
                message: `A new grievance has been submitted in your jurisdiction (${taluk}, ${district}, ${division}). Please review and accept if you can handle it.`,
                grievanceId: grievance._id
            });
        }

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

        console.log('[getDepartmentGrievances] Fetching for:', {
            department,
            status,
            officialId
        });

        // First get the official's details to get their jurisdiction
        const official = await Official.findById(officialId);
        if (!official) {
            return res.status(404).json({ error: 'Official not found' });
        }

        console.log('[getDepartmentGrievances] Official Jurisdiction:', {
            taluk: official.taluk,
            district: official.district,
            division: official.division,
            officialDept: official.department
        });

        // Build query with jurisdiction
        const query = {
            department,
            taluk: official.taluk,
            district: official.district,
            division: official.division
        };

        if (status === 'pending') {
            query.status = 'pending';
            query.$or = [
                { assignedTo: null, assignedOfficials: officialId },
                { assignedTo: null, assignedOfficials: { $exists: true, $size: 0 } }
            ];
        } else if (status === 'assigned') {
            query.status = 'assigned';
            query.assignedTo = officialId;
        } else if (status === 'inProgress' || status === 'in-progress') {
            query.$and = [
                { status: { $in: ['in-progress', 'inProgress'] } },
                { assignedTo: officialId }
            ];
        } else if (status === 'resolved') {
            query.status = 'resolved';
            query.$or = [
                { assignedTo: officialId },
                { assignedOfficials: officialId }
            ];
        }

        console.log('Query parameters:', JSON.stringify(query, null, 2));

        // Get grievances with all necessary fields
        const grievances = await Grievance.find(query)
            .select('petitionId title description department location status createdAt updatedAt assignedTo assignedOfficials resolutionDocument')
            .populate('petitioner', 'name email')
            .populate('assignedTo', 'firstName lastName email')
            .sort({ createdAt: -1 });

        console.log('Found grievances:', grievances.length);

        // Get stats for the official's jurisdiction
        const stats = await Grievance.aggregate([
            {
                $match: {
                    department,
                    taluk: official.taluk,
                    district: official.district,
                    division: official.division
                }
            },
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

        // Add official to assignedOfficials array if not already present
        if (!grievance.assignedOfficials) {
            grievance.assignedOfficials = [];
        }
        if (!grievance.assignedOfficials.includes(officialId)) {
            grievance.assignedOfficials.push(officialId);
        }

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
            status: 'rejected',
            updatedBy: officialId,
            updatedByType: 'official',
            comment: `Declined: ${reason}`
        });

        // Update grievance status
        grievance.status = 'rejected';

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
        const userRole = req.user.role;

        console.log('Fetching grievances for user:', { userId, userRole });

        // Find all grievances for the user based on their role
        const query = userRole === 'petitioner'
            ? { petitioner: userId }
            : { assignedTo: userId };

        console.log('Query:', query);

        const grievances = await Grievance.find(query)
            .sort({ createdAt: -1 })
            .populate('petitioner', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email designation department');

        console.log('Found grievances:', grievances.length);

        res.json({
            success: true,
            grievances
        });
    } catch (error) {
        console.error('Error fetching user grievances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch grievances',
            details: error.message
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
        const officialDepartment = req.user.department;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        // Check if official is authorized (either assigned directly or in assignedOfficials array)
        const isAuthorized = (grievance.assignedTo && grievance.assignedTo.toString() === officialId) ||
            (grievance.assignedOfficials && grievance.assignedOfficials.includes(officialId));

        if (!isAuthorized) {
            return res.status(403).json({ error: 'Not authorized to upload resolution document' });
        }

        if (grievance.department !== officialDepartment) {
            return res.status(403).json({ error: 'Not authorized to handle grievances from other departments' });
        }

        // Update grievance with document details
        grievance.resolutionDocument = {
            filename: req.file.originalname,
            path: 'uploads/resolution-docs/' + req.file.filename,
            uploadedAt: new Date()
        };

        // Update status history
        grievance.statusHistory.push({
            status: grievance.status,
            updatedBy: officialId,
            updatedByType: 'official',
            comment: 'Resolution document uploaded'
        });

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

        if (grievance.feedback && grievance.feedback.rating) {
            return res.status(400).json({ error: 'Feedback already submitted' });
        }

        // Add feedback
        grievance.feedback = {
            rating,
            comment,
            date: new Date()
        };

        await grievance.save();

        res.json({
            message: 'Feedback submitted successfully',
            feedback: grievance.feedback
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
            'feedback': { $exists: true }
        })
            .populate('petitioner', 'name email')
            .select('title feedback resolutionDocument');

        res.json({
            feedback: grievances.map(g => ({
                title: g.title,
                feedback: g.feedback,
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

// Find nearest office for a grievance by coordinates
export const findNearestOfficeByCoordinates = async (req, res) => {
    try {
        const { department, coordinates } = req.body;

        if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
            return res.status(400).json({ error: 'Invalid coordinates provided' });
        }

        if (!department) {
            return res.status(400).json({ error: 'Department is required' });
        }

        // Define office locations (you can move these to a separate configuration file)
        const officeLocations = {
            Water: [
                { name: 'Water Board Office 1', coordinates: [13.0827, 80.2707] },
                { name: 'Water Board Office 2', coordinates: [13.0569, 80.2425] }
            ],
            RTO: [
                { name: 'RTO Office 1', coordinates: [13.0827, 80.2707] },
                { name: 'RTO Office 2', coordinates: [13.0569, 80.2425] }
            ],
            Electricity: [
                { name: 'Electricity Board Office 1', coordinates: [13.0827, 80.2707] },
                { name: 'Electricity Board Office 2', coordinates: [13.0569, 80.2425] }
            ]
        };

        const departmentOffices = officeLocations[department];
        if (!departmentOffices) {
            return res.status(400).json({ error: 'Invalid department' });
        }

        // Calculate distances to all offices
        const distances = departmentOffices.map(office => {
            const distance = calculateDistance(
                coordinates.latitude,
                coordinates.longitude,
                office.coordinates[0],
                office.coordinates[1]
            );
            return { ...office, distance };
        });

        // Sort by distance and get the nearest office
        const nearestOffice = distances.sort((a, b) => a.distance - b.distance)[0];

        // Find officials assigned to the nearest office
        const nearestOfficeOfficials = await Official.find({
            department: department,
            officeLocation: nearestOffice.name
        }).select('_id name email phone');

        res.json({
            nearestOffice,
            nearestOfficeOfficials,
            allOffices: distances
        });
    } catch (error) {
        console.error('Error finding nearest office:', error);
        res.status(500).json({ error: 'Failed to find nearest office' });
    }
};

// Upload document and create grievance
export const uploadDocumentAndCreateGrievance = async (req, res) => {
    try {
        const { department, location, coordinates, taluk, division, district } = req.body;
        const petitioner = req.user.id;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate required fields
        if (!department || !location || !coordinates || !taluk || !division || !district) {
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields: {
                    department: !department,
                    location: !location,
                    coordinates: !coordinates,
                    taluk: !taluk,
                    division: !division,
                    district: !district
                }
            });
        }

        // Parse coordinates if they're sent as a string
        const parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;

        // Find officials in the specified jurisdiction
        console.log('[uploadDocument] Finding officials with criteria:', {
            department,
            taluk,
            division,
            district
        });
        const matchingOfficials = await Official.find({
            department,
            taluk,
            division,
            district
        });

        if (matchingOfficials.length === 0) {
            return res.status(404).json({ error: 'No officials found for the specified jurisdiction' });
        }

        console.log('Found matching officials:', matchingOfficials.map(o => ({
            id: o._id,
            name: `${o.firstName} ${o.lastName}`,
            jurisdiction: `${o.taluk}, ${o.division}, ${o.district}`
        })));

        // Create new grievance with document
        const grievance = new Grievance({
            petitionId: `GRV${Date.now().toString().slice(-6)}`,
            title: `Document Grievance - ${req.file.originalname}`,
            description: `Grievance submitted via document upload from location: ${location}`,
            department,
            location,
            coordinates: parsedCoordinates,
            petitioner,
            status: 'pending',
            assignedTo: null, // Explicitly set to null for pending state
            assignedOfficials: matchingOfficials.map(o => o._id), // Assign to all matching officials
            originalDocument: {
                filename: req.file.originalname,
                path: req.file.path,
                uploadedAt: new Date()
            },
            statusHistory: [{
                status: 'pending',
                updatedBy: petitioner,
                updatedByType: 'petitioner',
                comment: `Document grievance submitted and pending acceptance by officials in ${taluk}, ${division}, ${district}`
            }],
            taluk,
            division,
            district,
            priority: 'Medium'
        });

        await grievance.save();
        console.log('Document grievance saved successfully. ID:', grievance._id);
        console.log('Assigned Officials:', grievance.assignedOfficials);

        // Create notifications for assigned officials
        for (const official of matchingOfficials) {
            await createNotification(
                official._id,
                'Official',
                'NEW_GRIEVANCE',
                `A new document-based grievance has been submitted in your jurisdiction (${taluk}, ${division}, ${district}). Please review the uploaded document and accept if you can handle it.`,
                grievance._id
            );
        }

        res.status(201).json({
            message: 'Document grievance created successfully',
            grievance,
            assignedOfficials: matchingOfficials.map(o => ({
                id: o._id,
                name: `${o.firstName} ${o.lastName}`,
                distance: calculateDistance(
                    parsedCoordinates.latitude,
                    parsedCoordinates.longitude,
                    o.officeCoordinates.latitude,
                    o.officeCoordinates.longitude
                )
            }))
        });
    } catch (error) {
        console.error('Error creating document grievance:', error);
        res.status(500).json({
            error: 'Failed to create document grievance',
            details: error.message
        });
    }
};

// Helper function to get coordinates from location string
async function getCoordinatesFromLocation(location) {
    try {
        // This is a placeholder for geocoding implementation
        // You should implement this using your preferred geocoding service
        // For example, using Google Maps Geocoding API:
        /*
        const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
            params: {
                address: location,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });

        if (response.data.results && response.data.results.length > 0) {
            const { lat, lng } = response.data.results[0].geometry.location;
            return {
                latitude: lat,
                longitude: lng
            };
        }
        */

        // For now, return dummy coordinates
        return {
            latitude: 13.0827,
            longitude: 80.2707
        };
    } catch (error) {
        console.error('Error getting coordinates:', error);
        return null;
    }
}

// Escalate grievance
export const escalateGrievance = async (req, res) => {
    try {
        const { id } = req.params;
        const grievance = await Grievance.findById(id);

        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Find all admin users
        const admins = await Admin.find({});

        // Create notification for each admin
        for (const admin of admins) {
            await createNotification(
                admin._id,
                'Admin',
                'ESCALATION',
                `A case has been escalated and requires your attention. Grievance ID: ${id}`,
                id
            );
        }

        // Update grievance - keep the current status but mark as escalated
        grievance.isEscalated = true;
        grievance.escalatedAt = new Date();

        // Add to status history with the current status
        grievance.statusHistory.push({
            status: grievance.status, // Use the current status
            updatedBy: req.user ? req.user.id : 'system',
            updatedByType: req.user ? req.user.role : 'system',
            comment: 'Grievance escalated to admin'
        });

        // Add timeline stage for escalation
        grievance.timelineStages.push({
            stageName: 'Escalated',
            date: new Date(),
            description: 'Grievance has been escalated to admin for review'
        });

        await grievance.save();

        res.json({
            message: 'Grievance escalated successfully',
            grievance
        });
    } catch (error) {
        console.error('Error escalating grievance:', error);
        res.status(500).json({ message: 'Error escalating grievance' });
    }
};

// Get escalated grievances (for admin)
export const getEscalatedGrievances = async (req, res) => {
    try {
        const escalatedGrievances = await Grievance.find({ isEscalated: true })
            .populate('petitioner', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email')
            .sort({ escalatedAt: -1 });

        res.status(200).json({
            grievances: escalatedGrievances
        });
    } catch (error) {
        console.error('Error getting escalated grievances:', error);
        res.status(500).json({
            error: 'Failed to get escalated grievances',
            details: error.message
        });
    }
};

// Respond to escalation (admin only)
export const respondToEscalation = async (req, res) => {
    try {
        const { id } = req.params;
        const { escalationResponse, newStatus, newAssignedTo, isReassignment, notification } = req.body;
        const adminId = req.user?.id;

        // Validate admin user
        if (!adminId) {
            return res.status(401).json({ error: 'Unauthorized - Admin ID not found' });
        }

        // Validate required fields
        if (!escalationResponse?.trim()) {
            return res.status(400).json({ error: 'Escalation response is required' });
        }

        // Find and update the grievance
        const grievance = await Grievance.findById(id)
            .populate('petitioner', 'firstName lastName')
            .populate('assignedTo', 'firstName lastName');

        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        // Verify that the grievance is actually escalated
        if (!grievance.isEscalated) {
            return res.status(400).json({ error: 'This grievance is not escalated' });
        }

        // Update grievance fields
        grievance.escalationResponse = escalationResponse.trim();

        // Handle reassignment
        if (isReassignment && newAssignedTo) {
            try {
                // Verify the new official exists
                const newOfficial = await Official.findById(newAssignedTo)
                    .select('firstName lastName email');
                if (!newOfficial) {
                    return res.status(400).json({ error: 'Selected official not found' });
                }

                const previousOfficialId = grievance.assignedTo?._id;
                const previousStatus = grievance.status; // Store previous status

                // Update assigned official
                grievance.assignedTo = newAssignedTo;

                // Update assignedOfficials array
                if (!grievance.assignedOfficials) {
                    grievance.assignedOfficials = [];
                }
                if (!grievance.assignedOfficials.includes(newAssignedTo)) {
                    grievance.assignedOfficials.push(newAssignedTo);
                }

                // Always preserve the previous status if it was in-progress
                if (previousStatus === 'in-progress') {
                    grievance.status = 'in-progress';

                    // Add timeline entry for reassignment with resource context
                    grievance.timelineStages.push({
                        stageName: 'Reassigned',
                        date: new Date(),
                        description: `${grievance.priority} Priority Grievance reassigned to ${newOfficial.firstName} ${newOfficial.lastName}. Previous resource requirements and in-progress status maintained.`
                    });

                    // Notification for new official about existing resources and status
                    await Notification.create({
                        recipient: newAssignedTo,
                        recipientType: 'Official',
                        type: 'CASE_REASSIGNED',
                        message: `You have been assigned grievance #${grievance.petitionId} which is currently in-progress. This case has existing resource requirements that were previously submitted.`,
                        grievanceId: grievance._id
                    });
                } else {
                    // Only set to assigned if it wasn't in-progress
                    grievance.status = 'assigned';

                    // Add timeline entry for reassignment
                    grievance.timelineStages.push({
                        stageName: 'Reassigned',
                        date: new Date(),
                        description: `${grievance.priority} Priority Grievance reassigned to ${newOfficial.firstName} ${newOfficial.lastName}`
                    });

                    // Regular notification for new official
                    await Notification.create({
                        recipient: newAssignedTo,
                        recipientType: 'Official',
                        type: 'CASE_REASSIGNED',
                        message: `You have been assigned grievance #${grievance.petitionId}. Please review and submit resource requirements if needed.`,
                        grievanceId: grievance._id
                    });
                }

                // Notification for the previous official
                if (previousOfficialId) {
                    await Notification.create({
                        recipient: previousOfficialId,
                        recipientType: 'Official',
                        type: 'REASSIGNMENT',
                        message: `WARNING: Your ${grievance.priority.toLowerCase()} priority grievance #${grievance.petitionId} has been reassigned from you to ${newOfficial.firstName} ${newOfficial.lastName}. This reassignment was made by an admin.`,
                        grievanceId: grievance._id
                    });
                }

                // Notification for the petitioner
                await Notification.create({
                    recipient: grievance.petitioner._id,
                    recipientType: 'Petitioner',
                    type: 'CASE_REASSIGNED',
                    message: `Your grievance #${grievance.petitionId} has been reassigned to a new official${previousStatus === 'in-progress' ? ' and will continue in progress' : ''}. Admin Response: ${escalationResponse.trim()}`,
                    grievanceId: grievance._id
                });

                // Remove the previous official from assignedOfficials array
                grievance.assignedOfficials = grievance.assignedOfficials.filter(
                    official => official.toString() !== previousOfficialId.toString()
                );
            } catch (error) {
                console.error('Error during reassignment:', error);
                return res.status(500).json({
                    error: 'Failed to process reassignment',
                    details: error.message
                });
            }
        } else {
            // If no reassignment, just notify the petitioner about the escalation response
            try {
                await Notification.create({
                    recipient: grievance.petitioner._id,
                    recipientType: 'Petitioner',
                    type: 'ESCALATION_RESPONSE',
                    message: `Admin has addressed your escalation for grievance #${grievance.petitionId}. Response: ${escalationResponse.trim()}`,
                    grievanceId: grievance._id,
                    createdAt: new Date()
                });

                // Also notify the current assigned official
                if (grievance.assignedTo) {
                    await Notification.create({
                        recipient: grievance.assignedTo._id,
                        recipientType: 'Official',
                        type: 'ESCALATION_RESPONSE',
                        message: `Admin has addressed the escalation for grievance #${grievance.petitionId} that you are handling.`,
                        grievanceId: grievance._id,
                        createdAt: new Date()
                    });
                }
            } catch (notificationError) {
                console.error('Error creating notifications:', notificationError);
                // Continue with the process even if notifications fail
            }
        }

        // Add escalation response to timeline
        grievance.statusHistory.push({
            status: grievance.status, // Use current status
            updatedBy: adminId,
            updatedByType: 'admin',
            comment: `Admin responded to escalation: ${escalationResponse.trim()}`
        });

        // Add timeline entry for escalation response
        grievance.timelineStages.push({
            stageName: 'Resolution',
            date: new Date(),
            description: `Escalation addressed by Admin with response: ${escalationResponse.trim()}`
        });

        // Save the updated grievance
        await grievance.save();

        res.json({
            message: 'Escalation response submitted successfully',
            grievance
        });
    } catch (error) {
        console.error('Error responding to escalation:', error);
        res.status(500).json({
            error: 'Failed to save grievance update',
            details: error.message
        });
    }
};

// Check for eligible escalations (cron job)
export const checkEligibleEscalations = async () => {
    try {
        const twoDaysAgo = new Date();
        twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        console.log('Starting escalation check...');

        // Get all unresolved and non-escalated grievances
        const allGrievances = await Grievance.find({
            isEscalated: false,
            status: { $ne: 'resolved' }
        }).populate('assignedTo').lean();

        console.log(`Found ${allGrievances.length} unresolved grievances to check`);

        // Filter grievances that need escalation
        const eligibleGrievances = allGrievances.filter(grievance => {
            // 1. High priority cases not resolved within 48 hours
            if (grievance.priority === 'High' &&
                new Date(grievance.createdAt) < twoDaysAgo) {
                console.log(`Grievance ${grievance._id} eligible: High priority not resolved within 48 hours`);
                return true;
            }

            // 2. Stuck in pending or assigned status for more than 7 days
            if (['pending', 'assigned'].includes(grievance.status) &&
                new Date(grievance.createdAt) < sevenDaysAgo) {
                console.log(`Grievance ${grievance._id} eligible: Stuck in ${grievance.status} status for over 7 days`);
                return true;
            }

            // 3. In-progress with no milestone updates after 50% timeline
            if (grievance.status === 'in-progress' &&
                grievance.resourceManagement &&
                grievance.resourceManagement.startDate &&
                grievance.resourceManagement.endDate) {

                const startDate = new Date(grievance.resourceManagement.startDate);
                const endDate = new Date(grievance.resourceManagement.endDate);
                const now = new Date();

                // Calculate timeline progress
                const totalDuration = endDate.getTime() - startDate.getTime();
                const elapsedTime = now.getTime() - startDate.getTime();
                const progressPercentage = (elapsedTime / totalDuration) * 100;

                // If we're past 50% of the timeline
                if (progressPercentage >= 50) {
                    const midPoint = new Date(startDate.getTime() + totalDuration / 2);

                    // Get the latest milestone update after the start date
                    const latestUpdate = grievance.timelineStages && grievance.timelineStages.length > 0 ?
                        grievance.timelineStages
                            .filter(stage => new Date(stage.date) > startDate)
                            .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                        : null;

                    // Check if no updates after midpoint
                    if (!latestUpdate || new Date(latestUpdate.date) < midPoint) {
                        console.log(`Grievance ${grievance._id} eligible: No milestone updates after 50% timeline (${progressPercentage.toFixed(1)}% elapsed)`);
                        return true;
                    }
                }
            }

            return false;
        });

        console.log(`Found ${eligibleGrievances.length} grievances eligible for escalation`);

        // Find all admin users
        const admins = await Admin.find({});

        // Mark eligible grievances and notify admins
        for (const grievance of eligibleGrievances) {
            const escalationReason = determineEscalationReason(grievance, twoDaysAgo, sevenDaysAgo);

            // Update grievance
            await Grievance.findByIdAndUpdate(grievance._id, {
                $set: {
                    escalationEligible: true,
                    escalationReason,
                    updatedAt: new Date()
                }
            });

            // Notify all admins
            for (const admin of admins) {
                await createNotification(
                    admin._id,
                    'Admin',
                    'ESCALATION',
                    `A case has been automatically escalated due to: ${escalationReason}. Grievance ID: ${grievance._id}`,
                    grievance._id
                );
            }

            console.log('Marked grievance for escalation:', {
                grievanceId: grievance._id,
                reason: escalationReason
            });
        }

        return eligibleGrievances.length;
    } catch (error) {
        console.error('Error checking for eligible escalations:', error);
        return 0;
    }
};

// Helper function to determine escalation reason
function determineEscalationReason(grievance, twoDaysAgo, sevenDaysAgo) {
    const reasons = [];

    // Check high priority not resolved within 48 hours
    if (grievance.priority === 'High' && new Date(grievance.createdAt) < twoDaysAgo) {
        reasons.push('High priority grievance not resolved within 48 hours');
    }

    // Check stuck in pending or assigned status
    if (['pending', 'assigned'].includes(grievance.status) &&
        new Date(grievance.createdAt) < sevenDaysAgo) {
        reasons.push(`Grievance stuck in ${grievance.status} status for over 7 days`);
    }

    // Check for missing milestone updates in in-progress state
    if (grievance.status === 'in-progress' &&
        grievance.resourceManagement &&
        grievance.resourceManagement.startDate &&
        grievance.resourceManagement.endDate) {

        const startDate = new Date(grievance.resourceManagement.startDate);
        const endDate = new Date(grievance.resourceManagement.endDate);
        const now = new Date();

        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsedTime = now.getTime() - startDate.getTime();
        const progressPercentage = (elapsedTime / totalDuration) * 100;

        if (progressPercentage >= 50) {
            const midPoint = new Date(startDate.getTime() + totalDuration / 2);
            const latestUpdate = grievance.timelineStages && grievance.timelineStages.length > 0 ?
                grievance.timelineStages
                    .filter(stage => new Date(stage.date) > startDate)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                : null;

            if (!latestUpdate || new Date(latestUpdate.date) < midPoint) {
                reasons.push(`No milestone updates after ${progressPercentage.toFixed(1)}% of timeline completion in in-progress state`);
            }
        }
    }

    return reasons.join('; ');
}

// Analyze priority using Gemini AI
export const analyzePriorityWithGemini = async (req, res) => {
    try {
        const { title, description, department } = req.body;

        if (!title || !description || !department) {
            return res.status(400).json({ error: 'Title, description, and department are required' });
        }

        // Initialize Gemini AI with error handling
        let priority = 'Medium';
        let priorityExplanation = 'Priority determined based on grievance content';
        let impactAssessment = 'Impact assessment pending';
        let recommendedResponseTime = 'Standard response time';

        try {
            if (!process.env.GEMINI_API_KEY) {
                console.error('GEMINI_API_KEY is not set in environment variables');
                throw new Error('GEMINI_API_KEY is not configured');
            }

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            });

            const prompt = {
                contents: [{
                    parts: [{
                        text: `
                            Analyze the following grievance details and determine its priority level:
                            
                            Title: ${title}
                            Description: ${description}
                            Department: ${department}
                            
                            Please analyze the severity, urgency, and impact of this grievance.
                            Consider factors like public safety, service disruption, and time sensitivity.
                            
                            Respond in this exact format:
                            PRIORITY: [High/Medium/Low]
                            PRIORITY_EXPLANATION: [Brief explanation]
                            IMPACT_ASSESSMENT: [Impact analysis]
                            RECOMMENDED_RESPONSE_TIME: [Timeframe]
                        `
                    }]
                }]
            };

            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const priorityResponse = response.text();

                // Extract priority information with better error handling
                const priorityMatch = priorityResponse.match(/PRIORITY:\\s*([^\\n]+)/i);
                const priorityExplanationMatch = priorityResponse.match(/PRIORITY_EXPLANATION:\\s*([^\\n]+)/i);
                const impactAssessmentMatch = priorityResponse.match(/IMPACT_ASSESSMENT:\\s*([^\\n]+)/i);
                const recommendedResponseTimeMatch = priorityResponse.match(/RECOMMENDED_RESPONSE_TIME:\\s*([^\\n]+)/i);

                if (priorityMatch) priority = priorityMatch[1].trim();
                if (priorityExplanationMatch) priorityExplanation = priorityExplanationMatch[1].trim();
                if (impactAssessmentMatch) impactAssessment = impactAssessmentMatch[1].trim();
                if (recommendedResponseTimeMatch) recommendedResponseTime = recommendedResponseTimeMatch[1].trim();

            } catch (aiError) {
                console.error('Error in Gemini content generation:', aiError);
                // Fallback to local priority analysis if Gemini fails
                const localResult = analyzePriorityLocally({ title, description, department });
                priority = localResult.priority;
                priorityExplanation = localResult.explanation;
                impactAssessment = localResult.impactAssessment;
                recommendedResponseTime = localResult.recommendedResponseTime;
            }
        } catch (error) {
            console.error('Error in Gemini initialization:', error);
            // Fallback to local priority analysis
            const localResult = analyzePriorityLocally({ title, description, department });
            priority = localResult.priority;
            priorityExplanation = localResult.explanation;
            impactAssessment = localResult.impactAssessment;
            recommendedResponseTime = localResult.recommendedResponseTime;
        }

        res.status(200).json({
            priority,
            priorityExplanation,
            impactAssessment,
            recommendedResponseTime
        });
    } catch (error) {
        console.error('Error analyzing priority:', error);
        res.status(500).json({
            error: 'Failed to analyze priority',
            details: error.message
        });
    }
};

// Function to calculate cosine similarity between two vectors
function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const norm1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const norm2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (norm1 * norm2);
}

// Function to check for repetitive cases
export const checkRepetitiveCases = async (req, res) => {
    try {
        const { id } = req.params;
        const { similarityThreshold = 0.8 } = req.query;

        // Find the current grievance
        const currentGrievance = await Grievance.findById(id);
        if (!currentGrievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        // Find all grievances with the same division, district, and taluk
        const locationMatches = await Grievance.find({
            _id: { $ne: currentGrievance._id }, // Exclude self
            division: currentGrievance.division,
            district: currentGrievance.district,
            taluk: currentGrievance.taluk
        }).select('_id petitionId title description division district taluk createdAt status');

        if (locationMatches.length === 0) {
            return res.json({
                hasRepetitiveCases: false,
                message: 'No grievances found in the same location'
            });
        }

        // For each location match, calculate description similarity
        const repetitiveCases = [];

        for (const grievance of locationMatches) {
            // Simple text similarity calculation (can be replaced with more sophisticated NLP)
            const similarity = calculateTextSimilarity(
                currentGrievance.description,
                grievance.description
            );

            if (similarity >= parseFloat(similarityThreshold)) {
                repetitiveCases.push({
                    ...grievance.toObject(),
                    similarity
                });
            }
        }

        return res.json({
            hasRepetitiveCases: repetitiveCases.length > 0,
            repetitiveCases,
            currentGrievance: {
                _id: currentGrievance._id,
                petitionId: currentGrievance.petitionId,
                title: currentGrievance.title,
                description: currentGrievance.description,
                division: currentGrievance.division,
                district: currentGrievance.district,
                taluk: currentGrievance.taluk
            }
        });
    } catch (error) {
        console.error('Error checking repetitive cases:', error);
        return res.status(500).json({ error: 'Failed to check repetitive cases' });
    }
};

// Simple text similarity calculation
function calculateTextSimilarity(text1, text2) {
    // Convert to lowercase and split into words
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    // Create word frequency vectors
    const wordFreq1 = {};
    const wordFreq2 = {};

    words1.forEach(word => {
        wordFreq1[word] = (wordFreq1[word] || 0) + 1;
    });

    words2.forEach(word => {
        wordFreq2[word] = (wordFreq2[word] || 0) + 1;
    });

    // Get all unique words
    const allWords = new Set([...Object.keys(wordFreq1), ...Object.keys(wordFreq2)]);

    // Create vectors
    const vec1 = [];
    const vec2 = [];

    allWords.forEach(word => {
        vec1.push(wordFreq1[word] || 0);
        vec2.push(wordFreq2[word] || 0);
    });

    // Calculate cosine similarity
    return cosineSimilarity(vec1, vec2);
}
