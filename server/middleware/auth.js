import jwt from 'jsonwebtoken';
import Petitioner from '../models/Petitioner.js';
import Official from '../models/Official.js';
import Admin from '../models/Admin.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import mongoose from 'mongoose';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv to look for .env file in the server root directory
dotenv.config({ path: path.join(dirname(__dirname), '.env') });

// Use the same secret as the client
const JWT_SECRET = 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

export const generateToken = (user) => {
    if (!user || !user._id) {
        throw new Error('Invalid user object');
    }

    const payload = {
        id: user._id.toString(),
        role: (user.role || 'petitioner').toLowerCase(),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
};

export const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        return {
            ...decoded,
            id: decoded.id.toString(),
            role: decoded.role.toLowerCase()
        };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        }
        throw new Error('Invalid token');
    }
};

export const auth = async (req, res, next) => {
    try {
        // Log request headers for debugging
        console.log('Auth Headers:', req.headers);

        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ No Bearer token found');
            return res.status(401).json({
                message: 'No authentication token provided',
                code: 'TOKEN_MISSING'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // First decode without verification to check expiration
        const decoded = jwt.decode(token);
        if (!decoded) {
            console.error('Token decode failed');
            return res.status(401).json({
                message: 'Invalid token format',
                code: 'INVALID_TOKEN'
            });
        }

        // Check if token is expired
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            console.error('Token expired');
            return res.status(401).json({
                message: 'Token has expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        // Now verify the token
        const verified = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

        // Look up user based on role and ID
        let user;
        switch (verified.role) {
            case 'petitioner':
                user = await Petitioner.findById(verified.id);
                break;
            case 'official':
                user = await Official.findById(verified.id);
                break;
            case 'admin':
                user = await Admin.findById(verified.id);
                break;
            default:
                return res.status(401).json({
                    message: 'Invalid user role',
                    code: 'INVALID_ROLE'
                });
        }

        if (!user) {
            console.error('User not found:', verified.id);
            return res.status(401).json({
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Add user info to request
        req.user = {
            id: user._id.toString(),
            role: verified.role,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            ...(user.department && { department: user.department })
        };

        console.log('✅ Authentication successful for user:', user.email);
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({
            message: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
};

export default auth; 