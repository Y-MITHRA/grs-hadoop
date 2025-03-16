import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import connectDB from './config/db.js';
import registrationRoutes from './routes/registrationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import petitionerRoutes from './routes/petitioner.js';
import adminRoutes from './routes/admin.js';
import grievanceRoutes from './routes/grievanceRoutes.js';
import fs from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Database Connection
connectDB();

// Middleware
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' }));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Routes
app.use('/api', registrationRoutes);
app.use('/api', authRoutes);
app.use('/api/petitioner', petitionerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/grievances', grievanceRoutes);

// Server Listening
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
