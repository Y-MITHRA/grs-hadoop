import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Official from '../models/Official.js';

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

// Official Login with Department Redirect
export const loginOfficial = async (req, res) => {
    try {
        const { email, password, department, employeeId } = req.body;

        // Log incoming request data (without password)
        console.log('📥 Login attempt:', {
            email,
            department,
            employeeId,
            password: '[REDACTED]'
        });

        // Check for required fields
        if (!email || !password || !department) {
            console.log('❌ Missing required fields:', { email: !!email, department: !!department, password: !!password });
            return res.status(400).json({ error: 'Email, password, and department are required' });
        }

        // Build the query
        const query = { email, department };
        if (employeeId) {
            query.employeeId = employeeId;
        }

        console.log('🔍 Searching for official with query:', query);

        // Find official by query
        const official = await Official.findOne(query);
        if (!official) {
            console.log('❌ Official not found for criteria:', {
                email,
                department,
                employeeId: employeeId || 'not provided'
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('✅ Found official:', {
            email: official.email,
            department: official.department,
            employeeId: official.employeeId,
            hasPassword: !!official.password,
            passwordType: official.password.startsWith('$2a$') ||
                official.password.startsWith('$2b$') ? 'hashed' : 'plain'
        });

        // Check if password is already hashed (for old records)
        let isPasswordValid;
        try {
            if (official.password.startsWith('$2a$') || official.password.startsWith('$2b$')) {
                // Password is already hashed, use bcrypt.compare
                isPasswordValid = await bcrypt.compare(password, official.password);
                console.log('Password comparison result (hashed):', isPasswordValid);
            } else {
                // For any plain text passwords (legacy data)
                isPasswordValid = (official.password === password);
                console.log('Password comparison result (plain):', isPasswordValid);

                // If match found, update the password to proper bcrypt hash
                if (isPasswordValid) {
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(password, salt);
                    official.password = hashedPassword;
                    await official.save();
                    console.log('Updated plain password to hashed version');
                }
            }
        } catch (error) {
            console.error('Password comparison error:', error);
            return res.status(401).json({ error: 'Error comparing passwords' });
        }

        if (!isPasswordValid) {
            console.log('❌ Password mismatch for official:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(official);

        console.log('✅ Official logged in successfully:', official.email);

        // Return user data with token
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: official._id.toString(),
                firstName: official.firstName,
                lastName: official.lastName,
                email: official.email,
                department: official.department,
                designation: official.designation,
                employeeId: official.employeeId,
                role: 'official'
            }
        });
    } catch (error) {
        console.error('❌ Error during login:', error.message);
        res.status(500).json({ error: 'Server error during login' });
    }
}; 