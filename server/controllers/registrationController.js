import bcrypt from 'bcryptjs';
// import Petitioner from '../models/Petitioner.js';
import Official from '../models/Official.js';
// import Admin from '../models/Admin.js';



// Register Official// Register Official
export const registerOfficial = async (req, res) => {
    const { email, password, department } = req.body;

    try {
        console.log('📥 Received Data:', req.body);  // ✅ Log incoming data

        // Check if Official already exists
        const existingOfficial = await Official.findOne({ email });
        if (existingOfficial) {
            console.log('❌ Official Already Exists:', existingOfficial);
            return res.status(400).json({ error: 'Official already registered.' });
        }

        // Check for valid department
        const validDepartments = ['Water', 'RTO', 'Electricity'];
        if (!validDepartments.includes(department)) {
            console.log('❌ Invalid Department Selected:', department);
            return res.status(400).json({ error: 'Invalid department selected.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a clean version of req.body without undefined values
        const officialData = { ...req.body };

        // If officeCoordinates is missing or incomplete, don't include it
        if (!officialData.officeCoordinates ||
            !officialData.officeCoordinates.latitude ||
            !officialData.officeCoordinates.longitude) {
            delete officialData.officeCoordinates;
        }

        const newOfficial = new Official({
            ...officialData,
            password: hashedPassword
        });

        await newOfficial.save();
        console.log('✅ Official Registered Successfully:', newOfficial);  // ✅ Log inserted data

        res.status(201).json({ message: "Official registered successfully!" });

    } catch (error) {
        console.error('❌ Error Registering Official:', error.message);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = {};
            Object.keys(error.errors).forEach(field => {
                validationErrors[field] = error.errors[field].message;
            });

            return res.status(400).json({
                error: 'Validation error',
                validationErrors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                error: 'A record with this information already exists'
            });
        }

        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};


