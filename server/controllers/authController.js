import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Official from '../models/Official.js';
import Petitioner from '../models/Petitioner.js';
import Admin from '../models/Admin.js';
import Grievance from '../models/Grievance.js';

// Use the same secret as the client
const JWT_SECRET = 'your-secret-key';

const generateToken = (user) => {
    if (!user || !user._id) {
        throw new Error('Invalid user object');
    }

    const payload = {
        id: user._id.toString(),
        role: (user.role || 'petitioner').toLowerCase(), // Default to petitioner if role is undefined
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
};

// Token Refresh
export const refreshToken = async (req, res) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'No authentication token provided',
                code: 'TOKEN_MISSING'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

        let user;
        switch (decoded.role) {
            case 'petitioner':
                user = await Petitioner.findById(decoded.id);
                break;
            case 'official':
                user = await Official.findById(decoded.id);
                break;
            case 'admin':
                user = await Admin.findById(decoded.id);
                break;
            default:
                return res.status(401).json({
                    message: 'Invalid user role',
                    code: 'INVALID_ROLE'
                });
        }

        if (!user) {
            return res.status(401).json({
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Generate new token
        const newToken = generateToken(user);

        res.json({
            token: newToken,
            user: {
                id: user._id.toString(),
                name: user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`.trim()
                    : (user.name || `${user.email.split('@')[0]}`),
                email: user.email,
                role: decoded.role,
                ...(decoded.department && { department: decoded.department })
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            message: 'Failed to refresh token',
            code: 'REFRESH_FAILED'
        });
    }
};

// Petitioner Login
export const loginPetitioner = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Log incoming request data (without password)
        console.log('📥 Petitioner Login attempt:', {
            email,
            password: '[REDACTED]'
        });

        // Check for required fields
        if (!email || !password) {
            console.log('❌ Missing required fields:', { email: !!email, password: !!password });
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find petitioner by email
        const petitioner = await Petitioner.findOne({ email });
        if (!petitioner) {
            console.log('❌ Petitioner not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, petitioner.password);
        if (!isPasswordValid) {
            console.log('❌ Password mismatch for petitioner:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set role explicitly before generating token
        petitioner.role = 'petitioner';

        // Generate JWT token
        const token = generateToken(petitioner);

        console.log('✅ Petitioner logged in successfully:', petitioner.email);

        // Return user data with token
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: petitioner._id.toString(),
                firstName: petitioner.firstName,
                lastName: petitioner.lastName,
                email: petitioner.email,
                role: 'petitioner'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Official Login
export const loginOfficial = async (req, res) => {
    try {
        const { email, password, department, employeeId } = req.body;

        // Find official by email
        const official = await Official.findOne({ email });
        if (!official) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, official.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(official);

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: official._id.toString(),
                firstName: official.firstName,
                lastName: official.lastName,
                email: official.email,
                role: 'official',
                department: official.department
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin Login
export const loginAdmin = async (req, res) => {
    try {
        const { email, password, adminId } = req.body;

        // Find admin by email
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(admin);

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: admin._id.toString(),
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                role: 'admin'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get current user
export const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Return user data without sensitive information
        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            ...(user.department && { department: user.department })
        });
    } catch (error) {
        console.error('Error getting current user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Register Petitioner
export const registerPetitioner = async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields',
                errors: {
                    name: !name ? 'Name is required' : undefined,
                    email: !email ? 'Email is required' : undefined,
                    password: !password ? 'Password is required' : undefined
                }
            });
        }

        // Check if user already exists
        const existingUser = await Petitioner.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new petitioner
        const petitioner = new Petitioner({
            name,
            email,
            password: hashedPassword,
            phone,
            address
        });

        await petitioner.save();

        // Generate token
        const token = generateToken(petitioner._id, 'petitioner');

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                token,
                user: {
                    id: petitioner._id,
                    name: petitioner.name,
                    email: petitioner.email,
                    role: 'petitioner'
                }
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
}; 

// Get resource management data from all departments
export const getResourceManagementData = async (req, res) => {
    try {
        const grievances = await Grievance.find({
            resourceManagement: { $exists: true },
            'resourceManagement.startDate': { $exists: true }
        })
        .select('department resourceManagement status petitionId')
        .lean();

        const resources = grievances.map(grievance => ({
            _id: grievance._id,
            department: grievance.department,
            grievanceId: grievance.petitionId,
            startDate: grievance.resourceManagement.startDate,
            endDate: grievance.resourceManagement.endDate,
            requirementsNeeded: grievance.resourceManagement.requirementsNeeded,
            fundsRequired: grievance.resourceManagement.fundsRequired,
            resourcesRequired: grievance.resourceManagement.resourcesRequired,
            manpowerNeeded: grievance.resourceManagement.manpowerNeeded,
            status: grievance.status === 'resolved' ? 'Completed' : 'In Progress'
        }));

        res.json({ resources });
    } catch (error) {
        console.error('Error fetching resource management data:', error);
        res.status(500).json({ message: 'Error fetching resource management data' });
    }
};