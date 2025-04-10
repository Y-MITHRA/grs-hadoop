import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Official from '../models/Official.js';

const createTestOfficials = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/grievance-system', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const departments = ['RTO', 'Electricity'];
        const hashedPassword = await bcrypt.hash('password123', 10);

        for (const department of departments) {
            // Check if official already exists for the department
            const existingOfficial = await Official.findOne({ department });
            if (existingOfficial) {
                console.log(`Official already exists for ${department} department`);
                continue;
            }

            const official = new Official({
                firstName: `${department}`,
                lastName: 'Official',
                email: `${department.toLowerCase()}@example.com`,
                phone: '9876543210',
                employeeId: `${department}-001`,
                department: department,
                designation: 'Department Head',
                officeAddress: 'Main Office Complex',
                city: 'Chennai',
                state: 'Tamil Nadu',
                pincode: '600001',
                officeCoordinates: {
                    latitude: 13.0827,
                    longitude: 80.2707
                },
                password: hashedPassword
            });

            await official.save();
            console.log(`Created test official for ${department} department`);
        }

        console.log('Test officials created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating test officials:', error);
        process.exit(1);
    }
};

createTestOfficials();
