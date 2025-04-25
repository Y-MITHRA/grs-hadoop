import express from 'express';
import Petitioner from '../models/Petitioner.js';
import bcrypt from 'bcryptjs';
import auth from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Find petitioner by email
router.get('/petitioners/find-by-email/:email', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'service') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins can use this endpoint'
            });
        }

        const { email } = req.params;
        const petitioner = await Petitioner.findOne({ email });

        if (!petitioner) {
            return res.status(404).json({
                success: false,
                message: 'Petitioner not found'
            });
        }

        res.json(petitioner);
    } catch (error) {
        console.error('Error finding petitioner by email:', error);
        res.status(500).json({
            success: false,
            message: 'Error finding petitioner',
            error: error.message
        });
    }
});

// Create a new petitioner with system-provided ID (only for cross-system sync)
router.post('/petitioners/create-sync', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'service') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins can create petitioners'
            });
        }

        const { _id, name, email, phone, password, syncedFromPortal } = req.body;

        // Validation
        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if email already exists
        const existingUser = await Petitioner.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already in use'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Split name into firstName and lastName
        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || ''; // In case there's no last name

        // Create petitioner with the provided ID
        const petitioner = new Petitioner({
            _id: new mongoose.Types.ObjectId(_id), // Use the provided ID
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword,
            syncedFromPortal: syncedFromPortal || 'Unknown'
        });

        await petitioner.save();

        console.log(`Petitioner created for portal sync: ${email} (ID: ${_id}) from ${syncedFromPortal}`);

        res.status(201).json({
            success: true,
            message: 'Petitioner created successfully',
            petitionerId: petitioner._id
        });
    } catch (error) {
        console.error('Error creating petitioner:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating petitioner',
            error: error.message
        });
    }
});

// Update a petitioner
router.put('/petitioners/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'service') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins can update petitioners'
            });
        }

        const { id } = req.params;
        const { name, email, phone } = req.body;

        // Find petitioner
        const petitioner = await Petitioner.findById(id);
        if (!petitioner) {
            return res.status(404).json({
                success: false,
                message: 'Petitioner not found'
            });
        }

        // Update fields
        if (name) {
            const nameParts = name.split(' ');
            petitioner.firstName = nameParts[0];
            petitioner.lastName = nameParts.slice(1).join(' ') || '';
        }

        if (email) petitioner.email = email;
        if (phone) petitioner.phone = phone;

        await petitioner.save();

        res.json({
            success: true,
            message: 'Petitioner updated successfully'
        });
    } catch (error) {
        console.error('Error updating petitioner:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating petitioner',
            error: error.message
        });
    }
});

export default router; 