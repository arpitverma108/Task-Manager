require('dotenv').config();
const app = require('./src/app');
const { initializeDb } = require('./src/config/db');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

function validateRequiredEnv() {
  const missing = [];

  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn if using weak JWT secret in production
  if (NODE_ENV === 'production') {
    const weakSecrets = ['dev_jwt_secret_team_task_manager_2024', 'your_super_secret_jwt_key_here'];
    if (weakSecrets.includes(process.env.JWT_SECRET)) {
      console.warn('⚠️  WARNING: Using weak JWT_SECRET in production! Change it immediately.');
    }
  }
}

// Validate environment before starting
validateRequiredEnv();

// Initialize database and start server
initializeDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Team Task Manager API`);
      console.log(`   URL: http://localhost:${PORT}`);
      console.log(`   Environment: ${NODE_ENV}`);
      console.log(`   Database: ${process.env.DB_PATH || './data/taskmanager.db'}\n`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  });