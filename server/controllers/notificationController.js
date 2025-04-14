import Notification from '../models/Notification.js';

// Create a new notification
export const createNotification = async (recipientId, recipientType, type, message, grievanceId = null) => {
    try {
        const notification = new Notification({
            recipient: recipientId,
            recipientType,
            type,
            message,
            grievanceId
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

// Get notifications for a user
export const getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .populate('grievanceId');
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { read: true },
            { new: true }
        );
        res.json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error marking notification as read' });
    }
};

// Mark all notifications as read for a user
export const markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        await Notification.updateMany(
            { recipient: userId, read: false },
            { read: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Error marking all notifications as read' });
    }
}; 