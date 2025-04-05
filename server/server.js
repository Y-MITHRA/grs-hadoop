const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000', // Main GRS portal
    'http://localhost:3001', // RTO Portal
    'http://localhost:3002', // Water Portal
    'http://localhost:3003'  // Admin Portal
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // Session TTL (1 day)
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // Cookie max age (1 day)
  }
}));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grievance_portal')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  department: { type: String, default: 'Water' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Grievance Schema
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
    default: 'Water'
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
    default: 'Water Department'
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
  statusHistory: [{
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
  }],
  chatMessages: [{
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
  }],
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.'));
    }
  }
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    console.log('No session or userId found:', req.session);
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
};

// Routes
// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (phone && !phone.match(/^[0-9]{10}$/)) {
      return res.status(400).json({ message: 'If provided, phone number must be 10 digits' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      name,
      phone,
      department: 'Water' // Set default department
    });

    const savedUser = await user.save();
    // Create a sanitized user object without the password
    const userResponse = {
      id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      department: savedUser.department,
      role: savedUser.role
    };
    res.status(201).json({ message: 'User registered successfully', user: userResponse });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message || 'Registration failed' });
  }
});

// Login

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.userId = user._id;
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});



// Get current user
app.get('/api/user', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Grievance routes
// Submit grievance
app.post('/api/grievances', isAuthenticated, upload.array('attachments', 5), async (req, res) => {
  try {
    const { title, description, location, coordinates } = req.body;
    
    // Enforce Water Department
    const department = 'Water';

    // Validate required fields
    if (!title || !description || !location) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find nearest officials from main GRS portal
    let nearestOfficeOfficials = [];
    try {
      // Create a temporary grievance ID for finding nearest office
      const tempId = `temp_${Date.now()}`;
      const grsResponse = await axios.post('http://localhost:5000/api/grievances/find-nearest-office', {
        department: 'Water',
        coordinates: coordinates ? JSON.parse(coordinates) : null
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      nearestOfficeOfficials = grsResponse.data.nearestOfficeOfficials;
    } catch (error) {
      console.error('Error finding nearest officials:', error);
    }

    // Create new grievance
    const grievance = new Grievance({
      title: title.trim(),
      department,
      description: description.trim(),
      location: location.trim(),
      coordinates: coordinates ? JSON.parse(coordinates) : null,
      petitioner: req.session.userId,
      status: 'pending',
      assignedOfficials: nearestOfficeOfficials
    });

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      grievance.attachments = req.files.map(file => file.path);
    }

    await grievance.save();
    res.status(201).json({ message: 'Grievance submitted successfully', grievance });
  } catch (error) {
    console.error('Grievance submission error:', error);
    res.status(500).json({ message: 'Error submitting grievance' });
  }
});

// Get user's grievances
app.get('/api/grievances', isAuthenticated, async (req, res) => {
  try {
    const grievances = await Grievance.find({
      petitioner: req.session.userId,
      department: 'Water'
    }).sort({ createdAt: -1 });
    res.json(grievances);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get single grievance
app.get('/api/grievances/:id', isAuthenticated, async (req, res) => {
  try {
    const grievance = await Grievance.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    res.json(grievance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
