import jwt from 'jsonwebtoken';
import Petitioner from '../models/Petitioner.js';
import Official from '../models/Official.js';
import Admin from '../models/Admin.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv to look for .env file in the server root directory
dotenv.config({ path: path.join(dirname(__dirname), '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

export const generateToken = (user) => {
    const payload = {
        id: user._id.toString(),
        role: user.role.toLowerCase(),
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

const auth = async (req, res, next) => {
    try {
        // Log headers for debugging
        console.log('Auth Headers:', req.headers);

        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            console.log('No token provided');
            return res.status(401).json({
                message: 'No authentication token, access denied',
                code: 'TOKEN_MISSING'
            });
        }

        let decoded;
        try {
            decoded = verifyToken(token);
            console.log('Decoded token:', decoded);
        } catch (error) {
            console.log('Token verification failed:', error.message);
            return res.status(401).json({
                message: error.message,
                code: error.message === 'Token has expired' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
            });
        }

        if (!decoded.id || !decoded.role) {
            console.log('Token missing required fields:', decoded);
            return res.status(401).json({
                message: 'Invalid token format',
                code: 'TOKEN_INVALID_FORMAT'
            });
        }

        let user;
        try {
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
                    throw new Error('Invalid user role');
            }

            if (!user) {
                console.log('No user found for token');
                return res.status(401).json({
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Add user info to request
            req.user = {
                id: user._id.toString(),
                name: user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`.trim()
                    : (user.name || `${user.email.split('@')[0]}`),  // Fallback to email prefix if no name
                email: user.email,
                role: decoded.role,
                ...(decoded.department && { department: decoded.department }),
                // Add these fields for debugging
                _raw: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    id: user._id
                }
            };

            // Log complete user object for debugging
            console.log('Auth middleware complete user object:', {
                provided: req.user,
                original: user.toObject()
            });

            // Check token expiration and send warning if close to expiry
            const expiryTime = new Date(decoded.exp * 1000);
            const now = new Date();
            const timeUntilExpiry = expiryTime - now;
            const warningThreshold = 5 * 60 * 1000; // 5 minutes

            if (timeUntilExpiry < warningThreshold) {
                res.set('X-Token-Expiring-Soon', 'true');
                res.set('X-Token-Expires-In', Math.floor(timeUntilExpiry / 1000));
            }

            console.log('Auth successful for user:', req.user.email);
            next();
        } catch (error) {
            console.error('Database lookup failed:', error.message);
            return res.status(401).json({
                message: 'Error verifying user identity',
                code: 'USER_LOOKUP_FAILED'
            });
        }
    } catch (error) {
        console.error('Auth Error:', error.message);
        res.status(401).json({
            message: 'Authentication failed',
            code: 'AUTH_FAILED'
        });
    }
};

export default auth; 