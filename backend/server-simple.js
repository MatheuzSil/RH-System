import express from 'express';
import { config } from 'dotenv';

config();

const app = express();

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// API Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MARH Backend API',
    version: '1.0.0',
    status: 'running',
    mode: process.env.USE_SQL === 'true' ? 'SQL Server' : 'JSON',
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'API is working!',
    env: {
      USE_SQL: process.env.USE_SQL,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, (error) => {
  if (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
  console.log(`🚀 MARH Backend API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Access: http://localhost:${PORT}`);
  console.log(`🗃️  Mode: ${process.env.USE_SQL === 'true' ? 'SQL Server' : 'JSON'}`);
});
