import express from 'express';
import { auth } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
import { getUserNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';

const router = express.Router();

// Get notifications for a user
router.get('/user/:userId', getUserNotifications);

// Mark a notification as read
router.put('/:notificationId/read', markAsRead);

// Mark all notifications as read for a user
router.put('/user/:userId/read-all', markAllAsRead);

// Get user's notifications
router.get('/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user is requesting their own notifications
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Not authorized to view these notifications' });
        }

        const notifications = await Notification.find({ recipient: userId })
            .populate('grievanceId', 'petitionId title')
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 notifications

        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            read: false
        });

        res.json({
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.put('/:notificationId/read', auth, async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        // Verify user owns this notification
        if (notification.recipient.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this notification' });
        }

        notification.read = true;
        await notification.save();

        res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.put('/mark-all-read/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user is updating their own notifications
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Not authorized to update these notifications' });
        }

        await Notification.updateMany(
            { recipient: userId, read: false },
            { $set: { read: true } }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// Get unread notification count
router.get('/count/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user is requesting their own count
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Not authorized to view this count' });
        }

        const count = await Notification.countDocuments({
            recipient: userId,
            read: false
        });

        res.json({ unreadCount: count });
    } catch (error) {
        console.error('Error getting notification count:', error);
        res.status(500).json({ error: 'Failed to get notification count' });
    }
});

// Create a new notification (internal use only)
router.post('/', auth, async (req, res) => {
    try {
        const { recipient, recipientModel, title, message, type, grievanceId } = req.body;

        const notification = new Notification({
            recipient,
            recipientModel,
            title,
            message,
            type,
            grievanceId
        });

        await notification.save();
        res.status(201).json({ message: 'Notification created', notification });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

export default router; 