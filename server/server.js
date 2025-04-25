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
import notificationRoutes from './routes/notificationRoutes.js';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { checkEligibleEscalations } from './controllers/grievanceController.js';
import smartQueryRouter from './routes/smartQuery.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"],
        methods: ["GET", "POST", "DELETE", "PUT"]
    }
});

// Create required directories if they don't exist
const createRequiredDirectories = () => {
    const directories = [
        'uploads',
        'uploads/documents',
        'uploads/resolution-docs'
    ];

    directories.forEach(dir => {
        const fullPath = path.join(__dirname, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    });
};

// Create required directories
createRequiredDirectories();

// Database Connection
connectDB();

// Initialize escalation checker
let lastCheck = null;
cron.schedule('* * * * *', async () => {
    const now = new Date();
    console.log('\n=== Escalation Check ===');
    console.log('Time:', now.toISOString());
    if (lastCheck) {
        console.log('Time since last check:', (now - lastCheck) / 1000, 'seconds');
    }

    try {
        const eligibleCount = await checkEligibleEscalations();
        console.log(`Completed escalation check. Found ${eligibleCount} eligible grievances.`);
        lastCheck = now;
    } catch (error) {
        console.error('Failed to run escalation check:', error);
    }
    console.log('=== End Check ===\n');
});

// Middleware
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"],
    credentials: true
}));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/documents', express.static(path.join(__dirname, 'uploads/documents')));
app.use('/uploads/resolution-docs', express.static(path.join(__dirname, 'uploads/resolution-docs')));

// Routes
app.use('/api', registrationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/petitioner', petitionerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/smart-query', smartQueryRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

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
