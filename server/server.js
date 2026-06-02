require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const navigationRoutes = require('./routes/navigation');
const emergencyRoutes = require('./routes/emergency');
const fineRoutes = require('./routes/fines');
const notificationRoutes = require('./routes/notifications');
const vehicleRoutes = require('./routes/vehicles');
const documentRoutes = require('./routes/documents');
const reportRoutes = require('./routes/reports');
const contactRoutes = require('./routes/contact');
const reminderScheduler = require('./services/reminderScheduler');
const errorHandler = require('./middleware/errorHandler');
const security = require('./middleware/security');
const hotspotSeeder = require('./utils/hotspotSeeder');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// 1. Enable secure HTTP headers (Helmet)
app.use(security.secureHeaders);

// 2. Enable CORS with relaxed local origins for MERN sandbox
app.use(cors());

// 3. Set payload body parser limits to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 4. Input Sanitization against XSS payloads and MongoDB operator injections
app.use(security.sanitizeInput);

// 5. Rate Limiting Rules
app.use('/api', security.standardLimiter); // Standard rate limit
app.use('/api/fines/ocr', security.resourceLimiter); // Strict limit for CPU intensive OCR
app.use('/api/fines/upload', security.resourceLimiter); // Strict limit for CPU intensive Upload
app.use('/api/ai/chat', security.resourceLimiter); // Strict limit for AI Token operations

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'DriveLegal AI Backend',
    status: 'Running',
    timestamp: new Date().toISOString()
  });
});

// Routing Mounts
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/contact', contactRoutes);

// Centralized Global Error Handler Middleware
app.use(errorHandler);

// MongoDB Atlas connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    
    // Automatically seed the active accident hotspots ledger on MERN startup
    await hotspotSeeder.seedHotspots();
    
    // Start background node-cron reminders sweep
    reminderScheduler.start();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });
