import mongoose from 'mongoose';

const resourceManagementSchema = new mongoose.Schema({
    department: {
        type: String,
        required: true,
        enum: ['water', 'electricity', 'rto', 'health', 'education']
    },
    petitionId: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    estimatedCost: {
        type: Number,
        required: true
    },
    requirements: [{
        type: String
    }],
    status: {
        type: String,
        required: true,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Official'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const ResourceManagement = mongoose.model('ResourceManagement', resourceManagementSchema);

export default ResourceManagement; 