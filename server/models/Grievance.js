const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const resolutionDocumentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  uploadedAt: {
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
    ref: 'User',
    required: true
  },
  comment: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

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
    default: 'RTO'
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
    default: 'RTO'
  },
  district: {
    type: String,
    required: true,
    trim: true
  },
  division: {
    type: String,
    required: true,
    trim: true
  },
  taluk: {
    type: String,
    required: true,
    trim: true
  },
  petitioner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  attachments: [attachmentSchema],
  resolutionDocument: resolutionDocumentSchema,
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
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
grievanceSchema.index({ coordinates: '2dsphere' });

const Grievance = mongoose.model('Grievance', grievanceSchema);

module.exports = Grievance; 