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
    required: [true, 'Title is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['License', 'Registration', 'Vehicle', 'Permits', 'Enforcement', 'Other']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  location: {
    type: String,
    required: [true, 'Location is required']
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
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
grievanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Grievance', grievanceSchema); 