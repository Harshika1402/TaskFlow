const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from parent .env or backend .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback to local directory

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets directly from /frontend directory
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

// Root route - serve frontend index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'TaskFlow REST API',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Only listen when executed directly via `node server.js`
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log('=========================================================');
    console.log(`  TaskFlow Server running on http://localhost:${PORT}`);
    console.log(`  Frontend UI: http://localhost:${PORT}`);
    console.log(`  API Health: http://localhost:${PORT}/api/health`);
    console.log('=========================================================');
  });
}

module.exports = app;
