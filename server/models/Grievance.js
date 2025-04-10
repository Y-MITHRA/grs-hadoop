import mongoose from 'mongoose';
import Petitioner from './Petitioner.js';
import Official from './Official.js';

const chatMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'senderType'
    },
    senderType: {
        type: String,
        required: true,
        enum: ['Petitioner', 'Official']
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const statusHistorySchema = new mongoose.Schema({
    status: {
        type: String,
        required: true,
        enum: ['pending', 'assigned', 'in-progress', 'resolved', 'rejected']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'statusHistory.updatedByType'
    },
    updatedByType: {
        type: String,
        required: true,
        enum: ['petitioner', 'official', 'admin']
    },
    comment: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const resourceManagementSchema = new mongoose.Schema({
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    requirementsNeeded: {
        type: String,
        required: true
    },
    fundsRequired: {
        type: Number,
        required: true
    },
    resourcesRequired: {
        type: String,
        required: true
    },
    manpowerNeeded: {
        type: Number,
        required: true
    }
});

const timelineStageSchema = new mongoose.Schema({
    stageName: {
        type: String,
        required: true,
        enum: ['Grievance Filed', 'Under Review', 'Investigation', 'Resolution']
    },
    date: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        required: true
    }
});

const grievanceSchema = new mongoose.Schema({
    petitionId: {
        type: String,
        unique: true,
        required: true,
        default: function () {
            return `GRV${Date.now().toString().slice(-6)}`;
        }
    },
    portal_type: {
        type: String,
        required: true,
        enum: ['GRS', 'RTO', 'Water'],
        default: 'GRS'
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        enum: ['Water', 'RTO', 'Electricity']
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    coordinates: {
        type: {
            latitude: Number,
            longitude: Number
        },
        required: false
    },
    petitioner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Petitioner',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Official'
    },
    assignedOfficials: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Official'
    }],
    status: {
        type: String,
        required: true,
        enum: ['pending', 'assigned', 'in-progress', 'resolved', 'rejected'],
        default: 'pending'
    },
    statusHistory: [statusHistorySchema],
    chatMessages: [chatMessageSchema],
    originalDocument: {
        filename: String,
        path: String,
        uploadedAt: Date
    },
    resolutionDocument: {
        filename: String,
        path: String,
        uploadedAt: Date
    },
    resolution: {
        text: String,
        date: Date
    },
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        date: Date
    },
    attachments: [{
        filename: String,
        path: String,
        uploadedAt: Date
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    resourceManagement: resourceManagementSchema,
    timelineStages: [timelineStageSchema],
    isEscalated: {
        type: Boolean,
        default: false
    },
    escalatedAt: {
        type: Date
    },
    escalationReason: {
        type: String
    },
    escalatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Petitioner'
    },
    escalationStatus: {
        type: String,
        enum: ['Pending', 'Resolved'],
        default: 'Pending'
    },
    escalationResponse: {
        type: String
    },
    escalationEligible: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Update the updatedAt timestamp before saving
grievanceSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Index for faster queries
grievanceSchema.index({ department: 1, status: 1 });
grievanceSchema.index({ petitioner: 1 });
grievanceSchema.index({ assignedTo: 1 });
grievanceSchema.index({ coordinates: '2dsphere' }); // For geospatial queries

const Grievance = mongoose.model('Grievance', grievanceSchema);

export default Grievance; 