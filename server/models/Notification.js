import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'recipientType'
    },
    recipientType: {
        type: String,
        required: true,
        enum: ['User', 'Official', 'Admin', 'Petitioner']
    },
    type: {
        type: String,
        required: true,
        enum: ['HIGH_PRIORITY', 'REASSIGNMENT', 'ESCALATION', 'CASE_REASSIGNED', 'NEW_GRIEVANCE']
    },
    message: {
        type: String,
        required: true
    },
    grievanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Grievance'
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification; 