const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
    petitionId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        enum: ['Water', 'RTO', 'Electricity']
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    attachment: {
        type: String,
        required: false
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'assigned', 'in-progress', 'resolved'],
        default: 'pending'
    },
    petitioner: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    },
    assignedTo: {
        officialId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        name: {
            type: String,
            default: null
        },
        assignedAt: {
            type: Date,
            default: null
        }
    },
    comments: [{
        text: {
            type: String,
            required: true
        },
        author: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    resolution: {
        text: {
            type: String,
            default: null
        },
        resolvedAt: {
            type: Date,
            default: null
        }
    }
}, {
    timestamps: true
});

// Create indexes for better query performance
grievanceSchema.index({ 'petitioner.userId': 1 });
grievanceSchema.index({ department: 1 });
grievanceSchema.index({ status: 1 });
grievanceSchema.index({ petitionId: 1 }, { unique: true });

const Grievance = mongoose.model('Grievance', grievanceSchema);

module.exports = Grievance; 