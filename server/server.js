// // import express from 'express';
// // import connectDB from './config/db.js';
// // import registrationRoutes from './routes/registrationRoutes.js';
// // import authRoutes from './routes/authRoutes.js';
// // connectDB();
// // const app = express();
// // const PORT = process.env.PORT || 5000;

// // // Database Connection


// // // Middleware
// // app.use(express.json());

// // // Routes
// // app.use('/api', registrationRoutes);
// // app.use('/api', authRoutes);

// // // Server Listening
// // app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// import express from 'express';
// import cors from 'cors';  // Import CORS middleware
// import connectDB from './config/db.js';
// import registrationRoutes from './routes/registrationRoutes.js';
// import authRoutes from './routes/authRoutes.js';
// import petitioner from './routes/petitioner.js';
// import admin from './routes/admin.js';
// const app = express();
// const PORT = process.env.PORT || 5000;

// // Database Connection
// connectDB();

// // Middleware
// app.use(express.json());
// app.use(cors({ origin: 'http://localhost:3000' })); // ✅ Ensure React app requests are allowed

// // Routes
// app.use('/api', registrationRoutes);
// app.use('/api', authRoutes);
// app.use("/api/petitioner", require("./routes/petitioner")); // Petitioner routes
// app.use("/api/admin", require("./routes/admin"));
// // Server Listening
// app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));



import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import registrationRoutes from './routes/registrationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import petitionerRoutes from './routes/petitioner.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Database Connection
connectDB();

// Middleware
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' })); // ✅ Allow frontend requests

// Routes
app.use('/api', registrationRoutes);
app.use('/api', authRoutes);
app.use('/api/petitioner', petitionerRoutes);  // ✅ Fixed import
app.use('/api/admin', adminRoutes);  // ✅ Fixed import

// Server Listening
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
