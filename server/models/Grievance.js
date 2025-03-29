const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
  // Petitioner Details (linked from User model)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Grievance Details
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: {
      values: ['License', 'Registration', 'Vehicle', 'Permits', 'Enforcement', 'Other'],
      message: 'Invalid department. Must be one of: License, Registration, Vehicle, Permits, Enforcement, Other'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  
  // Attachments
  attachments: [{
    filename: String,
    path: String,
    mimetype: String
  }],
  
  // Status tracking
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
    default: 'Pending'
  },
  
  // Responses
  responses: [{
    message: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Update timestamp on save
grievanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Grievance', grievanceSchema); 