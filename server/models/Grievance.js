import mongoose from 'mongoose';

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
        enum: ['pending', 'assigned', 'in-progress', 'resolved', 'declined'],
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
            ref: 'Petitioner'
        }
    },
    assignedTo: {
        officialId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Official',
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
    declinedBy: [{
        officialId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Official',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        reason: String,
        declinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    chatMessages: [{
        sender: {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            role: {
                type: String,
                enum: ['petitioner', 'official'],
                required: true
            },
            name: {
                type: String,
                required: true
            }
        },
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        read: {
            type: Boolean,
            default: false
        }
    }],
    notifications: [{
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        read: {
            type: Boolean,
            default: false
        }
    }],
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
grievanceSchema.index({ 'assignedTo.officialId': 1 });
grievanceSchema.index({ 'declinedBy.officialId': 1 });

const Grievance = mongoose.model('Grievance', grievanceSchema);

export default Grievance; 