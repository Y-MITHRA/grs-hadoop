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
import chatRoutes from './routes/chatRoutes.js';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { checkEligibleEscalations } from './controllers/grievanceController.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:5173"],
        methods: ["GET", "POST"]
    }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Database Connection
connectDB();

// Initialize escalation checker
cron.schedule('* * * * *', async () => {
    console.log('Running escalation check...');
    try {
        await checkEligibleEscalations();
    } catch (error) {
        console.error('Error in escalation check:', error);
    }
});

// Middleware
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true
}));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Routes
app.use('/api', registrationRoutes);
app.use('/api', authRoutes);
app.use('/api/petitioner', petitionerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/chat', chatRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-chat', (grievanceId) => {
        socket.join(grievanceId);
        console.log(`Client ${socket.id} joined chat room: ${grievanceId}`);
    });

    socket.on('leave-chat', (grievanceId) => {
        socket.leave(grievanceId);
        console.log(`Client ${socket.id} left chat room: ${grievanceId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Server Listening
httpServer.listen(process.env.PORT || 5000, () => console.log(`✅ Server running on port ${process.env.PORT || 5000}`));
