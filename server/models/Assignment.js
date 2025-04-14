import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
    grievanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Grievance',
        required: true
    },
    officialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Official',
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
        default: 'Pending'
    },
    assignedDate: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Update lastUpdated timestamp before saving
assignmentSchema.pre('save', function (next) {
    this.lastUpdated = new Date();
    next();
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment; 