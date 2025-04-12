import express from 'express';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { generateToken } from '../middleware/auth.js';
import { getResourceManagementData } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';
import Official from '../models/Official.js';
import Grievance from '../models/Grievance.js';

const router = express.Router();

// ✅ Admin Registration
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, adminId, position, password, confirmPassword } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !phone || !adminId || !position || !password || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate password match
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character' });
        }

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ $or: [{ email }, { adminId }] });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin ID or Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new admin
        const newAdmin = new Admin({ firstName, lastName, email, phone, adminId, position, password: hashedPassword });
        await newAdmin.save();

        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Admin Login with JWT
router.post('/login', async (req, res) => {
    try {
        const { adminId, email, password } = req.body;

        // Validate input
        if (!adminId && !email) {
            return res.status(400).json({ message: 'Admin ID or Email is required' });
        }
        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // Find admin by either Admin ID or Email
        const admin = await Admin.findOne({ $or: [{ adminId }, { email }] });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid Admin ID or Email' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Add role for token generation
        const adminWithRole = {
            ...admin.toObject(),
            role: 'admin'
        };

        // Generate JWT token
        const token = generateToken(adminWithRole);

        // Prepare user data for response
        const userData = {
            id: admin._id,
            adminId: admin.adminId,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: 'admin',
            position: admin.position
        };

        res.status(200).json({
            message: 'Login successful',
            token,
            user: userData
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get resource management data from all departments
router.get('/resource-management', auth, async (req, res) => {
    try {
        // Call the controller directly
        await getResourceManagementData(req, res);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all officials
router.get('/officials', auth, async (req, res) => {
    try {
        const officials = await Official.find()
            .select('firstName lastName department email');
        res.json({ officials });
    } catch (error) {
        console.error('Error fetching officials:', error);
        res.status(500).json({ error: 'Failed to fetch officials' });
    }
});

// Get department statistics
router.get('/department-stats', auth, async (req, res) => {
    try {
        const departments = ['Water', 'RTO', 'Electricity'];
        const departmentStats = [];

        for (const department of departments) {
            const stats = {
                department,
                resolved: await Grievance.countDocuments({ department, status: 'resolved' }),
                pending: await Grievance.countDocuments({ department, status: 'pending' }),
                inProgress: await Grievance.countDocuments({ department, status: 'in-progress' })
            };
            departmentStats.push(stats);
        }

        res.json({ departmentStats });
    } catch (error) {
        console.error('Error fetching department statistics:', error);
        res.status(500).json({ message: 'Error fetching department statistics' });
    }
});

// Get monthly statistics
router.get('/monthly-stats', auth, async (req, res) => {
    try {
        const monthlyStats = [];
        const currentDate = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Get stats for the last 6 months
        for (let i = 5; i >= 0; i--) {
            const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

            const total = await Grievance.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate }
            });

            const resolved = await Grievance.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate },
                status: 'resolved'
            });

            monthlyStats.push({
                month: months[startDate.getMonth()],
                total,
                resolved
            });
        }

        res.json({ monthlyStats });
    } catch (error) {
        console.error('Error fetching monthly statistics:', error);
        res.status(500).json({ message: 'Error fetching monthly statistics' });
    }
});

// Get quick statistics
router.get('/quick-stats', auth, async (req, res) => {
    try {
        const totalCases = await Grievance.countDocuments();
        const activeCases = await Grievance.countDocuments({
            status: { $in: ['pending', 'assigned', 'in-progress'] }
        });
        const resolvedCases = await Grievance.countDocuments({ status: 'resolved' });
        const departments = ['Water', 'RTO', 'Electricity'].length;

        // Calculate trends (comparing with last month)
        const lastMonthStart = new Date();
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        lastMonthStart.setDate(1);
        const lastMonthEnd = new Date();
        lastMonthEnd.setDate(0);

        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        const thisMonthEnd = new Date();

        const lastMonthTotal = await Grievance.countDocuments({
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        });
        const thisMonthTotal = await Grievance.countDocuments({
            createdAt: { $gte: thisMonthStart, $lte: thisMonthEnd }
        });

        const lastMonthActive = await Grievance.countDocuments({
            status: { $in: ['pending', 'assigned', 'in-progress'] },
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        });
        const thisMonthActive = await Grievance.countDocuments({
            status: { $in: ['pending', 'assigned', 'in-progress'] },
            createdAt: { $gte: thisMonthStart, $lte: thisMonthEnd }
        });

        const lastMonthResolved = await Grievance.countDocuments({
            status: 'resolved',
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        });
        const thisMonthResolved = await Grievance.countDocuments({
            status: 'resolved',
            createdAt: { $gte: thisMonthStart, $lte: thisMonthEnd }
        });

        // Calculate percentage changes
        const calculateTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? '+100%' : '0%';
            const change = ((current - previous) / previous) * 100;
            return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
        };

        const stats = {
            totalCases: {
                value: totalCases,
                trend: calculateTrend(thisMonthTotal, lastMonthTotal)
            },
            activeCases: {
                value: activeCases,
                trend: calculateTrend(thisMonthActive, lastMonthActive)
            },
            resolvedCases: {
                value: resolvedCases,
                trend: calculateTrend(thisMonthResolved, lastMonthResolved)
            },
            departments: {
                value: departments,
                trend: 'Stable'
            }
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching quick statistics:', error);
        res.status(500).json({ message: 'Error fetching quick statistics' });
    }
});

export default router;
