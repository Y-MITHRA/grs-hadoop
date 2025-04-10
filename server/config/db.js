import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/grievance_portal', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');  // ✅ Ensure this appears in your terminal
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

export default connectDB;
