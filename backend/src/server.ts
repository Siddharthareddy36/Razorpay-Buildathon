import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import agentRoutes from './routes/agent.routes.js';
import customerRoutes from './routes/customer.routes.js';
import businessRoutes from './routes/business.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/actions', agentRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/customers', customerRoutes);

// Base API route
app.get('/api', (req, res) => {
  res.json({
    name: 'AI Revenue Recovery & Receivables Intelligence API',
    version: '1.0.0',
    status: 'running',
    phase: 'Phase 1 - Business Data Foundation',
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err?.message || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Receivables Intelligence Backend API listening on port ${PORT}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n==================================================`);
    console.log(`ℹ️ PORT ${PORT} IS ALREADY IN USE`);
    console.log(`The backend server is already running or another process is using port ${PORT}.`);
    console.log(`Active server endpoint: http://localhost:${PORT}/api/health/database`);
    console.log(`==================================================\n`);
    process.exit(0);
  } else {
    console.error('Server Listen Error:', err?.message || err);
    process.exit(1);
  }
});
