const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const FormData = require('form-data');
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

// IMPORTANT: Hardcoded to exactly match main-grs JWT_SECRET
// DO NOT change this value as it must match the main system exactly
const JWT_SECRET = 'grs-timeline-secure-jwt-secret-key-2024';

// Add this function after the JWT_SECRET declaration and before the User Schema
// Function to synchronize users with main GRS system
async function syncUserWithMainGRS(user) {
  try {
    // Create the payload for creating/updating petitioner in main GRS
    const petitionerData = {
      _id: user._id.toString(), // Preserve the same ID
      name: user.name,
      email: user.email,
      phone: user.phone || '0000000000', // Fallback for required field
      password: Math.random().toString(36).slice(-10), // Random password (won't be used for login)
      syncedFromPortal: 'Water'
    };

    // Generate a service token for system-to-system communication
    const serviceToken = generateServiceToken();

    // Try to find if user already exists in main GRS
    const findResponse = await axios.get(
      `http://localhost:5000/api/admin/petitioners/find-by-email/${user.email}`,
      {
        headers: {
          'Authorization': `Bearer ${serviceToken}`,
          'Content-Type': 'application/json'
        }
      }
    ).catch(error => {
      // If not found or other error, return null
      console.log('User not found in main GRS, will create new:', error.response?.status);
      return { data: null };
    });

    if (findResponse.data && findResponse.data._id) {
      // User exists, update them
      console.log('Found existing user in main GRS, updating:', findResponse.data._id);
      await axios.put(
        `http://localhost:5000/api/admin/petitioners/${findResponse.data._id}`,
        petitionerData,
        {
          headers: {
            'Authorization': `Bearer ${serviceToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      // User doesn't exist, create them
      console.log('Creating new user in main GRS with ID:', user._id);
      await axios.post(
        'http://localhost:5000/api/admin/petitioners/create-sync',
        petitionerData,
        {
          headers: {
            'Authorization': `Bearer ${serviceToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return true;
  } catch (error) {
    console.error('Failed to sync user with main GRS:', error.response?.data || error.message);
    throw error;
  }
}

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

    // Synchronize new user with main GRS system
    try {
      await syncUserWithMainGRS(savedUser);
      console.log('New user synchronized with main GRS system');
    } catch (syncError) {
      console.error('Failed to sync new user with main GRS:', syncError);
      // Continue anyway - we don't want to block registration if sync fails
    }

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

    // Synchronize user with main GRS system
    try {
      await syncUserWithMainGRS(user);
      console.log('User synchronized with main GRS system');
    } catch (syncError) {
      console.error('Failed to sync user with main GRS:', syncError);
      // Continue anyway - we don't want to block login if sync fails
    }

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
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
app.get('/api/auth/user', isAuthenticated, async (req, res) => {
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

// Generate a JWT token for the main GRS system
app.get('/api/auth/token', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Create a JWT token compatible with Main GRS
    const payload = {
      id: user._id.toString(),
      role: 'petitioner',
      department: 'Water', // Required for the Main GRS auth system
      email: user.email, // May be needed for lookup
      name: user.name,   // May be needed for display
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    // Using exact same settings as Main GRS
    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });

    console.log('Generated token for user:', user._id.toString());
    console.log('Token payload:', {
      id: payload.id,
      role: payload.role,
      department: payload.department,
      email: payload.email,
      name: payload.name,
      expiry: new Date(payload.exp * 1000).toLocaleString()
    });

    res.json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ message: 'Failed to generate token' });
  }
});

// Also add a route to check current authentication status
app.get('/api/auth/me', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || 'petitioner',
      department: user.department || 'Water'
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
});

// Proxy route that forwards grievance submissions to the Main GRS system
app.post('/api/proxy/grievances', isAuthenticated, upload.array('attachments', 5), async (req, res) => {
  try {
    const { title, description, district, division, taluk } = req.body;
    const department = 'Water Department';

    // Validate required fields
    if (!title || !description || !district || !division || !taluk) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create request payload for the Main GRS system
    const formDataToSend = new FormData();
    formDataToSend.append('title', title.trim());
    formDataToSend.append('department', department);
    formDataToSend.append('description', description.trim());
    formDataToSend.append('district', district);
    formDataToSend.append('division', division);
    formDataToSend.append('taluk', taluk);

    // Get user from database
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Create a temporary petitioner record in Main GRS if needed
    // This is where we would normally interface with the Main GRS auth system

    // For files/attachments
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // Read the file from disk
        const fileBuffer = fs.readFileSync(file.path);
        // Append it to the form data with buffer instead of Blob
        formDataToSend.append('attachments', fileBuffer, {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });
    }

    // Send the request to the Main GRS system with direct connection
    // Here we're using a service-to-service approach rather than forwarding user credentials
    const mainGRSResponse = await axios.post(
      'http://localhost:5000/api/grievances',
      formDataToSend,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          // Use admin credentials or service account
          'Authorization': 'Bearer ' + generateServiceToken()
        }
      }
    );

    // Forward the response back to the client
    res.status(mainGRSResponse.status).json(mainGRSResponse.data);
  } catch (error) {
    console.error('Proxy submission error:', error);
    res.status(500).json({ message: 'Error submitting grievance to main system' });
  }
});

// Add this function to generate a service token
function generateServiceToken() {
  // Create a special service token that Main GRS would recognize
  // In a real-world scenario, this would be handled by OAuth2 or similar
  // For now, we'll just generate a simple token
  const payload = {
    id: 'water-portal-service',
    role: 'service',
    department: 'Water',
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
