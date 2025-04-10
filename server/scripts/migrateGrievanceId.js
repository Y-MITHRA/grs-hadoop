import mongoose from 'mongoose';
import Grievance from '../models/Grievance.js';

const migrateGrievanceId = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/grievance_portal');
        console.log('Connected to MongoDB');

        // Drop the old index on grievanceId
        await mongoose.connection.collection('grievances').dropIndex('grievanceId_1');
        console.log('Dropped old grievanceId index');

        // Update all existing documents to use petitionId instead of grievanceId
        const grievances = await Grievance.find({});
        for (const grievance of grievances) {
            if (grievance.grievanceId) {
                grievance.petitionId = grievance.grievanceId;
                await grievance.save();
            }
        }
        console.log('Updated existing documents');

        // Create new index on petitionId
        await Grievance.collection.createIndex({ petitionId: 1 }, { unique: true });
        console.log('Created new petitionId index');

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateGrievanceId(); 