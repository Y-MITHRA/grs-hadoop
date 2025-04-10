import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Official from '../models/Official.js';
// Import the redirect helper if you have it
// import { getOfficialDashboard } from '../utils/redirectHelper.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const generateToken = (user) => {
    const payload = {
        id: user._id.toString(),
        role: 'official',
        department: user.department,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
};

// Register Official
export const registerOfficial = async (req, res) => {
    const {
        email,
        password,
        department,
        firstName,
        lastName,
        phone,
        employeeId,
        designation,
        officeAddress,
        city,
        state,
        pincode
    } = req.body;

    try {
        console.log('📥 Registration attempt:', {
            email,
            department,
            firstName,
            lastName,
            employeeId,
            password: '[REDACTED]'
        });

        // Check if Official already exists
        const existingOfficial = await Official.findOne({ email });
        if (existingOfficial) {
            console.log('❌ Official Already Exists:', existingOfficial.email);
            return res.status(400).json({ error: 'Official already registered.' });
        }

        // Check for valid department
        const validDepartments = ['Water', 'RTO', 'Electricity'];
        if (!validDepartments.includes(department)) {
            console.log('❌ Invalid Department Selected:', department);
            return res.status(400).json({ error: 'Invalid department selected.' });
        }

        // Hash password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        console.log('Password hashed successfully');

        // Create new official with hashed password
        const newOfficial = new Official({
            firstName,
            lastName,
            email,
            phone,
            employeeId,
            department,
            designation,
            officeAddress,
            city,
            state,
            pincode,
            password: hashedPassword,
            officeCoordinates: req.body.officeCoordinates
        });

        await newOfficial.save();
        console.log('✅ Official Registered Successfully:', {
            email: newOfficial.email,
            department: newOfficial.department,
            employeeId: newOfficial.employeeId
        });

        res.status(201).json({ message: "Official registered successfully!" });

    } catch (error) {
        console.error('❌ Error Registering Official:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Temporary endpoint to debug official data
export const checkOfficialData = async (req, res) => {
    try {
        const email = req.query.email || 'joshnaa@gmail.com';
        const official = await Official.findOne({ email });

        if (official) {
            res.json({
                found: true,
                data: {
                    email: official.email,
                    department: official.department,
                    firstName: official.firstName,
                    lastName: official.lastName,
                    employeeId: official.employeeId,
                    hasPassword: !!official.password,
                    passwordType: official.password.startsWith('$2a$') ||
                        official.password.startsWith('$2b$') ? 'hashed' : 'plain',
                    passwordFirstChars: official.password.substring(0, 10) + '...'
                }
            });
        } else {
            res.json({
                found: false,
                message: `No official found with email: ${email}`
            });
        }
    } catch (error) {
        console.error('❌ Error checking official:', error);
        res.status(500).json({ error: 'Server error checking official' });
    }
};