import chatRoutes from './routes/chatRoutes.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/chat', chatRoutes); 