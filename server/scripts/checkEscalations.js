import cron from 'node-cron';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { checkEligibleEscalations } from '../controllers/grievanceController.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB for escalation checks'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schedule the job to run every day at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily escalation check...');
    try {
        await checkEligibleEscalations();
    } catch (error) {
        console.error('Error in escalation check:', error);
    }
});

// Keep the script running
process.on('SIGINT', () => {
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
}); 