const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

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
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Grievance Schema
const grievanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  title: { type: String, required: true },
  department: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  attachments: [{ type: String }], // Store file paths or URLs
  status: { type: String, enum: ['pending', 'in-progress', 'resolved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Grievance = mongoose.model('Grievance', grievanceSchema);

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Routes
// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    
    if (!phone || !phone.match(/^[0-9]{10}$/)) {
      return res.status(400).json({ message: 'Please provide a valid 10-digit phone number' });
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
      phone
    });
    
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message || 'Registration failed' });
  }
});

// Login

app.post('/api/login', async (req, res) => {
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
app.post('/api/grievances', isAuthenticated, async (req, res) => {
  try {
    const { title, description, department, name, email, location } = req.body;
    const grievance = new Grievance({
      userId: req.session.userId,
      title,
      description,
      department,
      name,
      email,
      location,
      attachments: req.body.attachments || []
    });
    
    await grievance.save();
    res.status(201).json(grievance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's grievances
app.get('/api/grievances', isAuthenticated, async (req, res) => {
  try {
    const grievances = await Grievance.find({ userId: req.session.userId })
      .sort({ createdAt: -1 });
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
