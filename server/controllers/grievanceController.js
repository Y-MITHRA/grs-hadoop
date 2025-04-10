import Grievance from '../models/Grievance.js';
import { mapCategoryToDepartment } from '../utils/departmentMapper.js';
import Official from '../models/Official.js';

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
            manpowerNeeded
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

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        res.status(200).json({
            timelineStages: grievance.timelineStages
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

// Create new grievance
export const createGrievance = async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        console.log('User from auth middleware:', req.user);

        const { title, description, department, location, coordinates } = req.body;
        const petitioner = req.user.id;

        // Validate required fields
        if (!title || !description || !department || !location || !coordinates) {
            console.log('Missing required fields:', { title, description, department, location, coordinates });
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields: {
                    title: !title,
                    description: !description,
                    department: !department,
                    location: !location,
                    coordinates: !coordinates
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

        // Find nearest official based on location
        const officials = await Official.find({ department });
        let minDistance = Infinity;
        let nearestOfficeCoordinates = null;

        // Find the nearest office
        officials.forEach(official => {
            const distance = calculateDistance(
                coordinates.latitude,
                coordinates.longitude,
                official.officeCoordinates.latitude,
                official.officeCoordinates.longitude
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestOfficeCoordinates = official.officeCoordinates;
            }
        });

        if (!nearestOfficeCoordinates) {
            return res.status(404).json({ error: 'No officials found for the specified department' });
        }

        // Get all officials in that office
        const nearestOfficeOfficials = officials.filter(official =>
            official.officeCoordinates.latitude === nearestOfficeCoordinates.latitude &&
            official.officeCoordinates.longitude === nearestOfficeCoordinates.longitude
        );

        console.log('Nearest office officials:', nearestOfficeOfficials.map(o => ({
            id: o._id,
            name: `${o.firstName} ${o.lastName}`
        })));

        // Create new grievance
        const grievance = new Grievance({
            petitionId: `GRV${Date.now().toString().slice(-6)}`,
            title,
            description,
            department,
            location,
            coordinates,
            petitioner,
            status: 'pending',
            assignedOfficials: nearestOfficeOfficials.map(o => o._id), // Store all official IDs
            statusHistory: [{
                status: 'pending',
                updatedBy: petitioner,
                updatedByType: 'petitioner',
                comment: `Grievance submitted and pending acceptance by officials at ${nearestOfficeCoordinates.latitude}, ${nearestOfficeCoordinates.longitude}`
            }]
        });

        await grievance.save();
        console.log('Grievance saved successfully:', grievance);

        res.status(201).json({
            message: 'Grievance created successfully',
            grievance,
            assignedOfficials: nearestOfficeOfficials.map(o => ({
                id: o._id,
                name: `${o.firstName} ${o.lastName}`,
                distance: calculateDistance(
                    coordinates.latitude,
                    coordinates.longitude,
                    o.officeCoordinates.latitude,
                    o.officeCoordinates.longitude
                )
            }))
        });
    } catch (error) {
        console.error('Error creating grievance:', error);
        res.status(500).json({
            error: 'Failed to create grievance',
            details: error.message,
            validationErrors: error.errors
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

        // Get grievances with all necessary fields
        const grievances = await Grievance.find(query)
            .select('petitionId title description department location status createdAt updatedAt assignedTo assignedOfficials resolutionDocument')
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

        if (grievance.feedback) {
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
        const { department, location, coordinates } = req.body;
        const petitioner = req.user.id;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate required fields
        if (!department || !location || !coordinates) {
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields: {
                    department: !department,
                    location: !location,
                    coordinates: !coordinates
                }
            });
        }

        // Parse coordinates if they're sent as a string
        const parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;

        // Find nearest office and its officials
        const officials = await Official.find({ department });
        let minDistance = Infinity;
        let nearestOfficeCoordinates = null;

        // Find the nearest office
        officials.forEach(official => {
            const distance = calculateDistance(
                parsedCoordinates.latitude,
                parsedCoordinates.longitude,
                official.officeCoordinates.latitude,
                official.officeCoordinates.longitude
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestOfficeCoordinates = official.officeCoordinates;
            }
        });

        if (!nearestOfficeCoordinates) {
            return res.status(404).json({ error: 'No officials found for the specified department' });
        }

        // Get all officials in that office
        const nearestOfficeOfficials = officials.filter(official =>
            official.officeCoordinates.latitude === nearestOfficeCoordinates.latitude &&
            official.officeCoordinates.longitude === nearestOfficeCoordinates.longitude
        );

        console.log('Nearest office officials:', nearestOfficeOfficials.map(o => ({
            id: o._id,
            name: `${o.firstName} ${o.lastName}`
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
            assignedOfficials: nearestOfficeOfficials.map(o => o._id),
            document: {
                filename: req.file.originalname,
                path: req.file.path,
                uploadedAt: new Date()
            },
            statusHistory: [{
                status: 'pending',
                updatedBy: petitioner,
                updatedByType: 'petitioner',
                comment: `Document grievance submitted and pending acceptance by officials at ${nearestOfficeCoordinates.latitude}, ${nearestOfficeCoordinates.longitude}`
            }]
        });

        await grievance.save();
        console.log('Document grievance saved successfully:', grievance);

        res.status(201).json({
            message: 'Document grievance created successfully',
            grievance,
            assignedOfficials: nearestOfficeOfficials.map(o => ({
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
        const { escalationReason } = req.body;
        const petitionerId = req.user.id;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        // Check if petitioner owns the grievance
        if (grievance.petitioner.toString() !== petitionerId) {
            return res.status(403).json({ error: 'Not authorized to escalate this grievance' });
        }

        // Check if already escalated
        if (grievance.isEscalated) {
            return res.status(400).json({ error: 'Grievance is already escalated' });
        }

        // Update grievance with escalation details
        grievance.isEscalated = true;
        grievance.escalatedAt = new Date();
        grievance.escalationReason = escalationReason;
        grievance.escalatedBy = petitionerId;
        grievance.escalationStatus = 'Pending';

        // Add to status history
        grievance.statusHistory.push({
            status: grievance.status,
            updatedBy: petitionerId,
            updatedByType: 'petitioner',
            comment: `Grievance escalated. Reason: ${escalationReason}`
        });

        await grievance.save();

        res.status(200).json({
            message: 'Grievance escalated successfully',
            grievance
        });
    } catch (error) {
        console.error('Error escalating grievance:', error);
        res.status(500).json({
            error: 'Failed to escalate grievance',
            details: error.message
        });
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
        const { escalationResponse, newStatus, newAssignedTo } = req.body;
        const adminId = req.user.id;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        if (!grievance.isEscalated) {
            return res.status(400).json({ error: 'Grievance is not escalated' });
        }

        // Update escalation details
        grievance.escalationResponse = escalationResponse;
        grievance.escalationStatus = 'Resolved';

        // Update status if provided
        if (newStatus) {
            grievance.status = newStatus;
        }

        // Update assigned official if provided
        if (newAssignedTo) {
            grievance.assignedTo = newAssignedTo;
        }

        // Add to status history
        grievance.statusHistory.push({
            status: grievance.status,
            updatedBy: adminId,
            updatedByType: 'admin',
            comment: `Admin responded to escalation: ${escalationResponse}`
        });

        await grievance.save();

        res.status(200).json({
            message: 'Escalation response submitted successfully',
            grievance
        });
    } catch (error) {
        console.error('Error responding to escalation:', error);
        res.status(500).json({
            error: 'Failed to respond to escalation',
            details: error.message
        });
    }
};

// Check for eligible escalations (cron job)
export const checkEligibleEscalations = async () => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        console.log('Checking for eligible escalations...');
        console.log('Seven days ago:', sevenDaysAgo);

        // First, get all grievances that are not escalated
        const allGrievances = await Grievance.find({ isEscalated: false });
        console.log(`Found ${allGrievances.length} non-escalated grievances`);

        // Filter grievances in JavaScript instead of MongoDB query
        const eligibleGrievances = allGrievances.filter(grievance => {
            // Condition 1: Case in pending/assigned/start for more than 7 days
            if (['pending', 'assigned', 'start'].includes(grievance.status) &&
                grievance.createdAt < sevenDaysAgo) {
                return true;
            }

            // Condition 2: Half the days have passed without milestone updates
            if (grievance.resourceManagement &&
                grievance.resourceManagement.startDate &&
                grievance.resourceManagement.endDate) {

                // Parse dates
                const startDate = new Date(grievance.resourceManagement.startDate);
                const endDate = new Date(grievance.resourceManagement.endDate);
                const now = new Date();

                // Calculate total duration and half duration
                const totalDuration = endDate - startDate;
                const halfDuration = totalDuration / 2;

                // Check if half the time has passed
                if (now - startDate > halfDuration) {
                    // Check if no milestone updates or last update was before halfway point
                    if (!grievance.timelineStages || grievance.timelineStages.length === 0) {
                        return true; // No milestones at all
                    }

                    // Get the last milestone date
                    const lastMilestoneDate = new Date(grievance.timelineStages[grievance.timelineStages.length - 1].date);
                    const halfwayPoint = new Date(startDate.getTime() + halfDuration);

                    if (lastMilestoneDate < halfwayPoint) {
                        return true; // Last milestone was before halfway point
                    }
                }
            }

            return false;
        });

        console.log('Found eligible grievances:', eligibleGrievances.length);
        eligibleGrievances.forEach(g => {
            console.log('Eligible grievance:', {
                id: g._id,
                status: g.status,
                startDate: g.resourceManagement?.startDate,
                endDate: g.resourceManagement?.endDate,
                timelineStages: g.timelineStages?.length || 0
            });
        });

        // Mark eligible grievances
        for (const grievance of eligibleGrievances) {
            grievance.escalationEligible = true;
            await grievance.save();
        }

        console.log(`Marked ${eligibleGrievances.length} grievances as eligible for escalation`);
    } catch (error) {
        console.error('Error checking eligible escalations:', error);
    }
};
