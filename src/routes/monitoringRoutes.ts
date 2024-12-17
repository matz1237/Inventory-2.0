import express from 'express';
import { register } from 'prom-client';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

// Prometheus metrics endpoint
router.get('/metrics',authenticateJWT, authorizeRoles('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;